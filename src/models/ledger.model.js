const mongoose =require('mongoose');
const { type } = require('node:os');
const transactionModel = require('./transaction.model');
const { REFUSED } = require('node:dns');

const ledgerSchema = new mongoose.Schema({
    account:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true,"Leger must have an account"],
        index:true,
        immutable:true
    },
    amount:{
        type:Number,
        required: [true,"Leger must have an account"],
        immutable:true
    },
    transaction:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        required:[true,"Leger must have an transaction"],
        index:true,
        immutable:true
    },
    type:{
        type:String,
        enum:{
            values:["CREDIT","DEBIT"],
            message:"type can be either credit or debit"
        },
        required:[true,"Leger must have a type"],
        immutable:true
    }
    
},{timestamps:true})

function preventLedgerModification() {
    throw new Error("Ledger entries cannot be modified or deleted.");
}

legerSchema.pre('updateOne', preventLedgerModification);
legerSchema.pre('deleteOne', preventLedgerModification);
legerSchema.pre('findOneAndUpdate', preventLedgerModification);
legerSchema.pre('findOneAndDelete', preventLedgerModification);
legerSchema.pre('remove', preventLedgerModification);
legerSchema.pre('deleteMany', preventLedgerModification);
legerSchema.pre('updateMany', preventLedgerModification);

const ledgerModel = mongoose.model("ledger",ledgerSchema)

module.exports = ledgerModel;
    