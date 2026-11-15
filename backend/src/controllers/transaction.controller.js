const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    // 1. Basic Presence Validation
    if (!fromAccount || !toAccount || amount === undefined || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required"
        });
    }

    // 2. Strict Positive Number Validation (Negative/Zero Amount Defense)
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
            message: "Amount must be a valid positive number greater than 0"
        });
    }

    // 3. Self-Transfer Block (Sender cannot be Receiver)
    if (fromAccount.toString() === toAccount.toString()) {
        return res.status(400).json({
            message: "Sender and receiver accounts cannot be the same"
        });
    }

    // 4. Critical Ownership Check: fromAccount MUST belong to the authenticated user!
    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
        user: req.user._id
    });

    if (!fromUserAccount) {
        return res.status(404).json({
            message: "Sender account not found or does not belong to you"
        });
    }

    // 5. Receiver Account Check
    const toUserAccount = await accountModel.findOne({ _id: toAccount });
    if (!toUserAccount) {
        return res.status(404).json({
            message: "Receiver account not found"
        });
    }

    // 6. Idempotency Check (Existing Transaction Short-Circuit)
    const isTransactonAlreadyExists = await transactionModel.findOne({ idempotencyKey });
    if (isTransactonAlreadyExists) {
        if (isTransactonAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactonAlreadyExists
            });
        }
        if (isTransactonAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing"
            });
        }
        if (isTransactonAlreadyExists.status === "FAILED") {
            return res.status(200).json({
                message: "Transaction processing failed, please retry"
            });
        }
    }

    // 7. Active Status Check
    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        });
    }

    // 8. Daily Transfer Limit Enforcement (e.g. Max ₹50,000 / day)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaysDebits = await transactionModel.aggregate([
        {
            $match: {
                fromAccount: fromUserAccount._id,
                status: "COMPLETED",
                createdAt: { $gte: startOfToday }
            }
        },
        {
            $group: {
                _id: null,
                totalToday: { $sum: "$amount" }
            }
        }
    ]);
    const spentToday = todaysDebits[0]?.totalToday || 0;
    const DAILY_LIMIT = 50000;

    if (spentToday + numericAmount > DAILY_LIMIT) {
        return res.status(400).json({
            message: `Daily transfer limit exceeded. Max daily limit: ₹${DAILY_LIMIT}. Already spent today: ₹${spentToday}. Attempted: ₹${numericAmount}`
        });
    }

    // 9. Dynamic Balance Check
    const balance = await fromUserAccount.getBalance();
    if (balance < numericAmount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Required amount is ${numericAmount}`
        });
    }

    // 10. Multi-Document ACID Session
    const session = await mongoose.startSession();
    session.startTransaction();

    let transaction;

    try {
        const [txn] = await transactionModel.create([{
            fromAccount,
            toAccount,
            amount: numericAmount,
            idempotencyKey,
            status: "PENDING"
        }], { session });

        transaction = txn;

        // Double-entry: Credit Recipient
        await ledgerModel.create([{
            account: toAccount,
            amount: numericAmount,
            transaction: transaction._id,
            type: "CREDIT"
        }], { session });

        // Double-entry: Debit Sender
        await ledgerModel.create([{
            account: fromAccount,
            amount: numericAmount,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session });

        transaction.status = "COMPLETED";
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        // 👈 Concurrency Shield: Handle MongoDB E11000 Duplicate Key race condition!
        if (err.code === 11000) {
            const existingTxn = await transactionModel.findOne({ idempotencyKey });
            return res.status(200).json({
                message: "Transaction already processed (concurrent request handled)",
                transaction: existingTxn
            });
        }

        return res.status(500).json({
            message: "Transaction failed to process",
            error: err.message
        });
    }

    // 11. Decoupled Non-blocking Notification
    try {
        await emailService.sendTransactionEmail(
            req.user.email,
            req.user.name,
            numericAmount,
            toAccount
        );
    } catch (emailErr) {
        console.error("Email notification error (non-blocking):", emailErr.message);
    }

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction
    });
}



async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body;

    // Basic Presence Validation
    if (!toAccount || amount === undefined || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        });
    }

    // Strict Positive Number Check
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
            message: "Amount must be a valid positive number greater than 0"
        });
    }

    const existing = await transactionModel.findOne({ idempotencyKey });
    if (existing) {
        return res.status(200).json({
            message: "Transaction already processed",
            transaction: existing
        });
    }

    const toUserAccount = await accountModel.findOne({ _id: toAccount });
    if (!toUserAccount) {
        return res.status(404).json({ message: "toAccount not found" });
    }

    if (toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({ message: "Target account is not ACTIVE" });
    }

    const fromUserAccount = await accountModel.findOne({ user: req.user._id });
    if (!fromUserAccount) {
        return res.status(400).json({ message: "System liquidity account not found" });
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const [txn] = await transactionModel.create([{
            fromAccount: fromUserAccount._id,
            toAccount,
            amount: numericAmount,
            idempotencyKey,
            status: "PENDING"
        }], { session });

        await ledgerModel.create([{
            account: fromUserAccount._id,
            amount: numericAmount,
            transaction: txn._id,
            type: "DEBIT"
        }], { session });

        await ledgerModel.create([{
            account: toAccount,
            amount: numericAmount,
            transaction: txn._id,
            type: "CREDIT"
        }], { session });

        txn.status = "COMPLETED";
        await txn.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            message: "Initial funds transaction completed successfully",
            transaction: txn
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        if (err.code === 11000) {
            const existingTxn = await transactionModel.findOne({ idempotencyKey });
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: existingTxn
            });
        }

        return res.status(500).json({
            message: "Transaction failed",
            error: err.message
        });
    }
}

async function createWithdrawalTransaction(req, res) {
    const { fromAccount, amount, idempotencyKey } = req.body;

    // 1. Presence & Positive Amount Validation
    if (!fromAccount || amount === undefined || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, amount and idempotencyKey are required"
        });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
            message: "Amount must be a valid positive number greater than 0"
        });
    }

    // 2. Ownership Check: Account MUST belong to the user
    const userAccount = await accountModel.findOne({
        _id: fromAccount,
        user: req.user._id
    });

    if (!userAccount) {
        return res.status(404).json({
            message: "Account not found or does not belong to you"
        });
    }

    if (userAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Account must be ACTIVE to withdraw funds"
        });
    }

    // 3. Idempotency Check
    const existing = await transactionModel.findOne({ idempotencyKey });
    if (existing) {
        return res.status(200).json({
            message: "Withdrawal already processed",
            transaction: existing
        });
    }

    // 4. Find System Liquidity Account (Receiver of the cash-out debit)
    const systemAccount = await accountModel.findOne().populate({
        path: 'user',
        match: { systemUser: true }
    });

    if (!systemAccount) {
        return res.status(500).json({
            message: "System cash settlement account not found"
        });
    }

    // 5. Balance Check
    const balance = await userAccount.getBalance();
    if (balance < numericAmount) {
        return res.status(400).json({
            message: `Insufficient balance for withdrawal. Current balance: ${balance}, Requested: ${numericAmount}`
        });
    }

    // 6. Atomic Double-Entry Session
    const session = await mongoose.startSession();
    session.startTransaction();

    let transaction;
    try {
        const [txn] = await transactionModel.create([{
            fromAccount: userAccount._id,
            toAccount: systemAccount._id,
            amount: numericAmount,
            idempotencyKey,
            status: "PENDING"
        }], { session });

        transaction = txn;

        // Debit User Account
        await ledgerModel.create([{
            account: userAccount._id,
            amount: numericAmount,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session });

        // Credit System Cash Settlement Account
        await ledgerModel.create([{
            account: systemAccount._id,
            amount: numericAmount,
            transaction: transaction._id,
            type: "CREDIT"
        }], { session });

        transaction.status = "COMPLETED";
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        if (err.code === 11000) {
            const existingTxn = await transactionModel.findOne({ idempotencyKey });
            return res.status(200).json({
                message: "Withdrawal already processed",
                transaction: existingTxn
            });
        }

        return res.status(500).json({
            message: "Withdrawal failed to process",
            error: err.message
        });
    }

    // 7. Non-blocking Email Alert
    try {
        await emailService.sendTransactionEmail(
            req.user.email,
            req.user.name,
            numericAmount,
            "CASH_WITHDRAWAL"
        );
    } catch (emailErr) {
        console.error("Email notification error (non-blocking):", emailErr.message);
    }

    return res.status(201).json({
        message: "Withdrawal completed successfully",
        transaction
    });
}