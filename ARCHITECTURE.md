# 🏛️ Kube Pay — Master Full-Stack & DevSecOps Architecture Blueprint
> **Enterprise Architecture Specification (v2.0)**  
> **Author:** Arpit Prajapati  
> **Target Platform:** AWS Elastic Kubernetes Service (EKS) • Hybrid Cloud

---

## 🌟 High-Level Architectural Topology

The following comprehensive architecture diagram illustrates the end-to-end journey of **Kube Pay**: from client interactions, financial transaction engine, and atomic database persistence to automated multi-stage DevSecOps pipelines, GitOps continuous deployment, and real-time cluster observability.

```mermaid
graph TB
    %% -------------------------------------------------------------
    %% CLIENT LAYER
    %% -------------------------------------------------------------
    subgraph CLIENT_TIER["📱 End-User & Client Interface Layer"]
        User["👤 Bank Customer / Mobile & Web"]
        ReactApp["⚛️ React 19.2 + Vite 8.2 Client<br/>• TailwindCSS v4 Quiet Luxury UI<br/>• Virtual RuPay 3D Parallax Card<br/>• Double-Entry Ledger UI Table<br/>• Idempotency UUID Generator"]
        AuthCtx["🛡️ AuthContext & Route Guards<br/>• HttpOnly Cookie Session Shield<br/>• Axios Interceptors withCredentials"]
        User -->|"HTTPS / User Actions"| ReactApp
        ReactApp --- AuthCtx
    end

    %% -------------------------------------------------------------
    %% INGRESS & NETWORKING
    %% -------------------------------------------------------------
    subgraph INGRESS_NET["🌐 Ingress, Reverse Proxy & Network Perimeter"]
        AWS_SG["🔒 AWS Security Group (navpay-devops-sg)<br/>Ports: 22, 31100, 31136, 32000, 30090, 8080, 9000"]
        NodePortFrontend["🚪 K8s NodePort Service: frontend<br/>Port: 80:31100/TCP"]
        NginxProxy["⚡ Nginx 1.31 Container Proxy<br/>• Static SPA File Server<br/>• Proxy Pass: /api ➔ backend:3000<br/>• CORS & Security Headers"]
        AuthCtx -->|"HTTP GET/POST :31100"| AWS_SG
        AWS_SG --> NodePortFrontend
        NodePortFrontend --> NginxProxy
    end

    %% -------------------------------------------------------------
    %% KUBERNETES MICROSERVICES
    %% -------------------------------------------------------------
    subgraph K8S_CLUSTER["☁️ AWS EKS Cluster (kubepay-cluster | ap-south-1)"]
        
        subgraph NS_KUBEPAY["☸️ Namespace: kubepay"]
            FrontendPods["🖥️ Frontend Pods (2 Replicas)<br/>Image: aruhehe/kubepay-frontend:TAG"]
            BackendSvc["🔌 K8s ClusterIP Service: backend<br/>Internal DNS: backend:3000"]
            BackendPods["⚙️ Backend Microservice (2 Replicas)<br/>Image: aruhehe/kubepay-backend:TAG<br/>Node.js + Express 5.2 Core"]
            K8sSecret["🔑 Kubernetes Secret: backend-secret<br/>(MONGO_URI, JWT_SECRET, OAuth Keys)"]
            
            NginxProxy --> FrontendPods
            FrontendPods -->|"Proxy API Calls"| BackendSvc
            BackendSvc --> BackendPods
            K8sSecret -.->|"Env Injection"| BackendPods
        end

        subgraph BACKEND_ENGINE["🧠 Financial Transaction & Security Engine"]
            AuthMiddleware["🔐 JWT Cookie Auth Middleware<br/>• Verify Signature<br/>• Token Blacklist DB Check"]
            IdempotencyEngine["🔁 Idempotency Guard<br/>• Client UUID Deduplication<br/>• In-flight Request Locking"]
            LedgerService["📊 Double-Entry Ledger Engine<br/>• Immutability Enforcement<br/>• Paired DEBIT / CREDIT Logs"]
            AtomicEngine["💳 ACID Transaction Coordinator<br/>• MongoDB Multi-Doc Sessions<br/>• Automatic Rollback on Failure"]
            EmailAlerts["📧 Transaction Notifier<br/>• Nodemailer + Google OAuth2"]

            BackendPods --- AuthMiddleware
            AuthMiddleware --> IdempotencyEngine
            IdempotencyEngine --> LedgerService
            LedgerService --> AtomicEngine
            AtomicEngine -.->|"Transaction Receipts"| EmailAlerts
        end

        subgraph GITOPS_ARGOCD["🐙 Namespace: argocd"]
            ArgoController["🔄 ArgoCD Controller v2.14<br/>• Automated Sync (prune + selfHeal)<br/>• GitOps Single Source of Truth"]
            ArgoUI["🖥️ ArgoCD Web UI<br/>NodePort: 31136 / HTTPS"]
            ArgoController --- ArgoUI
            ArgoController ==>|"Reconciles Live State"| NS_KUBEPAY
        end

        subgraph MONITORING_TIER["📊 Namespace: monitoring"]
            PromOperator["⚙️ Prometheus Operator<br/>• ServiceMonitor Auto-Discovery"]
            PromCore["🔥 Prometheus Core TSDB<br/>NodePort: 30090 / HTTP"]
            NodeExp["📈 Node Exporter (DaemonSet)<br/>Hardware Stats: CPU, RAM, Disk"]
            Grafana["📈 Grafana Analytics Dashboard<br/>NodePort: 32000 / HTTP<br/>Panels: Cluster, Namespace, Pods"]
            
            PromOperator --- PromCore
            PromCore -->|"Scrapes Metrics"| NodeExp
            PromCore -->|"Scrapes Microservices"| NS_KUBEPAY
            Grafana -->|"PromQL Queries"| PromCore
        end
    end

    %% -------------------------------------------------------------
    %% DATA PERSISTENCE
    %% -------------------------------------------------------------
    subgraph DATABASE_TIER["🗄️ Database & Persistence Tier (Cloud Hosted)"]
        MongoAtlas[("🍃 MongoDB Atlas 3-Node Replica Set<br/>cluster0.6cxh2kd.mongodb.net<br/>• ACID Transactions • SSL/TLS")]
        CollectionUsers["📁 users (Auth, Passwords, Salt)"]
        CollectionAccounts["📁 accounts (Balances, Account Numbers)"]
        CollectionLedger["📁 ledger_records (Debit/Credit Audit)"]
        CollectionIdempotency["📁 idempotency_keys (UUID Cache)"]
        CollectionBlacklist["📁 blacklisted_tokens (Revoked JWTs)"]

        AtomicEngine ==>|"ACID Multi-Doc Commit"| MongoAtlas
        MongoAtlas --- CollectionUsers
        MongoAtlas --- CollectionAccounts
        MongoAtlas --- CollectionLedger
        MongoAtlas --- CollectionIdempotency
        MongoAtlas --- CollectionBlacklist
    end

    %% -------------------------------------------------------------
    %% DEVSECOPS & CI/CD PIPELINE
    %% -------------------------------------------------------------
    subgraph CI_CD_TIER["🚀 DevSecOps Continuous Integration & Delivery"]
        Dev["👨‍💻 Platform Engineer (VS Code)"]
        GitHubRepo[("🐙 GitHub Monorepo (Advance_bank_system)<br/>Branch: main")]
        
        subgraph JENKINS_STACK["🏗️ Jenkins Automation Server (13.126.10.89)"]
            MasterController["🎮 Jenkins Controller v2.568<br/>Java 21 LTS • Systemd Daemon"]
            WorkerAgent["⚡ Build Agent (Node - 13.203.207.58)<br/>Java 21 • Docker Daemon • Trivy"]
            
            subgraph PIPELINE_CI["🔄 Pipeline: KubePay-CI"]
                S1["🧹 Workspace Cleanup"]
                S2["📥 Git Checkout (poll: false)"]
                S3["🔍 Trivy FS Scan"]
                S4["🛡️ SonarQube Code Analysis"]
                S5["🚦 Quality Gate Wait"]
                S6["📦 OWASP Dependency-Check (NVD XML)"]
                S7["🐳 Docker Build & Push"]
                S8["🔎 Trivy Container Image Scan"]
                S9["🚀 Trigger KubePay-CD"]
                
                S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7 --> S8 --> S9
            end

            subgraph PIPELINE_CD["🚀 Pipeline: KubePay-CD (GitOps Bump)"]
                CD1["📥 Clone Repo"]
                CD2["🔧 sed Bump Image Tags in k8s/*.yaml"]
                CD3["🛡️ Manifest Validation (grep)"]
                CD4["📝 Git Commit & Push [skip ci]"]
                CD5["📧 Gmail SMTP Deployment Alert"]
                
                CD1 --> CD2 --> CD3 --> CD4 --> CD5
            end

            MasterController --- WorkerAgent
            WorkerAgent --> PIPELINE_CI
            S9 ==>|"Triggers with TAG"| PIPELINE_CD
        end

        DockerHub[("🐳 DockerHub Container Registry<br/>• aruhehe/kubepay-backend:TAG<br/>• aruhehe/kubepay-frontend:TAG")]
        SonarServer["📊 SonarQube Server v10.x<br/>Static Code Analysis (:9000)"]
        GmailSMTP["📬 Google Gmail SMTP Server<br/>Port: 465 (SSL Authenticated)"]

        Dev -->|"git push origin main"| GitHubRepo
        GitHubRepo -->|"Webhook POST /github-webhook/"| MasterController
        S4 <-->|"Code Scan & Webhook"| SonarServer
        S7 -->|"docker push"| DockerHub
        CD4 -->|"Push Tag Updates [skip ci]"| GitHubRepo
        CD5 -->|"Sends Deployment Email"| GmailSMTP
        GitHubRepo ==>|"Pulls Desired Manifests"| ArgoController
    end

    %% -------------------------------------------------------------
    %% STYLING & CLASS DEFINITIONS
    %% -------------------------------------------------------------
    classDef client fill:#0ea5e9,stroke:#0369a1,stroke-width:2px,color:#ffffff;
    classDef ingress fill:#38bdf8,stroke:#0284c7,stroke-width:2px,color:#ffffff;
    classDef k8s fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#f8fafc;
    classDef engine fill:#334155,stroke:#64748b,stroke-width:2px,color:#f8fafc;
    classDef db fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff;
    classDef cicd fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#ffffff;
    classDef monitor fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#ffffff;

    class User,ReactApp,AuthCtx client;
    class AWS_SG,NodePortFrontend,NginxProxy ingress;
    class FrontendPods,BackendSvc,BackendPods,K8sSecret k8s;
    class AuthMiddleware,IdempotencyEngine,LedgerService,AtomicEngine,EmailAlerts engine;
    class MongoAtlas,CollectionUsers,CollectionAccounts,CollectionLedger,CollectionIdempotency,CollectionBlacklist db;
    class Dev,GitHubRepo,MasterController,WorkerAgent,PIPELINE_CI,PIPELINE_CD,DockerHub,SonarServer,GmailSMTP cicd;
    class PromOperator,PromCore,NodeExp,Grafana,ArgoController,ArgoUI monitor;
```

---

## 🔬 Tier-by-Tier Component Deep Dive

### 1. 📱 Client Interface Layer (React 19 + TailwindCSS v4)
- **Framework**: React 19.2 mounted with Vite 8.2 HMR bundler.
- **Aesthetic Identity**: Quiet Luxury Dark Theme (`#0A0C10`), radial lighting, and hairline borders (`rgba(255,255,255,0.08)`).
- **Core Interactive Features**:
  - `TiltCard.jsx`: Mathematical spring physics mapping mouse coordinates to 3D perspective transforms (`rotateX`, `rotateY`).
  - `TransferModal.jsx`: Client-side UUID generator (`crypto.randomUUID()`) creating unique transaction idempotency keys.
  - `TransactionLedger.jsx`: Real-time filterable audit trail mapping paired `DEBIT` and `CREDIT` records.
  - `AuthContext.jsx`: Zero-storage JWT architecture relying on secure HttpOnly cookies and credentials forwarding (`withCredentials: true`).

---

### 2. 🛡️ Financial Core & Banking Engine (Node.js + Express 5)
- **ACID Transaction Engine**: All balance modifications leverage native MongoDB replica set transactions (`session.withTransaction()`). A fund transfer deducts from the sender, credits the receiver, and writes double-entry records in a single atomic commit. Any network or DB failure immediately triggers an automatic rollback.
- **Idempotency Guard**: Prior to executing fund transfers, the engine checks `idempotency_keys`. If a duplicate key is detected within a 24-hour window, the cached transaction result is returned instantly without executing duplicate balance debits.
- **JWT Cookie Auth Shield**: JWT access tokens are signed using cryptographic secrets and delivered via `HttpOnly`, `SameSite: Lax` cookies. A persistent `blacklisted_tokens` collection validates session revocation on user logout.

---

### 3. ☁️ Cloud Infrastructure & Kubernetes Layer (AWS EKS)
- **EKS Cluster**: Managed Kubernetes `v1.32.13` control plane with OIDC-enabled IAM integration.
- **Compute Nodegroup**: Multi-AZ `t3.large` instances running Amazon Linux 2023 and `containerd` container runtime.
- **Namespace Architecture**:
  - `kubepay`: Isolated workload namespace housing frontend replicas, backend microservices, ClusterIP services, and secrets.
  - `argocd`: GitOps continuous delivery controllers and API servers.
  - `monitoring`: Full Prometheus operator, Alertmanager, Node Exporters, and Grafana.

---

### 4. 🚀 DevSecOps Continuous Integration (Jenkins CI)
- **Controller-Worker Topology**:
  - **Master (`13.126.10.89`)**: Lightweight scheduler running on Java 21 LTS with zero build execution overhead.
  - **Worker (`13.203.207.58`)**: Dedicated build agent with unlocked Docker socket and security scanner tooling.
- **Automated Security Gates**:
  - **Trivy**: Static filesystem vulnerability scanner checking dependencies and configurations.
  - **SonarQube**: Static code quality analysis verifying maintainability, test coverage, and security hotspots.
  - **OWASP Dependency-Check**: Vulnerability analysis powered by an authenticated NIST NVD API key, leveraging a persistent 292MB local database cache (`odc.mv.db`) for sub-3-second incremental scans.
  - **Trivy Container Scan**: Pre-deployment inspection of generated Docker image layers.

---

### 5. 🐙 Declarative GitOps Continuous Delivery (ArgoCD)
- **The Self-Healing Loop**: ArgoCD tracks the `k8s/` folder on GitHub `origin/main`. Any divergence between the desired state in Git and the actual state in the EKS cluster is reconciled automatically.
- **Infinite Loop Defense**:
  - Jenkins CD commits with `[skip ci]`.
  - Jenkins SCM configuration enforces `MessageExclusion: (?s).*\[skip ci\].*` and `PathRestriction: k8s/.*`.
  - In-pipeline checkouts explicitly declare `changelog: false, poll: false`, preventing secondary SCM webhook feedback triggers.

---

### 6. 📊 Full-Stack Observability & Metrics (Prometheus & Grafana)
- **Prometheus Operator**: Custom Resource Definitions (`ServiceMonitor`) discovering cluster metrics dynamically.
- **Node Exporter**: DaemonSet on each physical EC2 host capturing host-level CPU, RAM, disk I/O, and networking.
- **Grafana Live Dashboards**: NodePort `32000` analytics visualizing real-time pod health, request throughput, and resource limits.

---

## 🌐 Production Network & Port Topology

| Layer / Component | Host / Target | Port | Protocol | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Banking Application UI** | EKS Worker Nodes | `31100` | HTTP (NodePort) | Customer Facing Banking Web App |
| **ArgoCD Dashboard** | EKS Worker Nodes | `31136` | HTTPS (NodePort) | GitOps Release Reconciliation Console |
| **Grafana Analytics** | EKS Worker Nodes | `32000` | HTTP (NodePort) | Real-time Metrics Visualization |
| **Prometheus Core** | EKS Worker Nodes | `30090` | HTTP (NodePort) | Raw PromQL Query Engine & Targets |
| **Jenkins Automation** | Controller EC2 | `8080` | HTTP | CI/CD Pipeline Orchestrator |
| **SonarQube Server** | Controller EC2 | `9000` | HTTP | Code Quality & Security Inspection |
| **MongoDB Atlas** | AWS Managed VPC | `27017` | MongoDB+SRV | ACID Multi-Document Replica Set |
| **Gmail SMTP** | Google Cloud | `465` | SMTPS (SSL) | Automated Deployment & Security Emails |
