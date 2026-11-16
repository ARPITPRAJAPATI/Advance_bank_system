const crypto = require("crypto");
const { runBankingAgent } = require("../ai/agent");
const transactionController = require("./transaction.controller");

/**
 * 1. Conversational Banking Endpoint
 * Takes user message, invokes ReAct agent with Groq LPU, returns smart response
 */
async function aiChatController(req, res) {
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!message || typeof message !== "string" || message.trim().length === 0) {
            return res.status(400).json({ message: "A valid message string is required." });
        }

        // Run the agent with authenticated user context
        const result = await runBankingAgent(message.trim(), conversationHistory, req.user);

        return res.status(200).json({
            success: true,
            reply: result.reply,
            action: result.action // Contains confirmationToken if transfer was prepared!
        });

    } catch (err) {
        console.error("AI Chat Controller Error:", err.message);
        return res.status(500).json({
            message: "AI Copilot encountered an unexpected error.",
            error: err.message
        });
    }
}

/**
 * 2. Human-in-the-Loop Transfer Approval Endpoint
 * Verifies cryptographic HMAC token, then executes real transfer via transaction.controller.js
 */
async function approveTransferController(req, res) {
    try {
        const { confirmationToken } = req.body;

        if (!confirmationToken) {
            return res.status(400).json({ message: "confirmationToken is required to approve transfer." });
        }

        // A. Decode Base64 Token
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

        // B. Verify HMAC-SHA256 Cryptographic Signature (Anti-Tampering)
        const expectedSignature = crypto
            .createHmac("sha256", process.env.JWT_SECRET)
            .update(JSON.stringify(payload))
            .digest("hex");

        if (signature !== expectedSignature) {
            return res.status(403).json({
                message: "Security Alert: Tampered confirmation token detected. Transfer aborted."
            });
        }

        // C. Verify Expiration (5 Minute TTL)
        if (Date.now() > payload.expiresAt) {
            return res.status(410).json({
                message: "Confirmation token has expired. Please ask the AI to prepare the transfer again."
            });
        }

        // D. Anti-IDOR Check: Sender account must belong to the logged-in user
        // (User cannot approve a transfer using someone else's account)
        const idempotencyKey = `ai_tx_${payload.fromAccount}_${payload.toAccount}_${payload.amount}_${payload.expiresAt}`;

        // E. THE MAGIC: Directly delegate to our hardened transaction.controller!
        req.body = {
            fromAccount: payload.fromAccount,
            toAccount: payload.toAccount,
            amount: payload.amount,
            idempotencyKey
        };

        // Executes ACID session, Mutex Write-Lock, Ledger entries & Audit Logs!
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