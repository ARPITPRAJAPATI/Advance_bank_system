const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

async function createTransaction(req, res) {
    const {fromAccount, toAccount, amount, idempotencyKey} = req.body
                     
    if(!fromAccount || !toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    const fromUserAccount = await accountModel.findOne({ _id: fromAccount })
    const toUserAccount = await accountModel.findOne({ _id: toAccount })
    
    if(!fromUserAccount || !toUserAccount){
        return res.status(400).json({
            message: "invalid fromAccount or toAccount"
        })
    }

    const isTransactonAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if(isTransactonAlreadyExists){
        if(isTransactonAlreadyExists.status === "COMPLETED"){
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactonAlreadyExists
            })
        }
        if(isTransactonAlreadyExists.status === "PENDING"){
            return res.status(200).json({
                message: "Transaction is still processing",
            })
        }
        if(isTransactonAlreadyExists.status === "FAILED"){
           return res.status(200).json({
                message: "Transaction processing failed, please retry",
            })
        }
        if(isTransactonAlreadyExists.status === "REVERSED"){
           return res.status(200).json({
                message: "Transaction processing reversed",
            })
        }
    }

    
    if(fromUserAccount.status !=="ACTIVE" || toUserAccount.status!=="ACTIVE"){
        return res.status(400).json({
           message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }

    const balance = await fromUserAccount.getBalance()

    if(balance < amount){
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Required amount is ${amount}`
        })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    let transaction; 

    try {
        const [txn] = await transactionModel.create([{
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        }], {session})

        transaction = txn 

        await ledgerModel.create([{
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        }], {session})

        await ledgerModel.create([{
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        }], {session})

        transaction.status = "COMPLETED"
        await transaction.save({session})

        await session.commitTransaction()
        session.endSession()

    } catch(err) {
        await session.abortTransaction()
        session.endSession()
        return res.status(500).json({
            message: "Transaction failed to process",
            error: err.message
        });
    }
    
    try {
        await emailService.sendTransactionEmail(
            req.user.email,
            req.user.name,
            amount,
            toAccount
        );
    } catch (emailErr) {
        console.error("Email notification error (non-blocking):", emailErr.message);
    }

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction
    })
} 




async function createInitialFundsTransaction(req,res) {
    const {toAccount, amount, idempotencyKey} = req.body

    if(!toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }
    const existing = await transactionModel.findOne({ idempotencyKey });
    if (existing) {
        return res.status(200).json({
            message: "Transaction already processed",
            transaction: existing
        });
    }
    const toUserAccount = await  accountModel.findOne({
        _id: toAccount, 
    })
    if(!toUserAccount){
        return res.status(404).json({
            message: "toAccount not found"
        })
    }
    const fromUserAccount = await accountModel.findOne({
        
        user: req.user._id
    }) 

    if(!fromUserAccount){
        return res.status(400).json({
            message: "system user does not found"
        })
    }
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const transaction = await transactionModel.create([{
            fromAccount: fromUserAccount._id,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        }], { session });

        const txn = transaction[0];

        await ledgerModel.create([{
            account: fromUserAccount._id,
            amount,
            transaction: txn._id,
            type: "DEBIT"
        }], { session });

        await ledgerModel.create([{
            account: toAccount,
            amount,
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

        return res.status(500).json({
            message: "Transaction failed",
            error: err.message
        });
    }

} 

async function getUserTransactions(req, res) {
    try {
        const accounts = await accountModel.find({ user: req.user._id });
        const accountIds = accounts.map(acc => acc._id);

        const transactions = await transactionModel.find({
            $or: [
                { fromAccount: { $in: accountIds } },
                { toAccount: { $in: accountIds } }
            ]
        })
        .sort({ createdAt: -1 })
        .populate('fromAccount')
        .populate('toAccount');

        return res.status(200).json({
            transactions
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch transactions",
            error: err.message
        });
    }
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction,
    getUserTransactions
}