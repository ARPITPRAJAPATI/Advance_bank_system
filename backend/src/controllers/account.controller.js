const accountModel = require("../models/account.model")
const auditService = require("../services/audit.service");

async function createAccountController(req, res) {
    const user = req.user
    const account = await accountModel.create({
        user: user._id,

    })
    res.status(201).json({
        message: "Account created",
        account
    })
}
async function getUserAccountsController(req, res) {

    const accounts = await accountModel.find({ user: req.user._id });

    res.status(200).json({
        accounts
    })
}
async function getAccountBalanceController(req, res) {
    const { accountId } = req.params;
    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    })
    if (!account) {
        return res.status(404).json({
            message: "Account not found"
        })
    }
    const balance = await account.getBalance();
    res.status(200).json({
        accountId: account._id,
        balance: balance
    })
}
async function updateAccountStatusController(req, res) {
    const { accountId } = req.params;
    const { status } = req.body;


    const allowedStatuses = ["ACTIVE", "FROZEN", "CLOSED"];
    if (!status || !allowedStatuses.includes(status.toUpperCase())) {
        return res.status(400).json({
            message: `Invalid status. Status must be one of: ${allowedStatuses.join(", ")}`
        });
    }

    // 2. Ownership Check: Account must belong to the logged-in user (or System Admin)
    const query = { _id: accountId };
    if (!req.user.systemUser) {
        query.user = req.user._id; // Regular users can only freeze/unfreeze their own accounts
    }

    const account = await accountModel.findOne(query);

    if (!account) {
        return res.status(404).json({
            message: "Account not found or you do not have permission to modify it"
        });
    }

    // 3. Prevent reopening CLOSED accounts (Banking rule: Closed accounts cannot be revived)
    if (account.status === "CLOSED") {
        return res.status(400).json({
            message: "Closed accounts cannot be modified or reactivated"
        });
    }

    // 4. Update and Save
    const previousStatus = account.status;
    const newStatus = status.toUpperCase();
    account.status = newStatus;
    await account.save();

    // 5. Audit Log Trigger (Non-blocking tracking for security & AI)
    const actionMap = {
        FROZEN: 'ACCOUNT_FROZEN',
        CLOSED: 'ACCOUNT_CLOSED',
        ACTIVE: 'ACCOUNT_UNFROZEN'
    };

    await auditService.logAudit({
        user: req.user._id,
        action: actionMap[newStatus] || 'ACCOUNT_UNFROZEN',
        account: account._id,
        details: { previousStatus, newStatus },
        req
    });

    return res.status(200).json({
        message: `Account status successfully updated to ${account.status}`,
        account: {
            _id: account._id,
            status: account.status,
            currency: account.currency
        }
    });
}


module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController,
    updateAccountStatusController
}