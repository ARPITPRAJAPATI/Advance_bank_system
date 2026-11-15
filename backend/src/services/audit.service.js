const auditLogModel = require('../models/auditLog.model');

async function logAudit({ user, action, account, details = {}, req, status = 'SUCCESS' }) {
    try {
        // IP Address extract karo (Nginx proxy ho toh x-forwarded-for se)
        const ipAddress = req?.headers['x-forwarded-for']?.split(',')[0] ||
            req?.socket?.remoteAddress ||
            req?.ip ||
            'UNKNOWN';

        const userAgent = req?.headers['user-agent'] || 'UNKNOWN';

        await auditLogModel.create({
            user: user || req?.user?._id,
            action,
            account,
            details,
            ipAddress,
            userAgent,
            status
        });
    } catch (err) {
        // Audit log fail hone se kabhi customer ka transfer nahi rukna chahiye (Non-blocking)
        console.error("Non-blocking audit log error:", err.message);
    }
}

module.exports = { logAudit };