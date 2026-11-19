const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const aiController = require("../controllers/ai.controller");

const router = express.Router();

router.post("/chat", authMiddleware.authMiddleware, aiController.aiChatController);
router.post("/approve-transfer", authMiddleware.authMiddleware, aiController.approveTransferController);

module.exports = router;
