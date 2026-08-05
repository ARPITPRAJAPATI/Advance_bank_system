const express = require('express')
const authRouter = require("./routes/auth.route")
const accountRouter = require("./routes/account.route")
const transactionRouter = require("./routes/transaction.route")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const app =express();

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())

app.use((req, res, next) => {
    console.log(`REQUEST: ${req.method} ${req.url}`);
    console.log(`BODY:`, req.body);
    next();
});

app.use("/api/auth",authRouter)
app.use("/api/accounts",accountRouter)
app.use("/api/transaction", transactionRouter)


module.exports = app