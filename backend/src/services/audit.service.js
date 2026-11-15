const auditLogModel = require('../models/auditLog.model');

/**
 * True Non-Blocking Audit Logging Service
 * Captures request metadata synchronously, then defers database write to Node.js event loop
 * via setImmediate so customer API requests never suffer disk latency.
 */
function logAudit({ user, action, account, details = {}, req, status = 'SUCCESS' }) {
    // 1. Synchronously extract request forensics before req lifecycle closes
    const ipAddress = req?.headers?.['x-forwarded-for']?.split(',')[0] ||
        req?.socket?.remoteAddress ||
        req?.ip ||
        'UNKNOWN';

    const userAgent = req?.headers?.['user-agent'] || 'UNKNOWN';
    const targetUser = user || req?.user?._id;

    // 2. True Fire-and-Forget: Execute DB write on next event loop tick
    setImmediate(async () => {
        try {
            await auditLogModel.create({
                user: targetUser,
                action,
                account,
                details,
                ipAddress,
                userAgent,
                status
            });
        } catch (err) {
            console.error("Non-blocking audit log background write error:", err.message);
        }
    });
}

module.exports = { logAudit };