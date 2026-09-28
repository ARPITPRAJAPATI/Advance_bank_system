# 🚀 Kube Pay (Advance Banking System) — End-to-End DevOps & GitOps Execution Guide

This document maintains a live, chronological record of all architecture decisions, infrastructure setups, and deployment steps for deploying **Kube Pay** to AWS EKS with Jenkins CI/CD, SonarQube, Trivy, ArgoCD, and Prometheus/Grafana.

---

## 📌 Infrastructure & Node Inventory

| Machine | Role | Public IP | Private IP | Instance Type | OS | Security Group |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Jenkins Master** | Controller, SonarQube, eksctl | `13.126.10.89` | `172.31.3.251` | `t3.large` | Ubuntu 22.04 | `navpay-devops-sg` |
| **Jenkins Worker** | Build agent, Trivy, Docker builds | `13.203.207.58` | `172.31.12.152` | `t3.large` | Ubuntu 22.04 | `navpay-devops-sg` |
| **AWS Region** | ap-south-1 (Mumbai) | — | — | — | — | — |

---

## 🛠️ Step-by-Step Execution Log

### ✅ Phase 1: Security Group & Ports Configuration
- Created and attached security group `navpay-devops-sg` to both instances:
  - `22` (SSH Login)
  - `3000 - 10000` (Jenkins: 8080, SonarQube: 9000, Express: 3000, Vite: 5173)
  - `30000 - 32767` (K8s NodePort range for ArgoCD, Grafana, Microservices)
  - `465 / 25` (Email alerts)
  - `6443` (Kubernetes API server)
  - `6379` (Redis cache)
  - `80 / 443` (HTTP / HTTPS)

---

### ✅ Phase 2: Jenkins Master Setup
1. **SSH Connection**: Logged in via `ssh -i "bank-cicd.pem" ubuntu@13.126.10.89`.
2. **Java 21 Installation**:
   - Installed `openjdk-21-jre` and `openjdk-21-jdk` (Jenkins 2.568+ strictly requires Java 21+).
3. **Jenkins Controller Installation**:
   - Configured official repository with `jenkins.io-2026.key`.
   - Installed package `jenkins` (v2.568.3).
   - Enabled and started `jenkins.service` via systemd (`http://13.126.10.89:8080`).
4. **Docker & SonarQube Server**:
   - Installed `docker.io`.
   - Launched SonarQube container:
     ```bash
     docker run -itd --name SonarQube-Server -p 9000:9000 sonarqube:lts-community
     ```
   - Accessible at `http://13.126.10.89:9000`.

---

### ✅ Phase 3: Cluster CLI Tools on Master
1. **AWS CLI v2**:
   - Installed via official AWS bundle (`awscli-exe-linux-x86_64.zip`).
   - Configured credentials with `aws configure` targeting `ap-south-1`.
2. **Kubernetes Client (`kubectl`)**:
   - Installed latest stable binary into `/usr/local/bin/kubectl`.
3. **EKS Controller (`eksctl`)**:
   - Downloaded and installed latest release from official `eksctl-io/eksctl` repo.

---

### ✅ Phase 4: Jenkins Worker Agent Setup & Integration
1. **Installed Tools on Worker (`13.203.207.58`)**:
   - Installed `openjdk-21-jre` & `openjdk-21-jdk`.
   - Installed Docker (`docker.io`) & unlocked socket permissions (`chmod 666 /var/run/docker.sock`).
   - Installed modern Trivy scanner from official `get.trivy.dev` GPG repository.
2. **Master-to-Worker SSH Bridge**:
   - Generated 2048-bit Classic RSA PEM key on Master (`ssh-keygen -m PEM -t rsa -b 2048`).
   - Injected Master's public key into Worker's `~/.ssh/authorized_keys` with `chmod 600`.
   - Verified passwordless SSH connection: `ssh ubuntu@172.31.12.152` ➔ Success!
3. **Jenkins Agent Registration**:
   - Registered Permanent Agent named `Node` (2 executors, remote root `/home/ubuntu`).
   - Configured SSH Credentials with user `ubuntu` and Master's RSA private key.
   - Set Host Key Verification to `Non verifying Verification Strategy`.
   - Node status: **Agent successfully connected and online**!

---

### ✅ Phase 5: Jenkins Plugins & SonarQube Security Integration
1. **Installed Jenkins Plugins**:
   - `OWASP Dependency-Check`
   - `SonarQube Scanner`
   - `Docker Pipeline`
   - `Pipeline: Stage View`
2. **SonarQube Token & Webhook Handshake**:
   - Generated User Analysis Token in SonarQube (`squ_f0828d9bb3c3323faa34827e32cf0075dd45806a`).
   - Saved in Jenkins Credentials as Secret Text with ID `sonar-token`.
   - Configured Webhook in SonarQube pointing to `http://172.31.3.251:8080/sonarqube-webhook/`.
3. **Jenkins Global System & Tool Configuration**:
   - Linked SonarQube Server in Jenkins System (`Sonar` ➔ `http://172.31.3.251:9000`).
   - Configured SonarQube Scanner automatic installer (`Sonar`) under Global Tools.
   - Configured OWASP Dependency-Check automatic installer (`OWASP`) under Global Tools.

---

### ✅ Phase 6: AWS EKS Cluster Provisioning
1. **Control Plane (`kubepay-cluster`)**:
   - Provisioned managed Kubernetes `v1.32.13` control plane in `ap-south-1`.
   - Associated IAM OIDC Provider for Kubernetes service accounts.
2. **Managed Nodegroup (`kubepay-nodes`)**:
   - Provisioned 2-node managed nodegroup (`t3.large`, 29GB gp3 storage).
   - Both nodes registered & online:
     - `ip-192-168-30-149.ap-south-1.compute.internal` (Ready, v1.32.13)
     - `ip-192-168-53-55.ap-south-1.compute.internal` (Ready, v1.32.13)

---

### ✅ Phase 7: GitOps Continuous Delivery with ArgoCD
1. **ArgoCD Deployment on EKS**:
   - Installed official ArgoCD v2.14 manifest using server-side apply:
     ```bash
     kubectl create namespace argocd
     kubectl apply -n argocd --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
     ```
2. **Expose ArgoCD Server**:
   - Patched `argocd-server` service to NodePort:
     ```bash
     kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort", "ports": [{"port": 80, "targetPort": 8080, "nodePort": 31539}, {"port": 443, "targetPort": 8080, "nodePort": 31136}]}}'
     ```
   - Dashboard Accessible at: `https://13.232.59.33:31136` (Username: `admin`).
3. **Manifests & GitOps Secret Hygiene**:
   - Added production manifests in `k8s/`: `namespace.yaml`, `backend-deployment.yaml`, `backend-service.yaml`, `frontend-deployment.yaml`, `frontend-service.yaml`.
   - Renamed example secret to `k8s/backend-secret.example` to prevent ArgoCD from applying placeholder credentials.
   - Applied real MongoDB Atlas secret directly to `kubepay` namespace out-of-band:
     ```bash
     kubectl apply -f k8s/backend-secret.yaml
     ```
4. **ArgoCD Application Creation (`navpay`)**:
   - Automated sync policy enabled with `prune: true` and `selfHeal: true`.
   - Watches `https://github.com/ARPITPRAJAPATI/Advance_bank_system.git`, path: `k8s/`.
   - Status: **`Synced` & `Healthy`** 🟢.

---

### ✅ Phase 8: End-to-End Enterprise CI/CD Pipelines (Jenkins)
1. **Jenkins Credentials Configured**:
   - `docker` (DockerHub PAT for user `aruhehe`)
   - `sonar-token` (SonarQube analysis token `squ_f0828d9...`)
   - `github` (GitHub Classic PAT with repo scope for automated GitOps commits)
   - `worker-ssh-key` (Slave agent authentication)
2. **CI Pipeline (`KubePay-CI`)**:
   - Stages: Workspace Cleanup ➔ Git Checkout (poll: false) ➔ Trivy Filesystem Scan ➔ SonarQube Analysis ➔ Quality Gate Wait ➔ OWASP Dependency-Check (NVD XML format) ➔ Docker Build & Push (`backend:TAG`, `frontend:TAG`) ➔ Trivy Container Scan ➔ Trigger CD Pipeline.
   - Security Integration: NVD API Key `85E00693-...` configured to cache 292MB CVE database locally on worker node (`/home/ubuntu/tools/.../OWASP/data/odc.mv.db`), reducing scan time from minutes to 3 seconds.
3. **CD Pipeline (`KubePay-CD`)**:
   - Clones GitOps repo, updates deployment image tags via `sed`, verifies manifest integrity via `grep`, commits with `[skip ci]`, and pushes to GitHub `main` for ArgoCD reconciliation.
4. **GitOps Infinite Loop Prevention**:
   - Configured Git SCM `MessageExclusion` with pattern `(?s).*\[skip ci\].*`.
   - Configured `PathRestriction` on `k8s/.*`.
   - Added `changelog: false, poll: false` to in-pipeline checkout stages to prevent secondary SCM registration.
   - Webhook auto-triggers on code changes, but automatically suppresses builds on GitOps version bumps.
5. **Automated Email Notifications**:
   - Configured Jenkins Master with Gmail SMTP (`smtp.gmail.com:465`, SSL enabled) using Google App Passwords.
   - Automated HTML deployment summaries delivered directly to `arpitprajapati2005@gmail.com`.

---

### ✅ Phase 9: Cluster Monitoring & Observability (Prometheus & Grafana)
1. **Helm 3 Installation**:
   - Installed Helm 3 CLI client on Master EC2 (`curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash`).
2. **Deploy Prometheus Community Stack**:
   - Added official Helm repo:
     ```bash
     helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
     helm repo update
     helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
     ```
   - Automatically provisions Prometheus Operator, AlertManager, Node Exporter DaemonSets, and Grafana.
3. **Expose Monitoring Dashboards via NodePort**:
   - Grafana exposed on NodePort `32000`:
     ```bash
     kubectl patch svc prometheus-grafana -n monitoring -p '{"spec": {"type": "NodePort", "ports": [{"port": 80, "targetPort": 3000, "nodePort": 32000}]}}'
     ```
   - Prometheus Server exposed on NodePort `30090`:
     ```bash
     kubectl patch svc prometheus-kube-prometheus-prometheus -n monitoring -p '{"spec": {"type": "NodePort", "ports": [{"port": 9090, "targetPort": 9090, "nodePort": 30090}]}}'
     ```
4. **Live Observability Verification**:
   - Retrieved Grafana admin credentials via Kubernetes secret:
     ```bash
     kubectl get secret --namespace monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode
     ```
   - Verified live metrics scraping across nodes, pods in `kubepay` namespace, and cluster resource utilization.

---

## 🌐 Live Production Endpoints & Access Directory

| Service | Access URL | Port / Protocol | Credentials / Notes |
| :--- | :--- | :--- | :--- |
| **Kube Pay Banking App** | `http://13.232.59.33:31100` | NodePort `31100` / HTTP | Full-Stack UI (Register, Login, Transfers) |
| **Jenkins Controller** | `http://13.126.10.89:8080` | Port `8080` / HTTP | CI/CD Pipelines (`KubePay-CI`, `KubePay-CD`) |
| **SonarQube Server** | `http://13.126.10.89:9000` | Port `9000` / HTTP | Static Code Analysis & Quality Gate |
| **ArgoCD Dashboard** | `https://13.232.59.33:31136` | NodePort `31136` / HTTPS | User: `admin` (Syncs GitHub `k8s/` to EKS) |
| **Grafana Dashboard** | `http://13.232.59.33:32000` | NodePort `32000` / HTTP | User: `admin`, Password in Kubernetes Secret |
| **Prometheus Server** | `http://13.232.59.33:30090` | NodePort `30090` / HTTP | Raw PromQL Metrics & Target Status |
| **Alternative EKS Node** | `http://13.127.50.2:31100` | NodePort `31100` / HTTP | Redundant node endpoint for banking app |

