const crypto = require("crypto");
const accountModel = require("../models/account.model");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");

const toolsSchema = [
    {
        type: "function",
        function: {
            name: "get_balance",
            description: "Get the current verified double-entry balance of a specific user bank account.",
            parameters: {
                type: "object",
                properties: {
                    accountId: {
                        type: "string",
                        description: "The 24-character hexadecimal MongoDB ObjectId of the account"
                    }
                },
                required: ["accountId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_monthly_analytics",
            description: "Get monthly income, expenses, net savings and financial health summary for an account.",
            parameters: {
                type: "object",
                properties: {
                    accountId: {
                        type: "string",
                        description: "The 24-character ObjectId of the account"
                    },
                    month: {
                        type: "number",
                        description: "1-12 representing month (1 for January, 12 for December). Defaults to current month."
                    },
                    year: {
                        type: "number",
                        description: "Year (e.g. 2026). Defaults to current year."
                    }
                },
                required: ["accountId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_recent_transactions",
            description: "Search and fetch user's recent transactions with optional filters for type and limit.",
            parameters: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        enum: ["DEBIT", "CREDIT"],
                        description: "Filter by DEBIT (money sent) or CREDIT (money received)"
                    },
                    limit: {
                        type: "number",
                        description: "Number of transactions to return (max 20, default 5)"
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "prepare_transfer",
            description: "Validates a fund transfer and generates a secure Human-in-the-Loop confirmation token. DOES NOT move money directly.",
            parameters: {
                type: "object",
                properties: {
                    fromAccount: {
                        type: "string",
                        description: "Sender's account ObjectId"
                    },
                    toAccount: {
                        type: "string",
                        description: "Recipient's account ObjectId"
                    },
                    amount: {
                        type: "number",
                        description: "Positive amount to transfer (must be > 0)"
                    }
                },
                required: ["fromAccount", "toAccount", "amount"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "emergency_freeze_account",
            description: "Immediately freezes a bank account for fraud prevention. Reversible only by customer request.",
            parameters: {
                type: "object",
                properties: {
                    accountId: {
                        type: "string",
                        description: "The ObjectId of the account to freeze"
                    },
                    reason: {
                        type: "string",
                        description: "Reason for freezing the account (e.g., suspicious activity)"
                    }
                },
                required: ["accountId"]
            }
        }
    }
];

async function executeToolCall(name, args, user) {
    switch (name) {
        case "get_balance": {
            const account = await accountModel.findOne({ _id: args.accountId, user: user._id });
            if (!account) return { error: "Account not found or does not belong to you." };
            const balance = await account.getBalance();
            return {
                accountId: account._id,
                currency: account.currency,
                status: account.status,
                currentBalance: balance
            };
        }

        case "get_monthly_analytics": {
            const account = await accountModel.findOne({ _id: args.accountId, user: user._id });
            if (!account) return { error: "Account not found or does not belong to you." };

            const currentYear = args.year || new Date().getFullYear();
            const currentMonth = args.month ? args.month - 1 : new Date().getMonth();
            const startDate = new Date(currentYear, currentMonth, 1);
            const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

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
                        totalCredit: { $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0] } },
                        totalDebit: { $sum: { $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0] } },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const credit = analytics[0]?.totalCredit || 0;
            const debit = analytics[0]?.totalDebit || 0;
            return {
                period: `${currentMonth + 1}/${currentYear}`,
                totalIncome: credit,
                totalExpenses: debit,
                netSavings: credit - debit,
                totalTransactions: analytics[0]?.count || 0,
                health: credit >= debit ? "SURPLUS (Savings positive)" : "DEFICIT (Expenses exceed income)"
            };
        }

        case "get_recent_transactions": {
            const accounts = await accountModel.find({ user: user._id });
            const accountIds = accounts.map(a => a._id);
            if (accountIds.length === 0) return { transactions: [] };

            let filter = {};
            if (args.type === "DEBIT") filter.fromAccount = { $in: accountIds };
            else if (args.type === "CREDIT") filter.toAccount = { $in: accountIds };
            else filter.$or = [{ fromAccount: { $in: accountIds } }, { toAccount: { $in: accountIds } }];

            const limitNum = Math.min(20, Math.max(1, args.limit || 5));
            const transactions = await transactionModel.find(filter)
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .populate("fromAccount", "currency")
                .populate("toAccount", "currency");

            return {
                count: transactions.length,
                transactions: transactions.map(t => ({
                    id: t._id,
                    amount: t.amount,
                    status: t.status,
                    createdAt: t.createdAt,
                    type: accountIds.some(id => id.equals(t.fromAccount?._id)) ? "DEBIT" : "CREDIT"
                }))
            };
        }

        case "prepare_transfer": {
            const numericAmount = Number(args.amount);
            if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
                return { error: "Transfer amount must be a positive number greater than 0." };
            }

            const fromAccount = await accountModel.findOne({ _id: args.fromAccount, user: user._id });
            if (!fromAccount) return { error: "Sender account not found or does not belong to you." };
            if (fromAccount.status !== "ACTIVE") return { error: `Account is ${fromAccount.status}. Cannot transfer funds.` };

            const toAccount = await accountModel.findById(args.toAccount).populate("user", "name email");
            if (!toAccount) return { error: "Recipient account not found in KubePay." };

            const balance = await fromAccount.getBalance();
            if (balance < numericAmount) {
                return { error: `Insufficient balance. Available: ₹${balance}, Required: ₹${numericAmount}` };
            }

            
            const payload = {
                fromAccount: fromAccount._id.toString(),
                toAccount: toAccount._id.toString(),
                amount: numericAmount,
                expiresAt: Date.now() + 5 * 60 * 1000 
            };

            const payloadStr = JSON.stringify(payload);
            const signature = crypto
                .createHmac("sha256", process.env.JWT_SECRET)
                .update(payloadStr)
                .digest("hex");

            const confirmationToken = Buffer.from(JSON.stringify({ payload, signature })).toString("base64");

            return {
                actionRequired: "HUMAN_CONFIRMATION_REQUIRED",
                message: `Please confirm transfer of ₹${numericAmount} to ${toAccount.user?.name || "Recipient"}.`,
                details: {
                    fromAccount: fromAccount._id,
                    toAccount: toAccount._id,
                    recipientName: toAccount.user?.name,
                    amount: numericAmount,
                    fee: 0,
                    availableBalanceAfter: balance - numericAmount
                },
                confirmationToken
            };
        }

        case "emergency_freeze_account": {
            const account = await accountModel.findOne({ _id: args.accountId, user: user._id });
            if (!account) return { error: "Account not found or does not belong to you." };
            if (account.status === "FROZEN") return { message: "Account is already FROZEN." };
            if (account.status === "CLOSED") return { error: "Closed accounts cannot be modified." };

            account.status = "FROZEN";
            await account.save();

            return {
                success: true,
                message: `Account ${account._id} has been FROZEN successfully. Reason: ${args.reason || "Customer Emergency Request"}.`,
                status: "FROZEN"
            };
        }

        default:
            return { error: `Unknown tool: ${name}` };
    }
}

module.exports = {
    toolsSchema,
    executeToolCall
};
