const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const auditController = require('../controllers/audit.controller');

const router = express.Router();

// Bank Security Rule: Audit logs sirf Bank Admin / System User hi dekh sakta hai!
// Isliye hum authSystemUserMiddleware use kar rahe hain:
router.get(
    '/',
    authMiddleware.authSystemUserMiddleware,
    auditController.getAuditLogsController
);

module.exports = router;