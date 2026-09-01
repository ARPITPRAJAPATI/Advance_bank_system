<h1 align="center">✦ Kube Pay — Advanced Banking System</h1>

<p align="center">
  <b>Enterprise-Grade Banking Platform & Financial Transaction System</b><br/>
  <i>Atomic Ledger Operations • Idempotency Engine • JWT Cookie Shield • Modern Luxury UI • DevOps & Cloud Native</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/TailwindCSS-v4.3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white"/>
  <img src="https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express-v5.2-000000?style=for-the-badge&logo=express&logoColor=white"/>
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white"/>
  <img src="https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>
  <img src="https://img.shields.io/badge/Jenkins-CI%2FCD-D24939?style=for-the-badge&logo=jenkins&logoColor=white"/>
  <img src="https://img.shields.io/badge/Terraform-IaC-844FBA?style=for-the-badge&logo=terraform&logoColor=white"/>
</p>

---

## 📌 Executive Overview

**Kube Pay** (Advanced Banking System) is a production-grade, full-stack financial application engineered for ultra-high consistency, bank-level security, quiet luxury dark aesthetics, and enterprise DevOps automation. 

Unlike conventional CRUD applications, **Kube Pay** is architected around core **Distributed Systems & Financial Engineering** principles:
- 💳 **Atomic DB Transactions**: Multi-document MongoDB ACID sessions guarantee that funds are never lost or partially transferred.
- 📊 **Double-Entry Ledger Architecture**: Every transfer generates paired `DEBIT` and `CREDIT` records ensuring zero net-loss auditability.
- 🔁 **Idempotent API Engine**: Guaranteed single execution via UUID idempotency keys to eliminate duplicate debits from network retries or double-clicks.
- 🔒 **HttpOnly Cookie Auth Shield**: JWT authentication powered by automatic cookie persistence and server-side token blacklisting.
- ✨ **Quiet Luxury Design System**: React 19 + TailwindCSS v4 frontend featuring glassmorphism cards, dynamic 3D tilt interaction, and zero-latency UI responsiveness.
- 🚢 **DevOps & Cloud-Native Ready**: Fully containerized with multi-stage Docker builds, Nginx reverse proxy, Jenkins CI/CD pipeline (with SonarQube, OWASP & Trivy scans), and AWS EC2 provisioning with Terraform.

---

## 🛠️ Full-Stack Technology Stack

| Domain | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Client Core** | **React 19.2 + Vite 8.2** | Ultra-fast HMR, optimized component tree, modular clean architecture |
| **Styling & UI** | **Tailwind CSS v4 + Custom Glassmorphism** | Custom dark theme (`#0A0C10`), glass cards, radial glares, 3D tilt effects |
| **Icons & Motion** | **Lucide Icons + Custom CSS Keyframes** | Modern minimalist iconography, floating 3D cards, smooth spring transitions |
| **State & Router** | **React Router v7 + Context API** | `AuthContext` persistent session management & `PrivateRoute` route guards |
| **HTTP Client** | **Axios 1.19** | Centralized interceptors, automated error mapping & CORS `withCredentials` support |
| **Server Engine** | **Node.js + Express 5.2** | RESTful services, strict input validation, cookie parsers, CORS credentials |
| **Database** | **MongoDB + Mongoose 9.8** | Atomic Session Transactions (ACID), Schema Validation, Ledger models |
| **Security** | **JWT + Bcrypt.js + Token Blacklist** | Cryptographic hashing, HTTP-Only secure cookies, blacklisted token tracking |
| **DevOps & CI/CD** | **Docker + Jenkins + SonarQube + Trivy** | Automated security scanning, quality gates, multi-container Docker Compose |
| **Infrastructure** | **Terraform (AWS)** | Automated AWS EC2 infrastructure provisioning as code |

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
├── frontend/                     # Client Web Application (React 19 + Vite)
│   ├── public/                   # Static assets & favicon
│   ├── src/
│   │   ├── assets/               # Branding assets
│   │   ├── components/           # Reusable UI Components
│   │   │   ├── Button.jsx        # Production-grade button primitive
│   │   │   ├── Input.jsx         # Controlled form input helper
│   │   │   ├── Navbar.jsx        # Sticky glassmorphic navbar
│   │   │   └── TiltCard.jsx      # 3D parallax mouse-tilt card primitive
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Global user state & session persistence
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx   # Luxury landing page with 3D interactive preview
│   │   │   ├── LoginPage.jsx     # Glassmorphic login authentication
│   │   │   ├── RegisterPage.jsx  # Glassmorphic registration form
│   │   │   └── DashboardPage.jsx # Full-featured banking dashboard
│   │   ├── routes/
│   │   │   └── PrivateRoute.jsx  # Protected route guard
│   │   ├── services/
│   │   │   ├── api.js            # Axios client with interceptors & base config
│   │   │   ├── auth.service.js   # Auth API handlers (Login, Register, Logout)
│   │   │   ├── account.service.js# Bank account CRUD endpoints
│   │   │   └── transaction.service.js # Money transfer endpoints
│   │   ├── App.jsx               # React Router configuration
│   │   ├── index.css             # Tailwind v4 directives, custom styles & 3D keyframes
│   │   └── main.jsx              # React DOM root entry
│   ├── Dockerfile                # Multi-stage frontend Docker build with Nginx
│   ├── nginx.conf                # Nginx reverse proxy configuration
│   ├── package.json              # Frontend dependencies & scripts
│   └── vite.config.js            # Vite proxy & Tailwind plugin setup
│
├── src/                          # Express REST API Backend
│   ├── controllers/              # Auth, Account & Transaction controllers
│   ├── db/                       # MongoDB database connection
│   ├── middleware/               # Auth middleware & token verification
│   ├── models/                   # User, Account, Transaction & Blacklist schemas
│   ├── routes/                   # Auth, Account & Transaction express routers
│   ├── services/                 # Email service (OAuth2) & helper utilities
│   └── app.js                    # Express app configuration & CORS setup
│
├── terraform/                    # Infrastructure as Code (AWS EC2)
│   ├── ec2.tf                    # EC2 instance & security groups
│   ├── terraform.tf              # AWS provider configuration
│   └── variables.tf              # Configurable deployment variables
│
├── docker-compose.yml            # Multi-container orchestration (Backend + Frontend)
├── Dockerfile                    # Node.js backend Docker container
├── jenkins                       # Jenkins declarative CI/CD pipeline
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
| `POST` | `/api/transaction/system/initial-funds` | Deposit initial test balance into account | ✅ |

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js `v18.0.0` or higher
- MongoDB instance (Local or MongoDB Atlas)
- Docker & Docker Compose (Optional for containerized run)

### Option 1: Running Locally (Development Mode)

#### 1. Backend Setup
```bash
# Navigate to project root
cd adv_bank_system

# Install dependencies
npm install

# Configure environment variables (.env)
# Create a .env file with:
PORT=3000
MONGO_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/bank-system"
JWT_SECRET="your_jwt_secret_key"
EMAIL_USER="your_email@gmail.com"
CLIENT_ID="your_google_client_id"
CLIENT_SECRET="your_google_client_secret"
REFRESH_TOKEN="your_google_refresh_token"

# Start development server
npm run dev
```

#### 2. Frontend Setup
```bash
# Open a new terminal and navigate to frontend
cd adv_bank_system/frontend

# Install dependencies
npm install

# Configure frontend environment (.env)
VITE_API_URL=http://localhost:3000/api

# Start Vite dev server
npm run dev
```
Open **`http://localhost:8000`** (or port specified in terminal) in your browser.

---

### Option 2: Running with Docker Compose

Run the entire application stack (Frontend + Backend + Reverse Proxy) with a single command:

```bash
# Build and run all containers
docker-compose up --build -d

# Check running containers
docker-compose ps

# Stop containers
docker-compose down
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`

---

## 🚀 CI/CD & DevOps Pipeline (Jenkins)

The project includes an enterprise declarative Jenkins pipeline (`jenkins`) covering:

1. **Parameter Validation**: Enforces mandatory Docker tag arguments.
2. **Code Checkout**: Clones source repository cleanly.
3. **Security Scans**:
   - **Trivy**: Comprehensive filesystem vulnerability scan.
   - **OWASP Dependency-Check**: Vulnerability analysis of third-party dependencies.
4. **Code Quality**:
   - **SonarQube Analysis & Quality Gates**: Enforces strict static code analysis and test metrics.
5. **Environment Configuration**: Automated environment setup scripts for backend & frontend.
6. **Containerization**:
   - Builds optimized Docker images for frontend and backend.
   - Pushes signed images to Docker Hub.
7. **Automated CD Trigger**: Triggers downstream deployment jobs upon pipeline success.

---

## 🛡️ Security & Resilience Features

- ✅ **ACID Transactions**: MongoDB session-based transfers preventing partial debits or balance inconsistencies.
- ✅ **Idempotency Guarantee**: Unique transaction tokens preventing double debits from repeated requests.
- ✅ **HttpOnly Cookies**: Prevents client-side XSS attacks from reading access tokens.
- ✅ **Token Blacklisting**: Revoked JWT tokens stored on logout to prevent reuse.
- ✅ **Password Hashing**: Secure salted hashes via `bcryptjs`.
- ✅ **CORS & Proxy Security**: Whitelisted origin matching with credential forwarding.
- ✅ **Input Validation**: Sanitized schema models rejecting invalid inputs.

---

## 🗺️ Feature Status

| Feature / Module | Status |
| :--- | :---: |
| Backend Express REST API & Mongoose ACID Sessions | 🟢 Completed |
| Double-Entry Ledger System & Idempotency Engine | 🟢 Completed |
| JWT Authentication & HttpOnly Cookie Management | 🟢 Completed |
| Token Blacklist & Session Revocation | 🟢 Completed |
| Quiet Luxury Dark Theme Design System (`#0A0C10`) | 🟢 Completed |
| 3D Interactive Parallax Tilt Card Component (`TiltCard.jsx`) | 🟢 Completed |
| Landing Page with Interactive 3D Device & Card Mockup | 🟢 Completed |
| Glassmorphic Login & Register Pages with Live Feedback | 🟢 Completed |
| Interactive Dashboard with Net Worth & Account Switcher | 🟢 Completed |
| Atomic Fund Transfer Modal with Idempotency Key Generation | 🟢 Completed |
| Live Filterable Transaction History Ledger | 🟢 Completed |
| Realistic Virtual Platinum RuPay Debit Card Interface | 🟢 Completed |
| Multi-Stage Docker Containerization & Nginx Reverse Proxy | 🟢 Completed |
| Jenkins Declarative CI/CD Pipeline (SonarQube + Trivy + OWASP) | 🟢 Completed |
| Terraform AWS Infrastructure Automation | 🟢 Completed |

---

<p align="center">
  <b>Crafted with ❤️ by Arpit Prajapati</b><br/>
  🚀 <i>Built for Real-World Financial Systems Engineering & Cloud-Native Scale</i>
</p>
