const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            index: true
        },
        action: {
            type: String,
            required: true,
            enum: [
                'TRANSFER_SUCCESS',
                'TRANSFER_FAILED',
                'WITHDRAWAL_SUCCESS',
                'ACCOUNT_FROZEN',
                'ACCOUNT_UNFROZEN',
                'ACCOUNT_CLOSED',
                'LOGIN_ATTEMPT',
                'SUSPICIOUS_ACTIVITY'
            ],
            index: true
        },
        account: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'account',
            index: true
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        ipAddress: {
            type: String,
            default: 'UNKNOWN'
        },
        userAgent: {
            type: String,
            default: 'UNKNOWN'
        },
        status: {
            type: String,
            enum: ['SUCCESS', 'FAILED', 'WARNING'],
            default: 'SUCCESS'
        }
    },
    {
        timestamps: true
    }
);


auditLogSchema.index({ user: 1, createdAt: -1 });

const auditLogModel = mongoose.model('auditLog', auditLogSchema);
module.exports = auditLogModel;