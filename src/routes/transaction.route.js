const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const transactionController = require("../controllers/transaction.controller")
const transactionRouter = express.Router();


transactionRouter.post("/system/initial-funds", authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundsTransaction)

module.exports = transactionRouter;