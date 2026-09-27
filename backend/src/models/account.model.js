const mongoose = require('mongoose');
const ledgerModel = require('./ledger.model');
const crypto = require("crypto");
const { $where } = require('./user.model');
const accountSchema =new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"user",
        required: [true,"Account must be associated with a user"],
        index: true
    },
    status:{
        type: String,
        enum: {
            values: ["ACTIVE","FROZEN","CLOSED"],
            message:"status can be either active, frozen or closed"

        },
        default: "ACTIVE"
    },
    currency:{
        type: String,
        required:[true,"currency is required for creating account"],
        default: "INR"
    },
    
},{timestamps:true})


accountSchema.index({
     user:1,
     status:1
})

accountSchema.methods.getBalance = async function () {
  const balanceData = await ledgerModel.aggregate([
    {
      $match: { account: this._id }
    },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $cond: [
              { $eq: ["$type", "DEBIT"] },
              "$amount",
              0
            ]
          }
        },
        totalCredit: {
          $sum: {
            $cond: [
              { $eq: ["$type", "CREDIT"] },
              "$amount",
              0
            ]
          }
        }
      }
    }
  ])

  const totalDebit = balanceData[0]?.totalDebit || 0
  const totalCredit = balanceData[0]?.totalCredit || 0

  return totalCredit - totalDebit
}

const accountModel = mongoose.model("account",accountSchema)

module.exports = accountModel;