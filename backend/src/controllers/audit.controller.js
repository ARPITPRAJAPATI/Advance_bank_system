const auditLogModel = require("../models/auditLog.model");

// Admin & AI Security Agent ke liye: Audit Logs View karna
async function getAuditLogsController(req, res) {
    try {
        const { page = 1, limit = 20, action, status } = req.query;

        // Security: Sirf System User (Admin) hi audit logs dekh sakta hai
        if (!req.user.systemUser) {
            return res.status(403).json({
                message: "Access Denied: Only bank administrators can view audit logs"
            });
        }

        const filter = {};
        if (action) filter.action = action;
        if (status) filter.status = status;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, parseInt(limit));
        const skip = (pageNum - 1) * limitNum;

        const [total, logs] = await Promise.all([
            auditLogModel.countDocuments(filter),
            auditLogModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('user', 'name email')
                .populate('account', 'currency status')
        ]);

        return res.status(200).json({
            logs,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch audit logs",
            error: err.message
        });
    }
}

module.exports = { getAuditLogsController };