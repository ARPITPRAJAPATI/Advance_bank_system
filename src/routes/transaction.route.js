const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const transactionController = require("../controllers/transaction.controller");

const transactionRouter = express.Router();

transactionRouter.post("/",authMiddleware.authMiddleware,transactionController.createTransaction)
transactionRouter.get("/my-transactions",authMiddleware.authMiddleware,transactionController.getUserTransactions)
transactionRouter.post(
  "/system/initial-funds",
  authMiddleware.authSystemUserMiddleware,
  transactionController.createInitialFundsTransaction
);

module.exports = transactionRouter;