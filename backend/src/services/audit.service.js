const auditLogModel = require('../models/auditLog.model');

function logAudit({ user, action, account, details = {}, req, status = 'SUCCESS' }) {
    
    const ipAddress = req?.headers?.['x-forwarded-for']?.split(',')[0] ||
        req?.socket?.remoteAddress ||
        req?.ip ||
        'UNKNOWN';

    const userAgent = req?.headers?.['user-agent'] || 'UNKNOWN';
    const targetUser = user || req?.user?._id;

    
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
