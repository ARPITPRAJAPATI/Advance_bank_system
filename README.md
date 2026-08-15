<h1 align="center">✦ Kube Pay — Advanced Banking System</h1>

<p align="center">
  <b>Enterprise-Grade Banking Platform & Financial Transaction System</b><br/>
  <i>Atomic Ledger Operations • Idempotency Engine • JWT Cookie Shield • Modern Luxury UI</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/TailwindCSS-v4.3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white"/>
  <img src="https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express-v5.2-000000?style=for-the-badge&logo=express&logoColor=white"/>
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white"/>
  <img src="https://img.shields.io/badge/JWT-HttpOnly_Cookies-FF6B6B?style=for-the-badge&logo=jsonwebtokens&logoColor=white"/>
</p>

---

## 📌 Executive Overview

**Kube Pay** (Advanced Banking System) is a production-grade, full-stack financial application built for ultra-high consistency, bank-level security, and quiet luxury aesthetics. 

Unlike conventional CRUD applications, **Kube Pay** is engineered around core **Distributed Systems & Financial Engineering** principles:
- 💳 **Atomic DB Transactions**: Multi-document MongoDB ACID sessions guarantee that money is never lost during transfers.
- 📊 **Double-Entry Ledger Architecture**: Every transfer generates paired `DEBIT` and `CREDIT` records ensuring zero net-loss auditability.
- 🔁 **Idempotent API Engine**: Guaranteed single execution via UUID idempotency keys to eliminate double-spending from network retries.
- 🔒 **HttpOnly Cookie Auth Shield**: JWT authentication powered by automatic cookie persistence and server-side token blacklisting.
- ✨ **Quiet Luxury Design System**: React 19 + TailwindCSS v4 frontend featuring glassmorphism cards, dynamic 3D tilt interaction, and zero-latency UI responsiveness.

---

## 🛠️ Full-Stack Technology Stack

| Domain | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Client Core** | **React 19.2 + Vite 8.2** | Lightning fast HMR, component tree optimization, zero bundle bloat |
| **Styling & UI** | **Tailwind CSS v4 + Vanilla CSS** | Custom matte dark theme (`#0A0C10`), glassmorphism, 3D tilt effects |
| **Icons & Motion** | **Lucide Icons** | Modern minimalist vector iconography |
| **State & Router** | **React Router v7 + Context API** | `AuthContext` session persistence & `PrivateRoute` protection |
| **HTTP Client** | **Axios 1.19** | Interceptors, automated error mapping & CORS `withCredentials` support |
| **Server Engine** | **Node.js + Express 5.2** | Async RESTful services, strict input validation, CORS credentials |
| **Database** | **MongoDB + Mongoose 9.8** | Atomic Session Transactions, Schema Validation, Ledger models |
| **Security** | **JWT + Bcrypt.js + CookieParser** | Password hashing, HTTP-Only secure cookies, blacklisted token tracking |

---

## 🏛️ System Architecture & Engineering Principles

### 1. 🔄 Atomic Money Transfers (ACID Sessions)
When User A sends money to User B:
```
Client Request (fromAccount, toAccount, amount, idempotencyKey)
   │
   ├──▶ 1. Begin MongoDB Session Transaction
   ├──▶ 2. Validate Sender Balance >= Amount
   ├──▶ 3. Deduct Amount from Sender Account
   ├──▶ 4. Add Amount to Receiver Account
   ├──▶ 5. Create DEBIT Ledger Record for Sender
   ├──▶ 6. Create CREDIT Ledger Record for Receiver
   ├──▶ 7. Commit Session Transaction
   └──▶ Response 200 OK (Atomic Success)
   
* In case of any error at any step, the transaction immediately ABORTS and ROLLS BACK.
```

### 2. 📊 Double-Entry Ledger System
Money is never updated arbitrarily. Balance calculations are strictly bound to audit logs:
- **DEBIT Entry**: Applied to `fromAccount` with negative value impact.
- **CREDIT Entry**: Applied to `toAccount` with positive value impact.

### 3. 🔁 Idempotency Key Engine
To protect against network delays, button double-clicks, or automated retries:
```
Incoming API Request ──▶ Check `idempotencyKey` in Transactions Collection
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Key Exists in DB]                [Key is New]
   Return cached transaction          Execute atomic transfer
   result immediately                 & store idempotency key
```

---

## 📁 Repository Structure

```
adv_bank_system/
├── frontend/                     # Client Web Application (Vite + React)
│   ├── public/                   # Static assets & icons
│   ├── src/
│   │   ├── assets/               # Branding assets
│   │   ├── components/           # UI Component Library
│   │   │   ├── Button.jsx        # Production-grade button primitive
│   │   │   ├── Input.jsx         # Controlled form input helper
│   │   │   ├── Navbar.jsx        # Quiet luxury sticky header
│   │   │   └── TiltCard.jsx      # 3D tilt card primitive
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Global user state & session persistence
│   │   ├── pages/
│   │   │   └── LandingPage.jsx   # Main luxury landing page & mockup showcase
│   │   ├── routes/
│   │   │   └── PrivateRoute.jsx  # Protected route guard
│   │   ├── services/
│   │   │   ├── api.js            # Axios client with interceptors
│   │   │   ├── auth.service.js   # Login, Register & Logout API handlers
│   │   │   ├── account.service.js# Bank account endpoints
│   │   │   └── transaction.service.js # Money transfer endpoints
│   │   ├── App.jsx               # Main React Router switch
│   │   ├── index.css             # Tailwind v4 theme tokens & animations
│   │   └── main.jsx              # React DOM root entry
│   ├── package.json
│   └── vite.config.js
│
├── src/                          # Express REST API Backend
│   ├── controllers/              # Auth, Account & Transaction controllers
│   ├── db/                       # Mongoose database connection
│   ├── middleware/               # Auth middleware & token verification
│   ├── models/                   # User, Account, Transaction & Blacklist schemas
│   ├── routes/                   # Auth, Account & Transaction express routers
│   ├── services/                 # Email service & helper utilities
│   └── app.js                    # Express app configuration & CORS setup
│
├── server.js                     # Backend HTTP server entry
├── package.json                  # Root dependencies & scripts
└── README.md                     # Master documentation
```

---

## 📡 API Reference

### 🔐 Auth Endpoints (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register new user account (`email`, `password`, `name`) | ❌ |
| `POST` | `/api/auth/login` | Authenticate user & set JWT HttpOnly cookie | ❌ |
| `POST` | `/api/auth/logout` | Revoke token, add to blacklist & clear cookie | ✅ |

### 💳 Account Endpoints (`/api/account`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/account/` | Create a new bank account for logged-in user | ✅ |
| `GET` | `/api/account/` | List all active bank accounts belonging to user | ✅ |
| `GET` | `/api/account/balance/:accountId` | Get real-time ledger balance for account | ✅ |

### 💸 Transaction Endpoints (`/api/transaction`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/transaction/` | Execute atomic fund transfer between accounts | ✅ |
| `GET` | `/api/transaction/my-transactions` | Fetch full ledger transaction history | ✅ |
| `POST` | `/api/transaction/system/initial-funds` | Admin deposit initial balance into account | ✅ |

---

## 🗺️ 15-Day Implementation Roadmap & Status

| Phase | Day | Focus Module | Status |
| :--- | :---: | :--- | :---: |
| **Phase 1** | **Day 1** | Backend API, CORS Configuration & Ledger Endpoints | 🟢 Completed |
| | **Day 2** | Design System Tokens (`index.css`), Base Primitives & Axios Client | 🟢 Completed |
| | **Day 3** | Global `AuthContext`, Route Guard & Luxury `LandingPage.jsx` | 🟢 Completed |
| **Phase 2** | **Day 4** | Interactive Auth UI (`LoginPage.jsx` & `RegisterPage.jsx`) | 🟡 In Progress |
| | **Day 5** | User Profile, Security Center & Active Session Revocation | ⚪ Planned |
| **Phase 3** | **Day 6** | Main Dashboard Shell & Combined Balance Metric Cards | ⚪ Planned |
| | **Day 7** | Accounts Management Hub & Interactive `AccountCard` Grid | ⚪ Planned |
| | **Day 8** | Account Funding Modal & Status Toggles | ⚪ Planned |
| **Phase 4** | **Day 9** | Instant Money Transfer Suite (UPI / Internal Account Transfer) | ⚪ Planned |
| | **Day 10** | Atomic Transaction Processing UI & Digital Receipt Modal | ⚪ Planned |
| | **Day 11** | Live Transaction Ledger Table with Credit/Debit Filters | ⚪ Planned |
| **Phase 5** | **Day 12** | Virtual Platinum Debit Card Manager (Flip 3D Card & Freeze Card) | ⚪ Planned |
| | **Day 13** | Expense Analytics & Category Spending Breakdown Charts | ⚪ Planned |
| | **Day 14** | QR Scanner Simulation & Quick `@kube` Handle Pay Overlay | ⚪ Planned |
| **Phase 6** | **Day 15** | End-to-End Flow Verification, Skeletons & Production Build | ⚪ Planned |

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js `v18.0.0` or higher
- MongoDB instance (Local or MongoDB Atlas)

### 1. Backend Installation & Launch
```bash
# Navigate to project root
cd adv_bank_system

# Install dependencies
npm install

# Configure environment variables (.env)
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/adv_bank_system
JWT_SECRET=your_super_secret_jwt_key

# Start development server
npm run dev
```

### 2. Frontend Installation & Launch
```bash
# Open a new terminal and navigate to frontend
cd adv_bank_system/frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Open **`http://localhost:5173`** (or port displayed by Vite) in your browser.

---

## 🛡️ Security & Resilience Features

- ✅ **SQL/NoSQL Injection Protection**: Strict Mongoose schema casting.
- ✅ **Cross-Origin Resource Sharing (CORS)**: Configured with `origin: true` & `credentials: true` for safe cookie transmission.
- ✅ **Password Hashing**: Cryptographic salt rounds via `bcryptjs`.
- ✅ **Token Blacklisting**: Revoked JWT tokens stored in Redis/MongoDB blacklist on logout.
- ✅ **Zero Re-Render Overhead**: Clean component architecture without unneeded mouse tracking or state bloat.

---

<p align="center">
  <b>Crafted by Arpit Prajapati</b><br/>
  🚀 <i>Built for Real-World Financial Systems Engineering</i>
</p>
