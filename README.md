<h1 align="center">🏦 Advanced Banking Transaction System</h1>

<p align="center">
  <b>⚡ A Production-Grade Backend System for Secure Financial Transactions</b><br/>
  <i>Atomic Transfers • Ledger System • Idempotency • JWT Auth</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express.js-API-000000?style=for-the-badge&logo=express&logoColor=white"/>
  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white"/>
  <img src="https://img.shields.io/badge/JWT-Authentication-FF6B6B?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Mongoose-ODM-880000?style=for-the-badge"/>
</p>

---

## 🚀 Overview

A **production-ready banking backend system** designed to handle **secure, consistent, and scalable financial transactions**.

Unlike basic CRUD apps, this project focuses on **real-world system design concepts** like:

- 💰 Atomic Transactions (MongoDB Sessions)
- 📊 Double-Entry Ledger System
- 🔁 Idempotent APIs (No duplicate transactions)
- 🔐 Secure JWT Authentication with Blacklisting
- ⚡ Consistency & Fault Tolerance

---

## ⚙️ Tech Stack


Node.js • Express • MongoDB • Mongoose • JWT • Cookie Auth


---

## 🔥 Core Features

💳 Create & Manage Bank Accounts  
💸 Secure Money Transfers Between Accounts  
📊 Ledger-based Balance Calculation  
🔁 Idempotency Key for Safe Transactions  
🔐 JWT Authentication with Logout (Token Blacklist)  
⚡ MongoDB Transactions for Atomicity  

---

## 🧠 System Design

### 🔄 Transaction Flow


Client → API → Middleware → Controller → DB Transaction → Ledger → Response


---

### 📊 Double Entry Ledger System

Every transaction creates **2 entries**:


DEBIT → Sender Account
CREDIT → Receiver Account


👉 Ensures:
- Consistency
- Traceability
- Financial correctness

---

### 🔁 Idempotency Handling


Same Request (same idempotencyKey)
↓
Already Processed → No Duplicate Transaction


👉 Prevents:
- Double payment
- API retry issues

---

### 🔐 Authentication Flow


Login → JWT Token → Stored in Cookie
Logout → Token Blacklisted
Middleware → Reject Blacklisted Tokens


---

## 📡 API Endpoints

### 🔐 Auth

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout


### 💳 Accounts

POST /api/accounts
GET /api/accounts
GET /api/accounts/balance/:accountId


### 💸 Transactions

POST /api/transaction
POST /api/transaction/system/initial-funds


---

## ⚡ Quick Start

```bash
git clone https://github.com/ARPITPRAJAPATI/Advance_bank_system.git
cd Advance_bank_system
npm install
npm run dev
🔑 Environment Variables
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
PORT=3000
🧪 Edge Cases Handled

✔ Duplicate Transactions (Idempotency)
✔ Insufficient Balance
✔ Invalid Accounts
✔ Token Reuse after Logout
✔ Atomic DB Failures

🧠 Architecture Mindset
Routes      → API Endpoints  
Middleware  → Auth & Security  
Controllers → Business Logic  
Models      → DB Schema  
Ledger      → Financial Consistency  
💡 Why This Project?

Most beginner projects stop at CRUD.
This system goes deeper into:

Real-world financial system design
Data consistency & atomic operations
Secure authentication handling
Scalable backend architecture
🚀 Future Improvements
Docker & Deployment (CI/CD)
Rate Limiting & Security Enhancements
Monitoring & Logging
Microservices Architecture
👨‍💻 Author
<p align="center"> <b>Arpit Prajapati</b><br/> 🚀 Backend Developer | DevOps Enthusiast </p> <p align="center"> ⭐ Star this repo if you like it <br/> 💡 Built for real-world backend engineering </p> ```
