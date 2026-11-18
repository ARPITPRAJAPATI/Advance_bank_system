# 🚀 KubePay: End-to-End DevOps, GitOps & Cloud Engineering Blueprint
> **Project Name:** KubePay (Advanced Core Banking System)  
> **Target Cloud:** AWS Elastic Kubernetes Service (EKS) • Region: `ap-south-1` (Mumbai)  
> **Architecture Style:** Declarative GitOps, Multi-Stage DevSecOps, Master-Worker CI/CD, Container Observability  
> **Author:** Arpit Prajapati

---

## 📌 1. Infrastructure & Node Inventory

Production environment mein resources ko do alag-alag machines aur ek managed Kubernetes cluster mein baanta gaya hai:

| Machine / Resource | Role / Responsibility | Public IP | Private IP | Instance Type | OS / Specs | Security Group |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Jenkins Master** | Controller, SonarQube Container, `eksctl`, `kubectl` | `13.126.10.89` | `172.31.3.251` | `t3.large` | Ubuntu 22.04 LTS (2 vCPU, 8GB RAM) | `navpay-devops-sg` |
| **Jenkins Worker** | Dedicated Build Node, Trivy Scanner, Docker Build/Push | `13.203.207.58` | `172.31.12.152` | `t3.large` | Ubuntu 22.04 LTS (2 vCPU, 8GB RAM) | `navpay-devops-sg` |
| **EKS Control Plane** | AWS Managed Kubernetes Master (`v1.32.13`) | Managed by AWS | VPC Peered | Highly Available | Multi-AZ Control Plane | Managed by AWS |
| **EKS Worker Node 1** | Runs Frontend, Backend, ArgoCD, Monitoring Pods | `13.232.59.33` | `192.168.30.149` | `t3.large` | Amazon Linux 2 / Ubuntu (29GB gp3) | EKS Node SG |
| **EKS Worker Node 2** | Redundant Node for High Availability (Failover) | `13.127.50.2` | `192.168.53.55` | `t3.large` | Amazon Linux 2 / Ubuntu (29GB gp3) | EKS Node SG |

---

## 🗺️ 2. End-to-End DevOps & GitOps Execution Pipeline

```text
[👨‍💻 Developer Push] ──▶ [🐙 GitHub (origin/main)]
                                │
                                ▼ (Webhook Trigger)
               [🏗️ Jenkins Master Controller (13.126.10.89)]
                                │
                   (SSH Delegation to Agent 'Node')
                                ▼
               [⚡ Jenkins Worker Agent (13.203.207.58)]
                                │
    ┌───────────────────────────┴───────────────────────────┐
    │  STAGE 1: Workspace Cleanup (cleanWs)                 │
    │  STAGE 2: Git Code Checkout (poll: false)             │
    │  STAGE 3: Trivy Filesystem Scan (Source Code Audit)   │
    │  STAGE 4: SonarQube Static Analysis (Code Quality)    │
    │  STAGE 5: Quality Gate Wait (Pass/Fail Decision)      │
    │  STAGE 6: OWASP Dependency-Check (NVD XML Database)   │
    │  STAGE 7: Docker Build & Push (aruhehe/kubepay-*:TAG) │
    │  STAGE 8: Trivy Container Image Scan (OS CVE Audit)   │
    │  STAGE 9: Trigger Downstream CD Job (KubePay-CD)      │
    └───────────────────────────┬───────────────────────────┘
                                │
                                ▼
               [🚀 Pipeline 2: KubePay-CD (GitOps Auto-Bumper)]
                                │
                • Clones Repo
                • Uses `sed` to update tags in k8s/*.yaml
                • Commits & Pushes to GitHub with `[skip ci]`
                                │
                                ▼
               [🐙 ArgoCD Controller (Running inside AWS EKS)]
                                │
                • Detects Manifest Diff in GitHub k8s/
                • Executes Zero-Downtime Rolling Update
                • Reconciles Live Pods to Match Git State
                                │
                                ▼
               [☸️ AWS EKS Cluster (Namespace: kubepay)]
                • Frontend Pods (React 19 + Nginx)
                • Backend Microservices (Node.js 20 + Express 5)
                                │
                                ▼
               [📊 Observability Stack (monitoring)]
                • Prometheus Core TSDB (:30090)
                • Grafana Dashboards (:32000)
```

---

## 🛠️ 3. Step-by-Step Execution Guide (Phases 1 to 9)

---

### ✅ Phase 1: Security Groups & Networking (Firewall Rules)
* **Objective (Maksad):** AWS par servers launch karne se pehle zaroori ports kholna taaki services aapas mein aur internet se communicate kar sakein.
* **Security Group Name:** `navpay-devops-sg`

| Port / Range | Protocol | Purpose / Kiske Liye Kholna Hai? |
| :--- | :---: | :--- |
| `22` | TCP | SSH Terminal Login (Master & Worker machines ko access karne ke liye). |
| `80` / `443` | TCP | Standard HTTP / HTTPS traffic. |
| `8080` | TCP | **Jenkins Master Web UI** Dashboard. |
| `9000` | TCP | **SonarQube Server** Dashboard & Webhooks. |
| `3000` | TCP | Backend Express API (Local/Direct testing). |
| `5173` | TCP | Frontend Vite Dev Server. |
| `6443` | TCP | **Kubernetes API Server** (`kubectl` commands ko cluster tak bhejne ke liye). |
| `30000 - 32767`| TCP | **Kubernetes NodePort Range** (ArgoCD: `31136`, Frontend: `31100`, Prometheus: `30090`, Grafana: `32000`). |
| `465` / `25` | TCP | Gmail SMTP Email Notifications bhejne ke liye. |

---

### ✅ Phase 2: Jenkins Master Setup & SonarQube Container
* **Objective (Maksad):** Central Controller tayyar karna jo build pipelines manage karega aur code quality test karega.
* **Host Machine:** `13.126.10.89`

#### 1. Java 21 Installation (Jenkins Requirement):
```bash
sudo apt update -y
sudo apt install -y openjdk-21-jre openjdk-21-jdk
java -version
```
> 💡 *Note:* Modern Jenkins (v2.568+) strictly Java 21 ya uske upar hi chalta hai. Purana Java 11 ya 17 fail ho jata hai.

#### 2. Jenkins Controller Installation:
```bash
# Add Jenkins GPG Key
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key

# Add Jenkins Repository
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/ | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

# Install and Start Jenkins Service
sudo apt update -y
sudo apt install -y jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins
```
* **Verify:** Browser mein `http://13.126.10.89:8080` kholein aur initial admin password enter karein:
  `sudo cat /var/lib/jenkins/secrets/initialAdminPassword`

#### 3. Docker & SonarQube Server Container:
```bash
# Install Docker on Master
sudo apt install -y docker.io
sudo usermod -aG docker ubuntu
sudo chmod 666 /var/run/docker.sock

# Launch SonarQube LTS Community Container
docker run -itd --name SonarQube-Server -p 9000:9000 sonarqube:lts-community
```
* **Verify:** Browser mein `http://13.126.10.89:9000` kholein (Default user: `admin`, password: `admin`).

---

### ✅ Phase 3: Cluster Management CLI Tools on Master
* **Objective (Maksad):** Jenkins Master machine par tools dalna taaki terminal se AWS aur Kubernetes manage ho sake.

#### 1. AWS CLI v2:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt install -y unzip
unzip awscliv2.zip
sudo ./aws/install
aws --version
```
* **Configure Credentials:** `aws configure` chalayein aur Access Key, Secret Key aur Region (`ap-south-1`) set karein.

#### 2. Kubernetes CLI (`kubectl`):
```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
kubectl version --client
```

#### 3. EKS CLI Controller (`eksctl`):
```bash
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
eksctl version
```

---

### ✅ Phase 4: Jenkins Worker Agent Setup (Master-Worker SSH Bridge)
* **Objective (Maksad):** Master machine ko build load se bachana. Ek dedicated Worker machine (`13.203.207.58`) banana jo saare heavy tasks karegi.

#### 1. Worker Node par Tools Install Karna (`13.203.207.58`):
```bash
sudo apt update -y
sudo apt install -y openjdk-21-jre openjdk-21-jdk docker.io
sudo chmod 666 /var/run/docker.sock

# Install Modern Trivy Vulnerability Scanner
sudo apt-get install wget apt-transport-https gnupg lsb-release -y
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update -y
sudo apt-get install trivy -y
```

#### 2. Master-to-Worker Passwordless SSH Bridge Banana:
* **Master par key generate karo:**
  ```bash
  ssh-keygen -m PEM -t rsa -b 2048 -f ~/.ssh/worker-key
  ```
* **Master ki public key (`worker-key.pub`) ko Worker ke `~/.ssh/authorized_keys` mein daalo:**
  ```bash
  chmod 600 ~/.ssh/authorized_keys
  ```
* **Master se test karo:**
  `ssh -i ~/.ssh/worker-key ubuntu@172.31.12.152` ➔ Success!

#### 3. Jenkins UI mein Agent Register Karna:
* **Manage Jenkins $\rightarrow$ Nodes $\rightarrow$ New Node**:
  - Name: `Node`
  - Number of executors: `2`
  - Remote root directory: `/home/ubuntu`
  - Labels: `Node` (Yahi label `Jenkinsfile` ki line 2 mein use hua hai!)
  - Launch method: *Launch agents via SSH*
    - Host: `172.31.12.152` (Worker Private IP)
    - Credentials: SSH Private Key (Paste Master's `worker-key`)
    - Host Key Verification Strategy: *Non-verifying Verification Strategy*
* **Status:** Click **Launch Agent** ➔ **`Agent successfully connected and online`** 🟢.

---

### ✅ Phase 5: Jenkins Plugins, Credentials & SonarQube Handshake
* **Objective (Maksad):** Pipeline chalane ke liye zaroori software aur credentials integrate karna.

#### 1. Plugins Installed via Manage Jenkins $\rightarrow$ Plugins:
* `SonarQube Scanner`
* `OWASP Dependency-Check`
* `Docker Pipeline`
* `Pipeline: Stage View`

#### 2. Credentials Stored in Jenkins (Tijori):
* **`sonar-token`**: SonarQube Server $\rightarrow$ My Account $\rightarrow$ Security $\rightarrow$ Generate Token. Jenkins mein Secret Text banaya.
* **`docker`**: DockerHub Username (`aruhehe`) + Password / Personal Access Token.
* **`github`**: GitHub Classic Personal Access Token (PAT) with `repo` scope (GitOps automated commits ke liye).

#### 3. Global Tools Configured (Manage Jenkins $\rightarrow$ Tools):
* **SonarQube Scanner:** Name: `Sonar` (Auto-install enable).
* **OWASP Dependency-Check:** Name: `OWASP` (Auto-install enable).

#### 4. SonarQube Webhook (The 2-Way Handshake):
* SonarQube UI $\rightarrow$ **Administration $\rightarrow$ Configuration $\rightarrow$ Webhooks $\rightarrow$ Create**:
  - Name: `Jenkins-Webhook`
  - URL: `http://172.31.3.251:8080/sonarqube-webhook/`
* **Kyun?** Scan khatam hote hi SonarQube Jenkins ko bolta hai: *"Result PASS ho gaya hai, pipeline aage badhao!"*

---

### ✅ Phase 6: AWS EKS Cluster & Managed NodeGroup Provisioning
* **Objective (Maksad):** AWS par Production Kubernetes Cluster khada karna.

#### 1. Cluster Create Karna (`kubepay-cluster`):
```bash
eksctl create cluster \
  --name kubepay-cluster \
  --region ap-south-1 \
  --version 1.32 \
  --nodegroup-name kubepay-nodes \
  --node-type t3.large \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 2 \
  --node-volume-size 29 \
  --ssh-access \
  --ssh-public-key bank-cicd
```

#### 2. IAM OIDC Provider Associate Karna:
```bash
eksctl utils associate-iam-oidc-provider \
  --region ap-south-1 \
  --cluster kubepay-cluster \
  --approve
```
* **Kyun zaroori hai?** Yeh **IRSA (IAM Roles for Service Accounts)** enable karta hai, jisse Pods bina hardcoded passwords ke safely AWS services use kar sakte hain.

#### 3. Verify Nodes:
```bash
kubectl get nodes -o wide
```
Dono worker machines `Ready` state mein dikhengi:
- `ip-192-168-30-149.ap-south-1.compute.internal`
- `ip-192-168-53-55.ap-south-1.compute.internal`

---

### ✅ Phase 7: GitOps Continuous Delivery with ArgoCD
* **Objective (Maksad):** Cluster ke andar GitOps controller setup karna jo GitHub repo ke `k8s/` folder ko live pods se sync rakhega.

#### 1. ArgoCD Install Karna:
```bash
kubectl create namespace argocd
kubectl apply -n argocd --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
watch kubectl get pods -n argocd
```

#### 2. ArgoCD Server ko NodePort par Expose Karna:
```bash
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort", "ports": [{"port": 80, "targetPort": 8080, "nodePort": 31539}, {"port": 443, "targetPort": 8080, "nodePort": 31136}]}}'
```
* **Accessible at:** `https://13.232.59.33:31136`

#### 3. Initial Admin Password Fetch Karna:
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
```
* **Login:** User `admin`, password = above decoded string. Login ke baad password change karein.

#### 4. Secret Management (GitOps Secret Hygiene):
* Database secrets (`MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY`) ko GitHub par plain text mein commit nahi kiya gaya!
* Real secret cluster par out-of-band apply kiya gaya:
  ```bash
  kubectl apply -f k8s/backend-secret.yaml
  ```
* Repo mein sirf template chhod di gayi: `k8s/backend-secret.example`.

#### 5. ArgoCD Application Create Karna (`kubepay`):
* In ArgoCD UI, create application with:
  - Application Name: `kubepay`
  - Sync Policy: `Automatic` (with `Prune: true` and `Self-Heal: true`)
  - Repository URL: `https://github.com/ARPITPRAJAPATI/Advance_bank_system.git`
  - Path: `k8s/`
  - Destination Namespace: `kubepay`
* **Status:** **`Synced` & `Healthy`** 🟢.

---

### ✅ Phase 8: End-to-End CI/CD Pipelines (Jenkinsfile & KubePay-CD)

#### Pipeline 1: `KubePay-CI` Execution Stages
1. **Workspace Cleanup (`cleanWs`):** Purani files delete karta hai.
2. **Git Checkout (`poll: false`):** Latest code pull karta hai.
3. **Trivy FS Scan:** Source code mein credentials leak check karta hai (`trivy fs`).
4. **SonarQube Analysis:** Code quality scan karta hai (`$SONAR_HOME/bin/sonar-scanner`).
5. **Quality Gate Wait:** SonarQube ke pass signal ka wait karta hai (`waitForQualityGate`).
6. **OWASP Dependency-Check:** NVD XML database se third-party packages scan karta hai.
   - *Optimization:* Local cached `odc.mv.db` (292MB) se scan time 15 minute se ghat kar **3 second** ho gaya!
7. **Docker Build & Push:**
   - Builds `aruhehe/kubepay-backend:${BUILD_NUMBER}` aur `:latest`.
   - Builds `aruhehe/kubepay-frontend:${BUILD_NUMBER}` aur `:latest`.
   - Pushes both images to DockerHub.
8. **Trivy Image Scan:** Container OS layers ko scan karta hai.
9. **Trigger Downstream CD:** Triggers `KubePay-CD` with parameter `TAG = ${BUILD_NUMBER}`.

#### Pipeline 2: `KubePay-CD` (The Auto-Bumper)
```bash
# 1. Update backend deployment image tag
sed -i "s|image: aruhehe/kubepay-backend:.*|image: aruhehe/kubepay-backend:${TAG}|g" k8s/backend-deployment.yaml

# 2. Update frontend deployment image tag
sed -i "s|image: aruhehe/kubepay-frontend:.*|image: aruhehe/kubepay-frontend:${TAG}|g" k8s/frontend-deployment.yaml

# 3. Commit with Infinite Loop Defense
git commit -m "GitOps: Bump image tags to ${TAG} [skip ci]"
git push origin main
```

#### Infinite Loop Defense (How it works):
Agar Jenkins commit karega, toh GitHub Webhook dobara Jenkins ko trigger kar dega! Is loop ko rokne ke liye 3 shields lagayi gayi hain:
1. Commit message mein **`[skip ci]`** likha gaya.
2. Jenkins Git SCM mein `MessageExclusion` pattern `(?s).*\[skip ci\].*` set kiya gaya.
3. `PathRestriction` mein `k8s/.*` exclude kiya gaya taaki manifest change par CI na chale.

#### Automated Email Alert (Gmail SMTP):
* Master configured with `smtp.gmail.com:465` (SSL).
* Agar pipeline fail hoti hai, toh direct HTML alert console logs ke sath `arpitprajapati2005@gmail.com` par deliver hota hai.

---

### ✅ Phase 9: Cluster Monitoring & Observability (Prometheus + Grafana)
* **Objective (Maksad):** Live pods aur EC2 hardware ka health track karna.

#### 1. Helm 3 Installation:
```bash
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

#### 2. Prometheus Stack Deploy Karna:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

#### 3. Expose Dashboards via NodePort:
```bash
# Expose Grafana on Port 32000
kubectl patch svc prometheus-grafana -n monitoring -p '{"spec": {"type": "NodePort", "ports": [{"port": 80, "targetPort": 3000, "nodePort": 32000}]}}'

# Expose Prometheus on Port 30090
kubectl patch svc prometheus-kube-prometheus-prometheus -n monitoring -p '{"spec": {"type": "NodePort", "ports": [{"port": 9090, "targetPort": 9090, "nodePort": 30090}]}}'
```

#### 4. Grafana Admin Password Fetch Karna:
```bash
kubectl get secret --namespace monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode; echo
```
* **Access URL:** `http://13.232.59.33:32000` (User: `admin`).

---

## 🌐 4. Live Production Endpoints Directory

| Service | Access URL | Port / Protocol | Credentials / Description |
| :--- | :--- | :--- | :--- |
| **KubePay Banking UI** | `http://13.232.59.33:31100` | NodePort `31100` / HTTP | Full-Stack App (Auth, Transfers, AI Copilot) |
| **Jenkins Master Controller**| `http://13.126.10.89:8080` | Port `8080` / HTTP | CI/CD Pipelines (`KubePay-CI`, `KubePay-CD`) |
| **SonarQube Quality Gate** | `http://13.126.10.89:9000` | Port `9000` / HTTP | Static Code Analysis & Code Smells |
| **ArgoCD Dashboard** | `https://13.232.59.33:31136` | NodePort `31136` / HTTPS | User: `admin` (GitOps Sync Status) |
| **Grafana Analytics** | `http://13.232.59.33:32000` | NodePort `32000` / HTTP | User: `admin` (Live CPU/RAM Dashboards) |
| **Prometheus Core TSDB** | `http://13.232.59.33:30090` | NodePort `30090` / HTTP | Raw PromQL Metrics & Target Scrapes |
| **Redundant Worker Node** | `http://13.127.50.2:31100` | NodePort `31100` / HTTP | Secondary EKS Worker Node Endpoint |

---

## 🎯 5. Top 5 DevOps Interview Questions on this Project

### Q1: "Aapki pipeline mein CI aur CD do alag jobs kyun hain? Ek hi job mein kyun nahi kiya?"
> *"Single pipeline mein CI aur CD jodna anti-pattern hota hai. CI ka kaam hai code verify karna aur Docker image banana. CD ka kaam hai GitOps manifests update karna. Separation of Concerns se security badhti hai aur GitOps workflow clean rehta hai."*

### Q2: "Jenkins se `kubectl apply` kyun nahi chalaya? ArgoCD kyun choose kiya?"
> *"Jenkins se `kubectl apply` chalana Push-based deployment hai, jisme Jenkins ko cluster ka admin credentials dena padta hai jo security vulnerability hai. ArgoCD Pull-based GitOps engine hai jo cluster ke andar rehta hai, automatic self-healing deta hai, aur GitHub ko Single Source of Truth banata hai."*

### Q3: "OWASP Dependency-Check pipeline ko slow bana deta hai. Aapne use 3 second mein kaise run kiya?"
> *"OWASP har build par 292MB ka NIST database download karta hai jisme 15 minute lagte hain. Humne official NIST NVD API Key integrate karke database ko worker node par locally cache kar diya (`odc.mv.db`). Ab scanner sirf daily diff download karta hai aur scan 3 second mein complete ho jata hai."*

### Q4: "GitOps version bump ke baad Jenkins infinite webhook loop ko kaise handle kiya?"
> *"CD job commit message mein `[skip ci]` flag lagati hai. Jenkins Git plugin mein `MessageExclusion` pattern `(?s).*\[skip ci\].*` aur `PathRestriction` mein `k8s/.*` configured hai. Isse GitOps commits webhook feedback loop trigger nahi karte."*

### Q5: "Backend Microservice ko NodePort ke bajaye ClusterIP kyun banaya?"
> *"Banking security rules ke hisaab se core transaction engine direct public internet par exposed nahi hona chahiye. Frontend ka Nginx container reverse proxy bankar request forward karta hai. Backend sirf internal Kubernetes DNS (`backend:3000`) par accessible hai, jo attack surface ko 90% kam karta hai."*

---

<p align="center">
  <b>✦ KubePay DevOps & GitOps Execution Guide — Built for Scale, Security & High Availability ✦</b>
</p>
