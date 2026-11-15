const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const transactionController = require("../controllers/transaction.controller");

const transactionRouter = express.Router();

// 1. Transaction Operations
transactionRouter.post("/", authMiddleware.authMiddleware, transactionController.createTransaction);
transactionRouter.post("/withdraw", authMiddleware.authMiddleware, transactionController.createWithdrawalTransaction);
transactionRouter.get("/my-transactions", authMiddleware.authMiddleware, transactionController.getUserTransactions);

// 2. Privileged System Endpoints
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

// 3. Analytics (Must come BEFORE /:id)
transactionRouter.get(
  "/analytics/monthly",
  authMiddleware.authMiddleware,
  transactionController.getMonthlyAnalytics
);

// 4. Parameterized Route (Must come AFTER all specific routes!)
transactionRouter.get(
  "/:id",
  authMiddleware.authMiddleware,
  transactionController.getTransactionById
);

// 5. Final Export at the very end
module.exports = transactionRouter;
