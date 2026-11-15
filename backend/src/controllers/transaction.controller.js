const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const auditService = require("../services/audit.service")
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

    // 6. Idempotency Check with Parameter Match Verification (Stripe Standard)
    const isTransactonAlreadyExists = await transactionModel.findOne({ idempotencyKey });

    if (isTransactonAlreadyExists) {
        // Security Check: Kya parameters match ho rahe hain?
        const isMatching =
            isTransactonAlreadyExists.fromAccount.toString() === fromAccount.toString() &&
            isTransactonAlreadyExists.toAccount.toString() === toAccount.toString() &&
            isTransactonAlreadyExists.amount === numericAmount;

        if (!isMatching) {
            return res.status(409).json({
                message: "Idempotency Conflict: An existing transaction with this idempotencyKey was found, but the transaction parameters (amount, sender, or receiver) do not match."
            });
        }

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

    // 8. Multi-Document ACID Session (Started early for concurrency isolation)
    const session = await mongoose.startSession();
    session.startTransaction();

    let transaction;

    try {
        // A. Mutex Lock on Sender Account (Prevents concurrent race conditions)
        await accountModel.findOneAndUpdate(
            { _id: fromAccount },
            { $set: { lastTransactionAt: new Date() } },
            { session }
        );

        // B. Daily Transfer Limit Enforcement (Scoped inside session)
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
        ]).session(session);

        const spentToday = todaysDebits[0]?.totalToday || 0;
        const DAILY_LIMIT = 50000;

        if (spentToday + numericAmount > DAILY_LIMIT) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                message: `Daily transfer limit exceeded. Max daily limit: ₹${DAILY_LIMIT}. Already spent today: ₹${spentToday}. Attempted: ₹${numericAmount}`
            });
        }

        // C. Dynamic Balance Check
        const balance = await fromUserAccount.getBalance();
        if (balance < numericAmount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}. Required amount is ${numericAmount}`
            });
        }

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

        // Audit Log: Transfer Success
        await auditService.logAudit({
            user: req.user._id,
            action: 'TRANSFER_SUCCESS',
            account: fromAccount,
            details: {
                amount: numericAmount,
                toAccount,
                transactionId: transaction._id,
                idempotencyKey
            },
            req
        });

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

        // Audit Log: Transfer Failed
        await auditService.logAudit({
            user: req.user._id,
            action: 'TRANSFER_FAILED',
            account: fromAccount,
            details: {
                amount: numericAmount,
                toAccount,
                error: err.message
            },
            status: 'FAILED',
            req
        });

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


    const existing = await transactionModel.findOne({ idempotencyKey });
    if (existing) {
        // Security Check: Verify withdrawal parameters match the existing transaction
        const isMatching =
            existing.fromAccount.toString() === userAccount._id.toString() &&
            existing.amount === numericAmount;

        if (!isMatching) {
            return res.status(409).json({
                message: "Idempotency Conflict: An existing transaction with this idempotencyKey was found, but withdrawal parameters (amount or account) do not match."
            });
        }

        return res.status(200).json({
            message: "Withdrawal already processed",
            transaction: existing
        });
    }

    const systemAccount = await accountModel.findOne().populate({
        path: 'user',
        match: { systemUser: true }
    });

    if (!systemAccount) {
        return res.status(500).json({
            message: "System cash settlement account not found"
        });
    }

    // Multi-Document ACID Session (Started early for concurrency isolation)
    const session = await mongoose.startSession();
    session.startTransaction();

    let transaction;
    try {
        // A. Mutex Lock on User Account (Prevents concurrent double-withdrawal race condition)
        await accountModel.findOneAndUpdate(
            { _id: userAccount._id },
            { $set: { lastTransactionAt: new Date() } },
            { session }
        );

        // B. Dynamic Balance Check (Scoped inside session)
        const balance = await userAccount.getBalance();
        if (balance < numericAmount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                message: `Insufficient balance for withdrawal. Current balance: ${balance}, Requested: ${numericAmount}`
            });
        }

        const [txn] = await transactionModel.create([{
            fromAccount: userAccount._id,
            toAccount: systemAccount._id,
            amount: numericAmount,
            idempotencyKey,
            status: "PENDING"
        }], { session });

        transaction = txn;


        await ledgerModel.create([{
            account: userAccount._id,
            amount: numericAmount,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session });


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

        // Audit Log: Withdrawal Success
        await auditService.logAudit({
            user: req.user._id,
            action: 'WITHDRAWAL_SUCCESS',
            account: userAccount._id,
            details: {
                amount: numericAmount,
                transactionId: transaction._id,
                idempotencyKey
            },
            req
        });

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

        // Audit Log: Withdrawal Failed
        await auditService.logAudit({
            user: req.user._id,
            action: 'TRANSFER_FAILED',
            account: userAccount._id,
            details: {
                type: 'WITHDRAWAL',
                amount: numericAmount,
                error: err.message
            },
            status: 'FAILED',
            req
        });

        return res.status(500).json({
            message: "Withdrawal failed to process",
            error: err.message
        });
    }


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


async function getUserTransactions(req, res) {
    try {
        const {
            page = 1,
            limit = 10,
            type, // "DEBIT", "CREDIT"
            status, // "COMPLETED", "PENDING", "FAILED"
            startDate,
            endDate
        } = req.query;


        const accounts = await accountModel.find({ user: req.user._id });
        const accountIds = accounts.map(acc => acc._id);

        if (accountIds.length === 0) {
            return res.status(200).json({
                transactions: [],
                pagination: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 }
            });
        }


        // 1. Base Filter decide karo based on Type (DEBIT vs CREDIT vs ALL)
        let filter = {};

        const upperType = type ? type.toUpperCase() : null;
        if (upperType === "DEBIT") {
            filter.fromAccount = { $in: accountIds };
        } else if (upperType === "CREDIT") {
            filter.toAccount = { $in: accountIds };
        } else {
            // Agar type nahi diya, toh user chahe sender ho ya receiver, dono transactions aayenge
            filter.$or = [
                { fromAccount: { $in: accountIds } },
                { toAccount: { $in: accountIds } }
            ];
        }

        // 2. Status filter add karo (Bina overwrite kiye)
        if (status) {
            filter.status = status.toUpperCase();
        }

        // 3. Date range filter add karo (Bina overwrite kiye)
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }


        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, parseInt(limit));
        const skip = (pageNum - 1) * limitNum;


        const [total, transactions] = await Promise.all([
            transactionModel.countDocuments(filter),
            transactionModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('fromAccount', 'currency status')
                .populate('toAccount', 'currency status')
        ]);

        return res.status(200).json({
            transactions,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });

    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch transactions",
            error: err.message
        });
    }
}


async function getTransactionById(req, res) {
    try {
        const { id } = req.params;

        const transaction = await transactionModel.findById(id)
            .populate('fromAccount')
            .populate('toAccount');

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        // User accounts fetch karo to verify ownership
        const userAccounts = await accountModel.find({ user: req.user._id });
        const userAccountIds = userAccounts.map(a => a._id.toString());

        const isSender = userAccountIds.includes(transaction.fromAccount._id.toString());
        const isReceiver = userAccountIds.includes(transaction.toAccount._id.toString());

        // Authorization: User must be either sender or receiver (or Admin)
        if (!isSender && !isReceiver && !req.user.systemUser) {
            return res.status(403).json({
                message: "You are not authorized to view this transaction"
            });
        }

        // Fetch associated double-entry ledger entries for full receipt audit!
        const ledgerEntries = await ledgerModel.find({ transaction: transaction._id });

        return res.status(200).json({
            transaction,
            receipt: {
                direction: isSender ? "DEBIT" : "CREDIT",
                ledgerAudit: ledgerEntries
            }
        });

    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch transaction details",
            error: err.message
        });
    }
}
async function getMonthlyAnalytics(req, res) {
    try {
        const { accountId, month, year } = req.query;

        if (!accountId) {
            return res.status(400).json({ message: "accountId query parameter is required" });
        }

        // Verify account ownership
        const account = await accountModel.findOne({ _id: accountId, user: req.user._id });
        if (!account) {
            return res.status(404).json({ message: "Account not found or does not belong to you" });
        }

        // Default to current month and year if not provided
        const currentYear = year ? parseInt(year) : new Date().getFullYear();
        const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // 0-indexed in JS

        const startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
        const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

        // MongoDB Aggregation Pipeline on Ledger for this account and month
        const analytics = await ledgerModel.aggregate([
            {
                $match: {
                    account: account._id,
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalCredit: {
                        $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0] }
                    },
                    totalDebit: {
                        $sum: { $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0] }
                    },
                    transactionCount: { $sum: 1 }
                }
            }
        ]);

        const totalCredit = analytics[0]?.totalCredit || 0;
        const totalDebit = analytics[0]?.totalDebit || 0;
        const netSavings = totalCredit - totalDebit;
        const count = analytics[0]?.transactionCount || 0;

        return res.status(200).json({
            period: {
                month: currentMonth + 1,
                year: currentYear,
                startDate,
                endDate
            },
            summary: {
                totalCredit,
                totalDebit,
                netSavings,
                transactionCount: count,
                financialHealth: netSavings >= 0 ? "SURPLUS" : "DEFICIT"
            }
        });

    } catch (err) {
        return res.status(500).json({
            message: "Failed to generate monthly analytics",
            error: err.message
        });
    }
}

async function reconcileLedger(req, res) {
    try {
        // Run both Macro (Global) and Micro (Per-Transaction) checks in parallel
        const [globalAudit, unbalancedTransactions] = await Promise.all([
            // 1. Layer 1: Macro Audit (Global Bank-wide Credits vs Debits)
            ledgerModel.aggregate([
                {
                    $group: {
                        _id: null,
                        totalSystemCredits: {
                            $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0] }
                        },
                        totalSystemDebits: {
                            $sum: { $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0] }
                        },
                        totalLedgerEntries: { $sum: 1 }
                    }
                }
            ]),

            // 2. Layer 2: Micro Audit (Per-Transaction Double-Entry Balance Verification)
            ledgerModel.aggregate([
                {
                    $group: {
                        _id: "$transaction",
                        totalCredits: {
                            $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0] }
                        },
                        totalDebits: {
                            $sum: { $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0] }
                        },
                        entryCount: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        transactionId: "$_id",
                        totalCredits: 1,
                        totalDebits: 1,
                        entryCount: 1,
                        discrepancy: { $subtract: ["$totalCredits", "$totalDebits"] }
                    }
                },
                {
                    $match: {
                        $or: [
                            { discrepancy: { $ne: 0 } },
                            { entryCount: { $lt: 2 } }
                        ]
                    }
                },
                { $limit: 20 }
            ])
        ]);

        const totalCredits = globalAudit[0]?.totalSystemCredits || 0;
        const totalDebits = globalAudit[0]?.totalSystemDebits || 0;
        const globalDiscrepancy = totalCredits - totalDebits;

        const isGloballyBalanced = globalDiscrepancy === 0;
        const hasNoUnbalancedTxns = unbalancedTransactions.length === 0;
        const isFullyAudited = isGloballyBalanced && hasNoUnbalancedTxns;

        return res.status(200).json({
            timestamp: new Date().toISOString(),
            isBalanced: isFullyAudited,
            status: isFullyAudited ? "AUDIT_PASSED" : "AUDIT_FAILED_INTEGRITY_COMPROMISED",
            macroAudit: {
                totalSystemCredits: totalCredits,
                totalSystemDebits: totalDebits,
                discrepancy: globalDiscrepancy,
                totalLedgerEntries: globalAudit[0]?.totalLedgerEntries || 0
            },
            microAudit: {
                corruptTransactionsFound: unbalancedTransactions.length,
                unbalancedTransactions
            }
        });

    } catch (err) {
        return res.status(500).json({
            message: "Ledger reconciliation audit failed",
            error: err.message
        });
    }
}
module.exports = {
    createTransaction,
    createInitialFundsTransaction,
    createWithdrawalTransaction,
    getUserTransactions,
    getTransactionById,
    getMonthlyAnalytics,
    reconcileLedger
};