# 🎨 Kube Pay Frontend — Client Web Application

<p align="center">
  <b>Quiet Luxury Dark Banking Interface & Financial Dashboard</b><br/>
  <i>React 19.2 • Vite 8.2 • TailwindCSS v4 • Lucide Icons • Glassmorphism • Nginx Reverse Proxy</i>
</p>

---

## 📌 Overview

The **Kube Pay Frontend** is a modern, high-performance financial client engineered with a focus on tactile micro-interactions, bank-level security, and aesthetic luxury. 

Built using **React 19.2** and **TailwindCSS v4**, it avoids generic templated UI patterns, utilizing a curated dark palette (`#0A0C10`), bespoke hairline glass borders, physical spring physics on debit card mockups, and real-time ledger updates.

---

## 🛠️ Technology Stack

| Library / Tool | Version | Purpose in Application |
| :--- | :---: | :--- |
| **React** | `19.2` | Core component UI library and state architecture |
| **Vite** | `8.2` | Lightning-fast development server & optimized production rollup bundler |
| **Tailwind CSS** | `v4` | Modern CSS-first utility framework for bespoke styling |
| **React Router** | `v7` | Client-side routing, protected auth guards (`PrivateRoute`), and redirects |
| **Axios** | `1.19` | Centralized HTTP client configured with CORS `withCredentials: true` |
| **Lucide React** | `^1.0` | Minimalist stroke iconography for banking controls |
| **Nginx** | `1.31` | Production reverse proxy container handling `/api` routing |

---

## 🏛️ Directory Structure

```text
frontend/
├── public/                     # Static icons, favicon, branding assets
├── src/
│   ├── assets/                 # SVGs and UI graphics
│   ├── components/             # Reusable UI primitives
│   │   ├── AccountCard.jsx     # Virtual Platinum RuPay debit card with 3D tilt
│   │   ├── Button.jsx          # Tactile banking button with loading states
│   │   ├── Navbar.jsx          # Glassmorphic top navigation with auth switcher
│   │   ├── TiltCard.jsx        # Mouse parallax 3D spring tilt effect wrapper
│   │   ├── TransactionLedger.jsx # Double-entry ledger audit table with filters
│   │   └── TransferModal.jsx   # Fund transfer dialog with idempotency key generation
│   ├── context/
│   │   └── AuthContext.jsx     # Centralized user state, login/logout, and cookie sync
│   ├── pages/
│   │   ├── Dashboard.jsx       # Main banking dashboard (Net worth, accounts, ledger)
│   │   ├── Landing.jsx         # Marketing landing page with interactive 3D card
│   │   ├── Login.jsx           # Secure authentication portal
│   │   └── Register.jsx        # Account registration with live validation feedback
│   ├── services/
│   │   └── api.js              # Axios instance configured with backend baseURL
│   ├── App.jsx                 # Route declarations and Context providers
│   ├── main.jsx                # React root mount
│   └── index.css               # Global TailwindCSS v4 imports & theme tokens
├── nginx.conf                  # Production Nginx reverse proxy configuration
├── Dockerfile                  # Multi-stage Docker build (Node.js build ➔ Nginx runtime)
└── package.json                # Frontend dependencies and build scripts
```

---

## 💎 Design System & Aesthetic Principles

### 1. Quiet Luxury Color System
- **Background Primary**: `#0A0C10` (Deep obsidian dark)
- **Card Surface**: `rgba(18, 22, 31, 0.7)` (Smoked glassmorphism)
- **Hairline Border**: `rgba(255, 255, 255, 0.08)` (Ultra-subtle structure)
- **Accent Glow**: `rgba(14, 165, 233, 0.15)` (Cyan ambient light)
- **Typography**: Modern variable sans-serif with tight tracking on headings

### 2. Micro-Interactions
- **3D Card Parallax**: The Virtual RuPay Platinum card responds to user cursor position in real time using 3D perspective transformations (`rotateX`, `rotateY`).
- **Idempotency Feedback**: Fund transfer submits generate an in-flight client UUID to prevent accidental double-clicks.
- **Form State Validation**: Visual indicators for password requirements, email syntax, and real-time balance thresholds.

---

## ⚡ Local Development

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Create `.env` in `frontend/`:
```env
VITE_API_URL=http://localhost:3000/api
```

### 3. Run Development Server
```bash
npm run dev
```
Accessible at: `http://localhost:5173` (or as displayed in your terminal).

---

## 🐳 Production Containerization (Docker + Nginx)

The frontend is packaged using a multi-stage Docker build:
1. **Stage 1 (Builder)**: Compiles React 19 JSX and Vite assets into static bundles in `/dist`.
2. **Stage 2 (Runtime)**: Injects static files into a hardened `nginx:alpine` image.
3. **Nginx Reverse Proxy**:
   - Serves React SPA files on port `80`.
   - Proxies `/api/` traffic directly to internal Kubernetes backend service `http://backend:3000`.

```bash
# Build standalone Docker image
docker build -t aruhehe/kubepay-frontend:latest .

# Run locally
docker run -p 80:80 aruhehe/kubepay-frontend:latest
```
