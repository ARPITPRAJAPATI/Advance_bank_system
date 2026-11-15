const express = require('express')
const authRouter = require("./routes/auth.route")
const accountRouter = require("./routes/account.route")
const transactionRouter = require("./routes/transaction.route")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())


app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url}`);

    if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = { ...req.body };
        const sensitiveFields = ['password', 'token', 'jwt', 'cvv', 'pin'];

        sensitiveFields.forEach(field => {
            if (sanitizedBody[field]) {
                sanitizedBody[field] = '[REDACTED]';
            }
        });

        console.log(`SANITIZED BODY:`, sanitizedBody);
    }
    next();
});

app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/account", accountRouter);
app.use("/api/transaction", transactionRouter);
app.use("/api/transactions", transactionRouter);


module.exports = app