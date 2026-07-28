const mongoose =require('mongoose');

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

ledgerSchema.pre('updateOne', preventLedgerModification);
ledgerSchema.pre('deleteOne', preventLedgerModification);
ledgerSchema.pre('findOneAndUpdate', preventLedgerModification);
ledgerSchema.pre('findOneAndDelete', preventLedgerModification);
ledgerSchema.pre('remove', preventLedgerModification);
ledgerSchema.pre('deleteMany', preventLedgerModification);
ledgerSchema.pre('updateMany', preventLedgerModification);

const ledgerModel = mongoose.model("ledger",ledgerSchema)

module.exports = ledgerModel;
    