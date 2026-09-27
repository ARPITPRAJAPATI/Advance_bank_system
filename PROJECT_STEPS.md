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

### ⏳ Phase 7: GitOps CD with ArgoCD
- [x] Deploy ArgoCD on EKS (`kubectl apply -n argocd --server-side ...`)
- [x] Expose ArgoCD via NodePort (`443:31136/TCP`, accessed via worker node public IP)
- [ ] Add `k8s/` manifests to Git repo and push to `origin main`
- [ ] Create ArgoCD Application (`navpay`) pointing to `k8s/` directory

---

### ⏳ Phase 7: Jenkins CI/CD Pipeline
- [ ] Configure Jenkins credentials (DockerHub, GitHub, SonarQube token)
- [ ] Run CI Pipeline: Checkout ➔ Trivy FS ➔ OWASP ➔ SonarQube ➔ Docker Build & Push
- [ ] Run CD Pipeline: Update K8s manifests image tag ➔ Trigger GitOps auto-sync

---

### ⏳ Phase 8: Cluster Monitoring & Clean-Up
- [ ] Install Helm 3
- [ ] Deploy `kube-prometheus-stack` (Prometheus + Grafana) via Helm
- [ ] Expose Grafana on NodePort and view banking application metrics
- [ ] Teardown/Cleanup script to avoid unnecessary AWS charges
