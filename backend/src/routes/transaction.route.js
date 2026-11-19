const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const transactionController = require("../controllers/transaction.controller");

const transactionRouter = express.Router();

transactionRouter.post("/", authMiddleware.authMiddleware, transactionController.createTransaction);
transactionRouter.post("/withdraw", authMiddleware.authMiddleware, transactionController.createWithdrawalTransaction);
transactionRouter.get("/my-transactions", authMiddleware.authMiddleware, transactionController.getUserTransactions);

transactionRouter.post(
  "/system/initial-funds",
  authMiddleware.authSystemUserMiddleware,
  transactionController.createInitialFundsTransaction
);
transactionRouter.get(
  "/admin/reconcile",
  authMiddleware.authSystemUserMiddleware,
  transactionController.reconcileLedger
);

transactionRouter.get(
  "/analytics/monthly",
  authMiddleware.authMiddleware,
  transactionController.getMonthlyAnalytics
);

transactionRouter.get(
  "/:id",
  authMiddleware.authMiddleware,
  transactionController.getTransactionById
);

module.exports = transactionRouter;
