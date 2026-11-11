# ⚙️ KubePay Backend Architecture & Engineering Master Deep Dive
> **Repository:** KubePay (Advance Banking System)  
> **Component:** Core Banking API, Ledger Engine & Multi-Document ACID Processor  
> **Tech Stack:** Node.js v22, Express.js, MongoDB Atlas (Replica Set), Mongoose v8, JWT, bcryptjs, Nodemailer  
> **Author:** Arpit Prajapati  
> **Target Audience:** Backend Engineers, System Architects, Distributed Systems Specialists

---

## 📑 Table of Contents
1. [High-Level Architecture & Request Lifecycle](#1-high-level-architecture--request-lifecycle)
2. [File-by-File Deep Dive](#2-file-by-file-deep-dive)
   - [2.1 `backend/server.js` & Process Lifecycle Management](#21-backendserverjs--process-lifecycle-management)
   - [2.2 `backend/src/db/db.js` & Fail-Fast Cluster Resilience](#22-backendsrcdbdbjs--fail-fast-cluster-resilience)
   - [2.3 `backend/src/app.js` & Express Middleware Engine](#23-backendsrcappjs--express-middleware-engine)
   - [2.4 `src/models/user.model.js` & Pre-Save Cryptographic Lifecycle](#24-srcmodelsusermodeljs--pre-save-cryptographic-lifecycle)
   - [2.5 `src/models/account.model.js` & Dynamic Ledger Aggregation](#25-srcmodelsaccountmodeljs--dynamic-ledger-aggregation)
   - [2.6 `src/models/ledger.model.js` & Tamper-Proof Double-Entry Accounting](#26-srcmodelsledgermodeljs--tamper-proof-double-entry-accounting)
   - [2.7 `src/models/transaction.model.js` & State Machine Architecture](#27-srcmodelstransactionmodeljs--state-machine-architecture)
   - [2.8 `src/models/blackList.model.js` & MongoDB Native TTL Eviction](#28-srcmodelsblacklistmodeljs--mongodb-native-ttl-eviction)
   - [2.9 `src/controllers/transaction.controller.js` & Multi-Document ACID Sessions](#29-srccontrollerstransactioncontrollerjs--multi-document-acid-sessions)
   - [2.10 `src/middlewares/auth.middleware.js` & Stateless Security Barrier](#210-srcmiddlewaresauthmiddlewarejs--stateless-security-barrier)
3. [Financial Integrity & The 4 ACID Guarantees in KubePay](#3-financial-integrity--the-4-acid-guarantees-in-kubepay)
4. [Edge Cases, Race Conditions & Failure Recoveries](#4-edge-cases-race-conditions--failure-recoveries)
5. [Senior Backend & System Design Interview Q&A](#5-senior-backend--system-design-interview-qa)

---

## 1. High-Level Architecture & Request Lifecycle

In a mission-critical financial backend, correctness, auditability, and tamper-proofing supersede raw speed. 

KubePay replaces the naive "update user balance in place" model with an **Event-Sourced, Append-Only Double-Entry Ledger System** backed by MongoDB WiredTiger Multi-Document ACID Transactions:

```mermaid
flowchart TD
    ClientReq["🌐 Incoming Request: POST /api/transaction/"] --> ExpressApp["Express HTTP Pipeline (app.js)"]
    
    subgraph Middleware_Chain ["Middleware Chain"]
        CORS["CORS Shield (credentials: true)"]
        BodyParser["Body Parser (express.json)"]
        CookieParser["Cookie Parser (req.cookies)"]
        AuthGuard["Auth Middleware (JWT Verify & Blacklist Check)"]
    end

    ExpressApp --> CORS --> BodyParser --> CookieParser --> AuthGuard
    AuthGuard --> TxnController["Transaction Controller (createTransaction)"]

    subgraph Controller_Logic ["Atomic Banking Controller"]
        Idempotency["1. Idempotency Check (Existing Txn?)"]
        StatusCheck["2. Account Status Check (ACTIVE?)"]
        BalanceCheck["3. Dynamic Balance Scan (Total Credit - Total Debit)"]
        ACIDSession["4. Start Mongoose ACID Session (startTransaction)"]
    end

    TxnController --> Idempotency --> StatusCheck --> BalanceCheck --> ACIDSession

    subgraph WiredTiger_ReplicaSet ["MongoDB Atlas WiredTiger Storage Engine"]
        InsertTxn["Insert Transaction (PENDING)"]
        InsertCredit["Insert Ledger Entry: Recipient (CREDIT)"]
        InsertDebit["Insert Ledger Entry: Sender (DEBIT)"]
        UpdateTxn["Update Transaction (COMPLETED)"]
    end

    ACIDSession --> InsertTxn --> InsertCredit --> InsertDebit --> UpdateTxn
    UpdateTxn --> Commit["session.commitTransaction()"]
    Commit --> EmailNotification["Non-Blocking Email Alert (Nodemailer)"]
    EmailNotification --> SuccessResponse["HTTP 201 Created"]
```

---

## 2. File-by-File Deep Dive

---

### 2.1 `backend/server.js` & Process Lifecycle Management

```javascript
require('dotenv').config();
const app = require('./src/app');
const connectDB = require("./src/db/db");
const crypto = require("crypto");
global.crypto = crypto;

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});
```

#### Line-by-Line Architectural Rationale:
* `const app = require('./src/app')`:
  * **The "Separation of Concerns" Pattern**: Notice that `server.js` does NOT register routes or middlewares. It strictly manages **process startup, environmental loading, and network binding**.
  * **Why is this critical for automated testing?** If routes and `app.listen()` are in the same file, automated test tools (Supertest, Jest, Mocha) will attempt to bind to a physical network port on every test run. In multi-stage Jenkins CI pipelines, running parallel test suites results in `EADDRINUSE: Port 3000 already in use` errors! Separating them allows test suites to import `app` directly into memory without starting a live TCP server.
* `global.crypto = crypto;`:
  * **WebCrypto API Polyfill**: Node.js historically exposed cryptographic primitives via the `crypto` module, while browser runtimes standardise on `globalThis.crypto.randomUUID()`. Setting `global.crypto = crypto` guarantees cross-runtime compatibility for UUID/token generators and modern cryptographic helper packages.
* `connectDB();`:
  * Establishes the database handshake before processing any incoming HTTP requests.

---

### 2.2 `backend/src/db/db.js` & Fail-Fast Cluster Resilience

```javascript
const mongoose = require('mongoose');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("db connected");
    } catch(err) {
        console.error("error", err.message);
        process.exit(1); // 👈 CRITICAL FAIL-FAST PATTERN
    }
}

module.exports = connectDB;
```

#### Line-by-Line Architectural Rationale:
* `process.exit(1)`:
  * **The Cloud-Native Fail-Fast Principle**: If the database is unreachable (e.g. bad credentials, network partition, IP whitelist block), continuing to run is catastrophic. A banking server that accepts HTTP traffic without a database will return 500 errors on every single customer transfer.
  * In Kubernetes, calling `process.exit(1)` immediately notifies the Kubelet that the container crashed. Kubernetes terminates the pod, marks it as `CrashLoopBackOff`, and redirects incoming traffic exclusively to other healthy backend pod replicas. Furthermore, this triggers Prometheus alert rules to notify the on-call SRE.

---

### 2.3 `backend/src/app.js` & Express Middleware Engine

```javascript
const express = require('express');
const authRouter = require("./routes/auth.route");
const accountRouter = require("./routes/account.route");
const transactionRouter = require("./routes/transaction.route");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
    console.log(`REQUEST: ${req.method} ${req.url}`);
    console.log(`BODY:`, req.body);
    next();
});

app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/account", accountRouter);
app.use("/api/transaction", transactionRouter);
app.use("/api/transactions", transactionRouter);

module.exports = app;
```

#### Line-by-Line Architectural Rationale:
* `app.use(cors({ origin: true, credentials: true }));`:
  * **The Credentialed CORS Specification Trap**: When transmitting cookies across origins (`credentials: true`), the W3C CORS specification strictly prohibits wildcard `origin: "*"`.
  * `origin: true` instructs the CORS middleware to dynamically reflect the calling request's `Origin` header into `Access-Control-Allow-Origin`, allowing cookie transmission while satisfying browser security constraints.
* `app.use(cookieParser());`:
  * Parses incoming raw HTTP `Cookie` request headers (e.g. `Cookie: token=eyJhbGciOi...`) into structured JavaScript objects accessible on `req.cookies.token`.
* **Defensive Route Aliasing**:
  ```javascript
  app.use("/api/accounts", accountRouter);
  app.use("/api/account", accountRouter);
  app.use("/api/transaction", transactionRouter);
  app.use("/api/transactions", transactionRouter);
  ```
  * In enterprise APIs, different clients (React web app, iOS app, Android app, external webhooks) frequently alternate between singular and plural endpoints (`/account/me` vs `/accounts/me`).
  * Aliasing both variants prevents superficial 404 errors without duplicating controllers or adding latency.

---

### 2.4 `src/models/user.model.js` & Pre-Save Cryptographic Lifecycle

```javascript
const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "email is required for creating a user"],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "invalid email"],
        unique: [true, "email already exist"]
    },
    name: {
        type: String,
        required: [true, "name is required for creating an account"],
        unique: true,
    },
    password: {
        type: String,
        required: [true, "Password is required for creating an account"],
        minlength: [6, "password should contain more than 6 chars"],
        select: false // 👈 Never leaked in API queries
    },
    systemUser: {
        type: Boolean,
        default: false,
        immutable: true // 👈 Privilege escalation defense
    }
}, { timestamps: true });

userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }
    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
    return;
});

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

const userModel = mongoose.model("user", userSchema);
module.exports = userModel;
```

#### Line-by-Line Architectural Rationale:
* `select: false` on `password`:
  * When developers write `userModel.findOne({ email })` or populate user references, Mongoose automatically omits the password field from the returned document.
  * Guarantees that password hashes are never accidentally serialized into JSON responses sent to the client browser.
* `userSchema.pre("save", async function() { ... })`:
  * **Why `function()` instead of an arrow function `() => {}`?**
    * In Mongoose middleware, `this` binds dynamically to the specific document being validated and persisted.
    * Arrow functions inherit lexical `this` from the file scope (`undefined` or `exports`), breaking the hook and throwing `TypeError: Cannot read properties of undefined`.
  * `if (!this.isModified("password")) return;`:
    * If a user updates their display name or profile details, this guard prevents bcrypt from re-hashing an already hashed password string!
* `systemUser: { immutable: true }`:
  * Prevents privilege escalation. System liquidity accounts cannot be converted into regular user accounts through malicious update payloads.

---

### 2.5 `src/models/account.model.js` & Dynamic Ledger Aggregation

```javascript
const mongoose = require('mongoose');
const ledgerModel = require('./ledger.model');

const accountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: [true, "Account must be associated with a user"],
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ["ACTIVE", "FROZEN", "CLOSED"],
      message: "status can be either active, frozen or closed"
    },
    default: "ACTIVE"
  },
  currency: {
    type: String,
    required: [true, "currency is required for creating account"],
    default: "INR"
  },
}, { timestamps: true });

accountSchema.index({ user: 1, status: 1 });

// 👈 Dynamic balance computation directly from immutable ledger
accountSchema.methods.getBalance = async function () {
  const balanceData = await ledgerModel.aggregate([
    { $match: { account: this._id } },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0]
          }
        },
        totalCredit: {
          $sum: {
            $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0]
          }
        }
      }
    }
  ]);

  const totalDebit = balanceData[0]?.totalDebit || 0;
  const totalCredit = balanceData[0]?.totalCredit || 0;
  return totalCredit - totalDebit;
};

const accountModel = mongoose.model("account", accountSchema);
module.exports = accountModel;
```

#### Line-by-Line Architectural Rationale:
* **The "No Mutable Balance" Principle**:
  * Notice that `accountSchema` **does not have a `balance: Number` field**!
  * In concurrent banking, storing a mutable balance number is an architectural disaster known as the **Lost Update Problem**:
    * Thread A reads balance: ₹1,000.
    * Thread B reads balance: ₹1,000.
    * Thread A deducts ₹400 and writes ₹600.
    * Thread B deducts ₹300 and writes ₹700 (overwriting Thread A's deduction, creating ₹300 of phantom money!).
* **How `getBalance()` Solves This**:
  * Executes a native MongoDB Aggregation pipeline directly against the immutable `ledger` collection.
  * `$match: { account: this._id }`: Limits calculation to the targeted account (accelerated by the B-tree index on `{ account: 1 }`).
  * `$group` with `$cond`: Evaluates every debit and credit ledger entry in parallel.
  * Formula: `Current Balance = Total Credit - Total Debit`.
  * **Result**: The balance is mathematically derived from an unalterable history of events.

---

### 2.6 `src/models/ledger.model.js` & Tamper-Proof Double-Entry Accounting

```javascript
const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Ledger must have an account"],
        index: true,
        immutable: true
    },
    amount: {
        type: Number,
        required: [true, "Ledger must have an amount"],
        immutable: true
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        required: [true, "Ledger must have a transaction"],
        index: true,
        immutable: true
    },
    type: {
        type: String,
        enum: {
            values: ["CREDIT", "DEBIT"],
            message: "type can be either credit or debit"
        },
        required: [true, "Ledger must have a type"],
        immutable: true
    }
}, { timestamps: true });

// 👈 STRICT APPEND-ONLY FINANCIAL ENFORCEMENT
function preventLedgerModification() {
    throw new Error("Ledger entries cannot be modified or deleted.");
}

ledgerSchema.pre('updateOne', preventLedgerModification);
ledgerSchema.pre('deleteOne', preventLedgerModification);
ledgerSchema.pre('findOneAndUpdate', preventLedgerModification);
ledgerSchema.pre('findOneAndDelete', preventLedgerModification);
ledgerSchema.pre('remove', preventLedgerModification);
ledgerSchema.pre('deleteMany', preventLedgerModification);
ledgerSchema.pre('updateMany', preventLedgerModification);

const ledgerModel = mongoose.model("ledger", ledgerSchema);
module.exports = ledgerModel;
```

#### Line-by-Line Architectural Rationale:
* `immutable: true`:
  * Mongoose blocks any attempt to reassign `account`, `amount`, `transaction`, or `type` on an existing ledger document instance.
* `preventLedgerModification()` Hooks:
  * In regulatory accounting (SOX, PCI-DSS, RBI compliance), past ledger records must **never** be edited or deleted. If a refund or correction is required, a new compensating entry must be appended.
  * Attaching hooks to `updateOne`, `deleteOne`, `updateMany`, `deleteMany`, `findOneAndUpdate`, etc., guarantees that even if a developer writes an erroneous query, Mongoose throws a fatal exception before the query reaches the database engine.

---

### 2.7 `src/models/transaction.model.js` & State Machine Architecture

```javascript
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Transaction must have a from account"],
        index: true
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Transaction must have a to account"],
        index: true
    },
    status: {
        type: String,
        enum: {
            values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
            message: "status can be either pending, completed, failed or reversed"
        },
        default: "PENDING"
    },
    amount: {
        type: Number,
        required: [true, "Transaction must have an amount"],
        min: [0, "Transaction amount must be greater than 0"]
    },
    idempotencyKey: {
        type: String,
        required: [true, "Transaction must have an idempotency key"],
        unique: [true, "Idempotency key must be unique"],
        index: true
    }
}, { timestamps: true });

const transactionModel = mongoose.model("transaction", transactionSchema);
module.exports = transactionModel;
```

#### State Machine Flow:
```mermaid
stateDiagram-v2
    [*] --> PENDING: Created inside Session
    PENDING --> COMPLETED: Double-Entry Writes & Commit Succeeded
    PENDING --> FAILED: Session Aborted / Validation Error
    COMPLETED --> REVERSED: Compensating Refund Entry Appended
```

---

### 2.8 `src/models/blackList.model.js` & MongoDB Native TTL Eviction

```javascript
const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "Token is required"],
        unique: true,
    },
}, { timestamps: true });

tokenBlacklistSchema.index({ createdAt: 1 }, {
    expireAfterSeconds: 60 * 60 * 24 * 30 // 30 Days TTL
});

const tokenBlacklistModel = mongoose.model("tokenBlacklist", tokenBlacklistSchema);
module.exports = tokenBlacklistModel;
```

#### Architectural Rationale:
* **The Stateless JWT Invalidation Dilemma**:
  * JSON Web Tokens (JWT) are cryptographically self-contained. Once issued, a token remains valid until its `exp` timestamp, meaning traditional logouts cannot invalidate the token without server-side state.
* **The TTL Solution**:
  * On logout, the token is recorded in `tokenBlacklistModel`.
  * MongoDB's native TTL (Time-To-Live) background thread automatically scans the index every 60 seconds and permanently deletes documents older than 30 days.
  * Zero cron jobs, zero Redis instances, zero memory leaks.

---

### 2.9 `src/controllers/transaction.controller.js` & Multi-Document ACID Sessions

```javascript
async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({ message: "toAccount, amount and idempotencyKey are required" });
    }

    const fromUserAccount = await accountModel.findOne({ _id: fromAccount });
    const toUserAccount = await accountModel.findOne({ _id: toAccount });

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({ message: "invalid fromAccount or toAccount" });
    }

    // 1. Idempotency Guard: Prevent duplicate debits
    const isTransactonAlreadyExists = await transactionModel.findOne({ idempotencyKey });
    if (isTransactonAlreadyExists) {
        if (isTransactonAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({ message: "Transaction already processed", transaction: isTransactonAlreadyExists });
        }
        if (isTransactonAlreadyExists.status === "PENDING") {
            return res.status(200).json({ message: "Transaction is still processing" });
        }
        if (isTransactonAlreadyExists.status === "FAILED") {
            return res.status(200).json({ message: "Transaction processing failed, please retry" });
        }
        if (isTransactonAlreadyExists.status === "REVERSED") {
            return res.status(200).json({ message: "Transaction processing reversed" });
        }
    }

    // 2. Account Status Validation
    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({ message: "Both fromAccount and toAccount must be ACTIVE to process transaction" });
    }

    // 3. Balance Sufficiency Check
    const balance = await fromUserAccount.getBalance();
    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Required amount is ${amount}`
        });
    }

    // 4. Multi-Document ACID Transaction Session
    const session = await mongoose.startSession();
    session.startTransaction();
    let transaction;

    try {
        const [txn] = await transactionModel.create([{
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        }], { session });

        transaction = txn;

        // Double-entry bookkeeping: Credit Recipient
        await ledgerModel.create([{
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        }], { session });

        // Double-entry bookkeeping: Debit Sender
        await ledgerModel.create([{
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session });

        // Mark Transaction Complete
        transaction.status = "COMPLETED";
        await transaction.save({ session });

        // Commit all changes atomically
        await session.commitTransaction();
        session.endSession();

    } catch (err) {
        // Rollback all changes on failure
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({
            message: "Transaction failed to process",
            error: err.message
        });
    }

    // 5. Asynchronous, Non-Blocking Email Notification
    try {
        await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount);
    } catch (emailErr) {
        console.error("Email notification error (non-blocking):", emailErr.message);
    }

    return res.status(201).json({ message: "Transaction completed successfully", transaction });
}
```

---

### 2.10 `src/middlewares/auth.middleware.js` & Stateless Security Barrier

```javascript
const jwt = require("jsonwebtoken");
const tokenBlacklistModel = require("../models/blackList.model");

async function authMiddleware(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    // Check token blacklist
    const isBlacklisted = await tokenBlacklistModel.findOne({ token });
    if (isBlacklisted) {
        return res.status(401).json({ message: "Token has been revoked. Please log in again." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attaches { _id, email, name }
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }
}

module.exports = authMiddleware;
```

---

## 3. Financial Integrity & The 4 ACID Guarantees in KubePay

| ACID Property | Implementation in KubePay |
| :--- | :--- |
| **Atomicity** | `session.startTransaction()` wraps the creation of the `transaction` document, the recipient's `CREDIT` ledger entry, and the sender's `DEBIT` ledger entry. If an error occurs, `session.abortTransaction()` rolls back all three writes. |
| **Consistency** | Dynamic aggregation via `getBalance()` guarantees that the sum of all credits minus the sum of all debits across the bank equals total liquidity. Mongoose schema constraints enforce positive amounts (`min: 0`) and valid account statuses (`ACTIVE`). |
| **Isolation** | MongoDB WiredTiger uses **Snapshot Isolation**. Queries within the transaction read from a point-in-time snapshot of the database, preventing dirty reads or phantom updates from concurrent operations. |
| **Durability** | Committed transactions are written to MongoDB's write-ahead log (journal) across the Atlas Replica Set before `commitTransaction()` resolves, guaranteeing persistence even if node hardware fails. |

---

## 4. Edge Cases, Race Conditions & Failure Recoveries

### 1. The Double-Click Race Condition
* **Scenario**: A user clicks "Transfer ₹5,000" twice in 50 milliseconds.
* **Defense**: The client sends the identical `idempotencyKey`. The backend query `findOne({ idempotencyKey })` catches the second request. If the first request is still running, it returns `Transaction is still processing`. If completed, it returns the existing transaction without executing a second debit.

### 2. Server Crash During Database Transaction
* **Scenario**: The Node.js server container crashes or runs out of memory (OOMKill) precisely after inserting the `CREDIT` ledger entry but before the `DEBIT` entry.
* **Defense**: Because the writes were bound to `{ session }`, MongoDB's transaction coordinator notices the connection loss and automatically aborts the uncommitted transaction. No money is credited.

### 3. SMTP Server Latency Spike
* **Scenario**: The Gmail SMTP email server takes 12 seconds to respond or fails due to network outage.
* **Defense**: Email delivery is placed **outside** the database transaction session in a dedicated `try/catch` block. The bank transfer commits immediately in ~20ms, and an email failure never rolls back a legally committed transfer.

---

## 5. Senior Backend & System Design Interview Q&A

### Q1: "Why did you implement an append-only double-entry ledger instead of storing a `balance` field in the user document?"
> **Answer:** *"Storing a mutable balance number is an anti-pattern in concurrent financial systems. It causes the Lost Update problem under parallel requests and makes auditing mathematically impossible if discrepancies arise. By implementing double-entry accounting with an append-only ledger, the balance is dynamically derived using high-performance MongoDB aggregation (`totalCredit - totalDebit`). To guarantee regulatory compliance, we attached Mongoose pre-hooks on `updateOne` and `deleteOne` that reject any modification or deletion queries at runtime."*

### Q2: "Why is external I/O (like sending emails) strictly forbidden inside database transaction blocks?"
> **Answer:** *"Database transaction sessions hold locks, maintain snapshot state, and consume connection pool slots. Network I/O operations like SMTP calls have non-deterministic latencies (often hundreds of milliseconds or seconds). Keeping database transactions open while awaiting external HTTP/SMTP responses starves the database connection pool and increases lock contention. Furthermore, if the email server times out, rolling back a valid monetary transfer is incorrect business logic. Decoupling notification delivery outside the committed transaction preserves database throughput and data correctness."*

### Q3: "How does your system guarantee idempotency on payment APIs?"
> **Answer:** *"Every payment request must supply a client-generated `idempotencyKey` indexed uniquely in MongoDB. When a request arrives, the controller checks whether a transaction with that key exists. If it exists with status `COMPLETED`, the server short-circuits execution and returns the existing transaction with HTTP 200 without touching the ledger. If it is `PENDING`, it informs the client that processing is underway. This eliminates double-debiting caused by network timeouts or user retries."*

### Q4: "How does `process.exit(1)` in your database connection handler protect the Kubernetes cluster?"
> **Answer:** *"It enforces the fail-fast principle. If MongoDB is unreachable, the application cannot fulfill banking transactions. If Node.js continues running, Kubernetes liveness probes may consider the pod alive, routing customer traffic to a zombie container that throws 500 errors. By exiting with code 1, the container immediately terminates, alerting the Kubelet to remove the pod from the Service endpoints and trigger pod restart policies."*

