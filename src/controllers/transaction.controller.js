const transactionModel =require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const emailService = require("../services/email.service")
const { default: mongoose } = require("mongoose")

async function createTransaction(req,res) {
    const {fromAccount, toAccount, amount, idempotencyKey} = req.body
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
        systemUser:true,
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

module.exports = {createTransaction,createInitialFundsTransaction}