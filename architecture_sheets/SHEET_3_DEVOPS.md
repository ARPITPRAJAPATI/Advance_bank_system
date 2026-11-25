# 🚀 KubePay — DevSecOps & Declarative GitOps Platform
> **Author:** Arpit Prajapati | **Page 3 of 4**
> **Stack:** Jenkins 2.568 · Docker · AWS EKS 1.32 · ArgoCD 2.14 · SonarQube · Trivy · OWASP · Prometheus · Grafana

---

## 🏗️ Jenkins Controller-Worker Topology

```mermaid
graph TD
    Dev["👨‍💻 Platform Engineer\nVS Code → git push"]
    GitHub[("🐙 GitHub Monorepo\nbranch: main")]

    subgraph JENKINS["🏗️ Jenkins Automation Server"]
        subgraph MASTER["🎮 Controller Node (13.126.10.89:8080)"]
            Scheduler["Job Scheduler\nJava 21 LTS · Systemd"]
            SonarSrv["📊 SonarQube 10.x\n:9000 — Code Analysis"]
        end
        subgraph WORKER["⚡ Build Agent (13.203.207.58)"]
            Docker["🐳 Docker Daemon\nSocket: /var/run/docker.sock"]
            Trivy["🔍 Trivy Binary\nFS + Image scan modes"]
            OWASP["🛡️ OWASP\nNVD XML 292MB cache"]
            SonarScan["SonarScanner CLI"]
        end
    end

    GitHub -->|"Webhook POST\n/github-webhook/"| Scheduler
    Scheduler -->|"SSH Agent\nDelegates build"| WORKER
    Dev -->|"git push origin main"| GitHub
```

---

## 🔄 KubePay-CI: 9-Stage Security Pipeline

```mermaid
graph LR
    S1["🧹 1. Workspace\nCleanup"]
    S2["📥 2. Git Checkout\npoll:false changelog:false"]
    S3["🔍 3. Trivy FS\nScan"]
    S4["📊 4. SonarQube\nAnalysis"]
    S5["🚦 5. Quality\nGate Wait"]
    S6["🛡️ 6. OWASP\nDep-Check"]
    S7["🐳 7. Docker Build\n& Push"]
    S8["🔎 8. Trivy Image\nScan"]
    S9["🚀 9. Trigger\nKubePay-CD"]

    S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7 --> S8 --> S9

    DockerHub[("DockerHub\naruhehe/kubepay-*:TAG")]
    S7 -->|docker push| DockerHub
```

### Stage Details

| Stage | Tool | What It Checks | Fail Condition |
|---|---|---|---|
| Trivy FS Scan | Trivy | Filesystem vulns, config misconfigs | HIGH/CRITICAL CVE found |
| SonarQube Analysis | SonarScanner | Code smells, security hotspots, coverage | Quality gate threshold breach |
| Quality Gate Wait | SonarQube Webhook | Blocks pipeline until webhook callback | Gate: FAILED |
| OWASP Dep-Check | OWASP NVD | Dependency CVEs against NIST database | HIGH vulnerability score |
| Docker Build & Push | Docker Daemon | Multi-stage image build | Build error |
| Trivy Image Scan | Trivy | Final container layer vulnerabilities | HIGH/CRITICAL in image |

> **OWASP Optimization:** Uses authenticated NIST NVD API key with a persistent 292MB local `odc.mv.db` cache — incremental scans complete in under 3 seconds instead of 20+ minutes.

---

## 🐙 KubePay-CD: GitOps Tag-Bumper Pipeline

```mermaid
graph LR
    CD1["📥 1. Clone Repo\nFresh workspace"]
    CD2["🔧 2. sed Bump\nImage Tags in k8s/*.yaml"]
    CD3["✅ 3. Manifest\nValidation grep"]
    CD4["📝 4. git commit\n'[skip ci]' + push"]
    CD5["📧 5. Gmail SMTP\nDeployment Alert"]

    CD1 --> CD2 --> CD3 --> CD4 --> CD5
```

**sed command used:**
```bash
sed -i "s|image: aruhehe/kubepay-backend:.*|image: aruhehe/kubepay-backend:${IMAGE_TAG}|g" k8s/backend-deployment.yaml
sed -i "s|image: aruhehe/kubepay-frontend:.*|image: aruhehe/kubepay-frontend:${IMAGE_TAG}|g" k8s/frontend-deployment.yaml
```

---

## ⚠️ Infinite Loop Defense Mechanism

**The Risk:** CD commits updated manifests to GitHub → GitHub webhook fires → CI triggers again → Infinite loop!

```mermaid
graph TD
    CDCommit["CD Pipeline commits\n'[skip ci]' to GitHub"]
    Webhook["GitHub Webhook fires\nto Jenkins"]

    subgraph DEFENSE["3-Layer Infinite Loop Defense"]
        L1["Layer 1: Git Message Flag\nCommit message contains [skip ci]"]
        L2["Layer 2: Jenkins SCM Regex\nMessageExclusion: (?s).*\\[skip ci\\].*"]
        L3["Layer 3: Path Restriction\nCI ignores commits touching only k8s/.*"]
    end

    Block["🛑 CI Pipeline\nDoes NOT trigger"]

    CDCommit --> Webhook --> L1 --> L2 --> L3 --> Block
```

---

## 🔄 ArgoCD GitOps Self-Healing Engine

```mermaid
graph LR
    GitHub[("GitHub\nk8s/*.yaml\n(Desired State)")]
    ArgoCD["🔄 ArgoCD Controller\nPolls every 3 minutes"]
    EKS["☁️ AWS EKS\n(Live State)"]

    GitHub -->|"Pull manifests\n(no credentials needed)"| ArgoCD
    ArgoCD -->|"Compare desired vs live"| EKS

    Manual["❌ Someone runs\nkubectl manually"]
    Manual -->|"Edits live cluster"| EKS
    EKS -->|"Drift detected\nselfHeal: true"| ArgoCD
    ArgoCD -->|"180s auto-revert\nBack to Git state"| EKS
```

| ArgoCD Setting | Value | Effect |
|---|---|---|
| `syncPolicy.automated` | `enabled` | Auto-applies any Git change |
| `selfHeal` | `true` | Reverts manual kubectl edits within 180s |
| `prune` | `true` | Deleted manifests in Git = deleted pods in EKS |
| Sync source | `origin/main: k8s/` | Only tracks manifest folder |

---

## ☁️ AWS EKS Cluster Topology

```mermaid
graph TD
    subgraph AWS["☁️ AWS ap-south-1 (Mumbai)"]
        subgraph EKS["EKS Cluster: kubepay-cluster (K8s 1.32)"]
            subgraph NS1["Namespace: kubepay"]
                FE["Frontend Pods × 2\nNginx + React SPA\nNodePort: 31100"]
                BE["Backend Pods × 2\nNode.js + Express\nClusterIP: 3000"]
                SEC["K8s Secret\nMONGO_URI · JWT_SECRET\nGROQ_API_KEY"]
                SEC -.->|env inject| BE
            end
            subgraph NS2["Namespace: argocd"]
                Argo["ArgoCD Server\nRepo Server\nApp Controller\nRedis · Dex\nNodePort: 31136"]
            end
            subgraph NS3["Namespace: monitoring"]
                Prom["Prometheus TSDB\nNodePort: 30090"]
                Graf["Grafana\nNodePort: 32000"]
                NodeExp["Node Exporter\nDaemonSet on all EC2"]
            end
        end

        subgraph EC2_JENKINS["EC2: Jenkins Stack"]
            JMaster["Jenkins Master\n13.126.10.89:8080"]
            SonarQube["SonarQube\n13.126.10.89:9000"]
        end

        subgraph EC2_WORKER["EC2: Build Agent"]
            Agent["Jenkins Worker\n13.203.207.58"]
        end

        subgraph EC2_EKS["EC2 EKS Worker Nodes (t3.large)"]
            Node1["Primary: 13.232.59.33"]
            Node2["Redundant: 13.127.50.2"]
        end
    end

    MongoDB[("🍃 MongoDB Atlas\nAWS Managed VPC")]
```

---

## 📊 Live Endpoints Reference

| Component | Host/IP | Port | Protocol |
|---|---|---|---|
| **Banking Web App** | EKS Worker Nodes | `31100` | HTTP (NodePort) |
| **ArgoCD Console** | EKS Worker Nodes | `31136` | HTTPS (NodePort) |
| **Grafana Dashboards** | EKS Worker Nodes | `32000` | HTTP (NodePort) |
| **Prometheus** | EKS Worker Nodes | `30090` | HTTP (NodePort) |
| **Jenkins CI** | 13.126.10.89 | `8080` | HTTP |
| **SonarQube** | 13.126.10.89 | `9000` | HTTP |
| **MongoDB Atlas** | AWS Managed | `27017` | MongoDB+SRV |
| **Gmail SMTP** | Google Cloud | `465` | SMTPS (SSL) |

---

## 🎯 Interview Defense Points

**Q: Why GitOps over pushing directly from Jenkins to Kubernetes?**
> Direct `kubectl apply` from Jenkins requires storing cluster admin kubeconfig inside the CI agent — a catastrophic security risk if the agent is compromised. ArgoCD inverts control: the cluster pulls from Git internally with zero external credential exposure. Git history also provides a full audit trail of every deployment.

**Q: How do you prevent the CI/CD infinite loop?**
> Three-layer defense: (1) CD pipeline includes `[skip ci]` in commit message, (2) Jenkins SCM is configured with `MessageExclusion` regex to ignore those commits, (3) Path restriction prevents CI from triggering when only `k8s/` folder changes. Any one layer would work — three layers ensures it never breaks.

**Q: Why use a dedicated build agent instead of running on the master?**
> Master node should only schedule jobs — it has zero build executors. Docker socket exposure, security tool binaries, and build side-effects are isolated entirely on the worker. If the worker is compromised, the master remains unaffected.
