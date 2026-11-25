# 🏛️ KubePay — Core Banking & Backend Engine Architecture
> **Author:** Arpit Prajapati | **Page 2 of 4**
> **Stack:** Node.js 22 LTS · Express 5.2 · MongoDB Atlas 8.0 · JWT · Bcrypt · Nodemailer

---

## 🌐 Client → Backend Request Flow

```mermaid
graph LR
    User["👤 Bank Customer"]

    subgraph SPA["⚛️ React 19 SPA"]
        UUID["crypto.randomUUID()\nIdempotency Key"]
        AuthCtx["AuthContext\nHttpOnly Cookie Session"]
        Axios["Axios\nwithCredentials: true"]
    end

    subgraph NGINX["⚡ Nginx 1.31 Reverse Proxy"]
        Static["Static SPA /"]
        Proxy["Proxy /api/* → backend:3000"]
        Headers["CSP · X-Frame-Deny\nCORS · SameSite"]
    end

    subgraph BACKEND["⚙️ Express 5.2 Backend (2 Replicas)"]
        PII["PII Sanitizer Middleware\nStrips CVV · Passwords from logs"]
        JWT["JWT Cookie Auth\nVerify HS256 Signature\nBlacklist DB Check"]
        Routes["Route Handlers\n/auth /accounts /transactions /ai"]
        IdempKey["Idempotency Guard\nUUID Dedup (24h TTL)"]
        TxEngine["Transaction Engine\nACID Session Coordinator"]
        Ledger["Double-Entry Ledger\nImmutable DEBIT/CREDIT Writer"]
        Email["Email Dispatcher\nNodemailer + OAuth2 (async)"]
    end

    DB[("🍃 MongoDB Atlas\n3-Node Replica Set")]

    User --> UUID --> Axios --> NGINX --> PII --> JWT --> Routes --> IdempKey --> TxEngine --> Ledger --> DB
    TxEngine -.->|Async| Email
```

---

## 💳 ACID Transaction Coordinator — Internal Flow

```mermaid
sequenceDiagram
    participant Client
    participant IdempGuard as Idempotency Guard
    participant Session as MongoDB Session
    participant Ledger as Ledger Writer
    participant DB as MongoDB Atlas

    Client->>IdempGuard: POST /transfer (UUID key)
    IdempGuard->>DB: findOne({ key: UUID })
    alt UUID found (duplicate)
        DB-->>Client: Return cached response (no debit!)
    else UUID new
        IdempGuard->>DB: Insert UUID (lock)
        IdempGuard->>Session: session.withTransaction()
        Session->>DB: findOne(fromAccount) — Read Concern: majority
        Session->>DB: Validate balance >= amount
        Session->>DB: Validate status == ACTIVE
        Session->>Ledger: Write DEBIT entry (sender)
        Session->>Ledger: Write CREDIT entry (receiver)
        Session->>DB: Commit (Write Concern: w:majority, j:true)
        alt Any failure
            Session->>DB: Automatic Rollback (100% atomic)
        end
        DB-->>Client: 201 Created + Transaction receipt
    end
```

---

## 📒 Double-Entry Ledger — The Core Principle

```mermaid
graph TD
    TX["Transaction: Arpit → Rahul ₹5,000"]

    DEBIT["📤 DEBIT Entry\naccount: Arpit's Account\ntype: DEBIT\namount: 5000\ntransaction: TXN_ID"]

    CREDIT["📥 CREDIT Entry\naccount: Rahul's Account\ntype: CREDIT\namount: 5000\ntransaction: TXN_ID"]

    BALANCE["Balance Computation\n(NEVER stored in DB)\nBalance = Σ(CREDIT) - Σ(DEBIT)\nQueried fresh every time"]

    RECON["🔄 Nightly Reconciler\nΣ All DEBITs = Σ All CREDITs\nMismatch → Immediate Alert"]

    TX -->|Atomic ACID Commit| DEBIT
    TX -->|Atomic ACID Commit| CREDIT
    DEBIT --> BALANCE
    CREDIT --> BALANCE
    DEBIT --> RECON
    CREDIT --> RECON
```

---

## 🗄️ Database Schema Design

### `ledger_records` Collection (Immutable Audit Log)

| Field | Type | Constraint / Purpose |
|---|---|---|
| `account` | ObjectId | Indexed ref → `accounts._id` |
| `type` | Enum | `DEBIT` (Outflow) or `CREDIT` (Inflow) |
| `amount` | Number | Strict positive decimal (₹) |
| `transaction` | ObjectId | Atomic parent transaction ref |
| `createdAt` | Date | Immutable ISO 8601 timestamp |

> ⚠️ **No `update` or `delete` allowed on ledger records. Immutability is enforced at model level.**

### `idempotency_keys` Collection (Dedup Cache)

| Field | Type | Constraint / Purpose |
|---|---|---|
| `key` | String | Unique UUID v4 from client |
| `response` | Object | Cached HTTP status + transaction JSON |
| `createdAt` | Date | **24h TTL auto-eviction index** |

### `blacklisted_tokens` Collection (Session Revocation)

| Field | Type | Constraint / Purpose |
|---|---|---|
| `token` | String | Full JWT or JTI hash |
| `createdAt` | Date | TTL matches JWT expiry window |

---

## 🔐 JWT Auth & Session Architecture

```mermaid
graph LR
    Login["POST /auth/login\nVerify password (bcrypt)"]
    Sign["Sign JWT\nalgorithm: HS256\nexpiry: 7d"]
    Cookie["Set-Cookie: token=...\nHttpOnly ✅\nSecure ✅\nSameSite: Lax ✅"]
    Request["Subsequent API Request\n(cookie auto-sent)"]
    Middleware["auth.middleware.js\n1. Extract cookie\n2. Verify HS256 signature\n3. Check blacklist DB"]
    Valid["✅ Attach req.user\nContinue to route handler"]
    Logout["POST /auth/logout\nWrite token to blacklisted_tokens"]

    Login --> Sign --> Cookie --> Request --> Middleware --> Valid
    Valid --> Logout
```

> **Why HttpOnly Cookie?** JavaScript cannot access `document.cookie` → XSS attacks cannot steal tokens. This eliminates the most common JWT theft vector entirely.

---

## 🔒 IDOR Ownership Check (Authorization Layer)

Every financial operation enforces:

```js
const account = await accountModel.findOne({
    _id: args.accountId,
    user: req.user._id   // ← IDOR check: must own this account
});
if (!account) return res.status(403).json({ message: "Forbidden" });
```

> Even if an attacker knows another user's `accountId`, the query returns `null` because `user` field won't match. No separate permission middleware needed.

---

## 📧 Async Email Notification Architecture

| Design Choice | Reason |
|---|---|
| **Async (non-blocking)** | SMTP latency never delays customer HTTP response |
| **Google OAuth2** | No password in environment — token-based refresh |
| **Post-commit trigger** | Email fires only after successful ACID commit |
| **HTML receipts** | Includes TX ref, timestamp, masked accounts, balance |

---

## 🎯 Interview Defense Points

**Q: Why not just store a `balance` field on the account?**
> Mutable balance fields are vulnerable to concurrent update corruption and silent data drift. With double-entry ledger, every rupee has a provenance. `Balance = Σ(CREDIT) - Σ(DEBIT)` is a mathematical invariant that cannot silently diverge.

**Q: What happens if the server crashes mid-transaction?**
> MongoDB `session.withTransaction()` guarantees atomicity. If the commit hasn't been acknowledged by majority of replica nodes (`w: majority, j: true`), the session is automatically rolled back. The client receives a network error and can safely retry with the same UUID idempotency key.

**Q: Why HttpOnly cookies instead of localStorage for JWT?**
> localStorage is accessible via `document.cookie` — any XSS script can steal the token. HttpOnly cookies are invisible to JavaScript entirely, making token theft via XSS physically impossible.
