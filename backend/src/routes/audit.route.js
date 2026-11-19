const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const auditController = require('../controllers/audit.controller');

const router = express.Router();

router.get(
    '/',
    authMiddleware.authSystemUserMiddleware,
    auditController.getAuditLogsController
);

module.exports = router;
