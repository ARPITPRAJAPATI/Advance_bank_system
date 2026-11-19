const crypto = require("crypto");
const { runBankingAgent } = require("../ai/agent");
const transactionController = require("./transaction.controller");

async function aiChatController(req, res) {
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!message || typeof message !== "string" || message.trim().length === 0) {
            return res.status(400).json({ message: "A valid message string is required." });
        }

        
        const result = await runBankingAgent(message.trim(), conversationHistory, req.user);

        return res.status(200).json({
            success: true,
            reply: result.reply,
            action: result.action 
        });

    } catch (err) {
        console.error("AI Chat Controller Error:", err.message);
        return res.status(500).json({
            message: "AI Copilot encountered an unexpected error.",
            error: err.message
        });
    }
}

async function approveTransferController(req, res) {
    try {
        const { confirmationToken } = req.body;

        if (!confirmationToken) {
            return res.status(400).json({ message: "confirmationToken is required to approve transfer." });
        }

        
        let decoded;
        try {
            const jsonStr = Buffer.from(confirmationToken, "base64").toString("utf-8");
            decoded = JSON.parse(jsonStr);
        } catch (e) {
            return res.status(400).json({ message: "Malformed confirmation token." });
        }

        const { payload, signature } = decoded;
        if (!payload || !signature) {
            return res.status(400).json({ message: "Invalid token structure." });
        }

        
        const expectedSignature = crypto
            .createHmac("sha256", process.env.JWT_SECRET)
            .update(JSON.stringify(payload))
            .digest("hex");

        if (signature !== expectedSignature) {
            return res.status(403).json({
                message: "Security Alert: Tampered confirmation token detected. Transfer aborted."
            });
        }

        
        if (Date.now() > payload.expiresAt) {
            return res.status(410).json({
                message: "Confirmation token has expired. Please ask the AI to prepare the transfer again."
            });
        }

        
        
        const idempotencyKey = `ai_tx_${payload.fromAccount}_${payload.toAccount}_${payload.amount}_${payload.expiresAt}`;

        
        req.body = {
            fromAccount: payload.fromAccount,
            toAccount: payload.toAccount,
            amount: payload.amount,
            idempotencyKey
        };

        
        return await transactionController.createTransaction(req, res);

    } catch (err) {
        console.error("Approve Transfer Error:", err.message);
        return res.status(500).json({
            message: "Failed to execute approved transfer.",
            error: err.message
        });
    }
}

module.exports = {
    aiChatController,
    approveTransferController
};
