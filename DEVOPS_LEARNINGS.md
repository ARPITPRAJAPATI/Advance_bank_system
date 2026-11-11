# 🚀 KubePay DevSecOps, GitOps & Cloud Architecture Master Learning Guide
> **Repository:** KubePay (Advance Banking System)  
> **Focus:** High-Yield Visual Architecture, Shift-Left DevSecOps, Declarative GitOps & Kubernetes SRE  
> **Author:** Arpit Prajapati  
> **Format:** Diagram-Driven, Concept-First (Targeted Code Snippets)

---

## 📑 Visual Table of Contents
1. [End-to-End DevSecOps, GitOps & Cloud Topology](#1-end-to-end-devsecops-gitops--cloud-topology)
2. [DevSecOps CI Pipeline (`Jenkinsfile`) & Shift-Left Security](#2-devsecops-ci-pipeline-jenkinsfile--shift-left-security)
3. [GitOps Continuous Delivery (`Jenkinsfile-CD` & ArgoCD)](#3-gitops-continuous-delivery-jenkinsfile-cd--argocd)
4. [Kubernetes Cluster Architecture & Networking Mesh](#4-kubernetes-cluster-architecture--networking-mesh)
5. [Infrastructure as Code (Terraform) & Cloud Observability](#5-infrastructure-as-code-terraform--cloud-observability)
6. [Production SRE Failure Scenarios & Troubleshooting Playbooks](#6-production-sre-failure-scenarios--troubleshooting-playbooks)
7. [Senior DevOps, SRE & Cloud Architect Interview Flashcards](#7-senior-devops-sre--cloud-architect-interview-flashcards)

---

## 1. End-to-End DevSecOps, GitOps & Cloud Topology

The KubePay deployment ecosystem bridges developer commits, automated security analysis, container registry publishing, and in-cluster GitOps reconciliation:

```mermaid
flowchart TD
    subgraph Developer ["Developer Layer"]
        Dev["Dev Workstation"] -->|1. git push origin main| GitHubApp["GitHub: Application Code"]
    end

    subgraph Jenkins_CI ["Jenkins DevSecOps CI (Agent: Node)"]
        Clean["cleanWs()"] --> GitPull["Git Checkout"]
        GitPull --> TrivyFS["Trivy Filesystem Scan (Secrets & CVEs)"]
        TrivyFS --> Sonar["SonarQube (Static Analysis & Quality Gate)"]
        Sonar --> OWASP["OWASP Dep-Check (NVD XML Cached)"]
        OWASP --> DockerBuild["Docker Build (Multi-Stage)"]
        DockerBuild --> TrivyImg["Trivy Image Scan (Base OS Layers)"]
        TrivyImg --> DockerPush["Docker Hub Registry (Push :BUILD_NUM & :latest)"]
        DockerPush --> TriggerCD["Trigger: KubePay-CD Pipeline"]
    end

    GitHubApp -->|Webhook Ping| Clean

    subgraph Jenkins_CD ["Jenkins GitOps CD Pipeline"]
        SedUpdate["sed -i: Bump Image Tag in k8s/*.yaml"]
        PreFlight["grep: Pre-Flight Manifest Validation"]
        GitCommit["git commit [skip ci] & push to GitHub"]
        SedUpdate --> PreFlight --> GitCommit
    end

    TriggerCD --> SedUpdate
    GitCommit -->|2. Updated Manifests| GitHubGitOps["GitHub: k8s/ Manifests"]

    subgraph EKS_Cluster ["Kubernetes Production Cluster (AWS EKS)"]
        subgraph ArgoCD_Namespace ["Namespace: argocd"]
            ArgoController["ArgoCD Controller (Continuous Reconciliation & Self-Heal)"]
        end

        subgraph KubePay_Namespace ["Namespace: kubepay"]
            FE_Ingress["Frontend Service (NodePort: 31100)"]
            FE_Pods["Frontend Pods (Nginx Replicas: 2)"]
            BE_Svc["Backend Service (ClusterIP: 3000)"]
            BE_Pods["Backend Pods (Node.js Replicas: 2)"]
        end

        subgraph Monitoring_Namespace ["Namespace: monitoring"]
            Prometheus["Prometheus Server (NodePort: 30090)"]
            Grafana["Grafana Dashboards (NodePort: 32000)"]
        end
    end

    ArgoController -->|3. Pull Desired State| GitHubGitOps
    ArgoController -->|4. Declarative Sync| KubePay_Namespace
    FE_Ingress --> FE_Pods
    FE_Pods -->|CoreDNS Proxy /api| BE_Svc
    BE_Svc --> BE_Pods
    Prometheus -->|Scrape Metrics (15s)| KubePay_Namespace
    Grafana -->|Visualize Health| Prometheus
```

---

## 2. DevSecOps CI Pipeline (`Jenkinsfile`) & Shift-Left Security

### 2.1 Shift-Left Security Architecture: Pre-Build vs. Post-Build Scans

```mermaid
flowchart LR
    subgraph PreBuild ["Pre-Build Security Gates (Source Code)"]
        TrivyFS["Trivy FS Scan:<br/>Finds leaked secrets, API keys, and unpinned deps"]
        SonarQube["SonarQube Quality Gate:<br/>Detects bugs, code smells, and security hotspots"]
        OWASP["OWASP Dep-Check:<br/>Audits package.json against NVD database"]
    end

    subgraph BuildStep ["Image Packaging"]
        Docker["Docker Multi-Stage Build"]
    end

    subgraph PostBuild ["Post-Build Security Gate (Binary Artifact)"]
        TrivyImg["Trivy Image Scan:<br/>Scans compiled container layers and Alpine OS libraries"]
    end

    PreBuild --> BuildStep --> PostBuild
```

---

### 2.2 OWASP Dependency-Check Optimization (15 min ➔ 3 sec)

```mermaid
flowchart TD
    subgraph Naive_Flow ["❌ Default Unoptimized OWASP Scan"]
        Start1["Run dependencyCheck"] --> DownloadHTTP["Download entire NVD feed over HTTP"]
        DownloadHTTP --> RateLimit["Hit NVD API rate limits & throttling"]
        RateLimit --> Freeze["Build blocked for 10 - 15 minutes!"]
    end

    subgraph Optimized_Flow ["✅ KubePay Production Optimization"]
        Start2["Run dependencyCheck with --nvdApiKey"]
        DisableAudits["--disableYarnAudit --disableNodeAudit"]
        LocalCache["Mount persistent local XML cache on Jenkins Node"]
        DeltaSync["Incremental delta download (sub-second!)"]
        FastFinish["Scan completed in 2.8 seconds!"]
        
        Start2 --> DisableAudits --> LocalCache --> DeltaSync --> FastFinish
    end
```

#### 🎯 Key Code Snippet (`Jenkinsfile`):
```groovy
stage('OWASP: Dependency-Check') {
    steps {
        // --nvdApiKey and disabling unused package auditors dropped build time from 15m to 3s
        dependencyCheck additionalArguments: 
            '--scan ./ --disableYarnAudit --disableNodeAudit --format XML --nvdApiKey 85E00693-0DD1-4343-A874-97B42E144F64', 
            odcInstallation: 'OWASP'
        dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
    }
}
```

---

### 2.3 Semantic Version Tagging vs. The `:latest` Anti-Pattern

```mermaid
flowchart TD
    subgraph AntiPattern ["❌ Using :latest in Production Kubernetes"]
        LatestTag["image: aruhehe/kubepay-backend:latest"]
        RolloutUndo["Bug found! Run: kubectl rollout undo"]
        Failure["Rollback fails! Pod image tag was already 'latest'!"]
        Traceability["Impossible to know which Git commit produced running pod!"]
        LatestTag --> RolloutUndo --> Failure --> Traceability
    end

    subgraph KubePayPattern ["✅ Sequential Immutable Version Tags"]
        BuildNum["TAG = params.DOCKER_TAG ?: env.BUILD_NUMBER"]
        ImmutableTag["image: aruhehe/kubepay-backend:23"]
        InstantRollback["kubectl rollout undo reverts to image:22 instantly!"]
        AuditTrail["Git commit ➔ Jenkins Build #23 ➔ Pod Image #23 (100% Traceable)"]
        BuildNum --> ImmutableTag --> InstantRollback --> AuditTrail
    end
```

---

## 3. GitOps Continuous Delivery (`Jenkinsfile-CD` & ArgoCD)

### 3.1 Push-Based CD vs. Pull-Based GitOps

```mermaid
flowchart TD
    subgraph TraditionalPush ["❌ Traditional Push CD (Jenkins kubectl apply)"]
        JenkinsPush["Jenkins CI Server"]
        KubeConfig["Contains full cluster-admin credentials!"]
        K8sAPI["Kubernetes API Server (Must allow ingress from CI IP)"]
        Compromise["Security Risk: If Jenkins is hacked, cluster is owned!"]
        Drift["Zero drift detection if manual edits occur!"]
        
        JenkinsPush --> KubeConfig --> K8sAPI --> Compromise --> Drift
    end

    subgraph PullGitOps ["✅ KubePay Pull-Based GitOps (ArgoCD)"]
        JenkinsCD["Jenkins CD (Updates YAML tags only)"]
        GitRepo["GitHub Repo (Single Source of Truth)"]
        ArgoCD["ArgoCD Controller (Runs INSIDE Kubernetes)"]
        ZeroCreds["Zero cluster credentials stored on Jenkins!"]
        SelfHeal["Continuously reconciles & auto-heals cluster drift!"]
        
        JenkinsCD -->|git push| GitRepo
        ArgoCD -->|Pulls updates via outbound HTTPS| GitRepo
        ArgoCD -->|Reconciles state natively| ZeroCreds & SelfHeal
    end
```

---

### 3.2 The Infinite CI/CD Webhook Loop & Triple-Shield Defense

When CD pushes manifest updates to Git, naive webhooks trigger CI again in an infinite loop!

```mermaid
flowchart LR
    CD_Push["CD commits updated k8s/*.yaml"] --> Shield1["Shield 1: Commit Flag<br/>chore(gitops): ... [skip ci]"]
    Shield1 --> Shield2["Shield 2: Jenkins SCM Regex<br/>(?s).*\[skip ci\].* ignores build"]
    Shield2 --> Shield3["Shield 3: Path Exclusion<br/>Changes to k8s/** ignored by CI"]
    Shield3 --> Shield4["Shield 4: git diff --quiet<br/>No tag changes = Skip commit entirely!"]
    Shield4 --> LoopKilled["✅ Infinite Loop Prevented!"]
```

#### 🎯 Key Code Snippet (`gitops/Jenkinsfile-CD`):
```groovy
sh """
    # Pre-commit validation: Check if tags actually changed
    if git diff --quiet k8s/backend-deployment.yaml k8s/frontend-deployment.yaml; then
        echo "No changes detected. Skipping commit."
    else
        git add k8s/backend-deployment.yaml k8s/frontend-deployment.yaml
        git commit -m "chore(gitops): bump deployment versions to backend:${params.BACKEND_DOCKER_TAG} [skip ci]"
        git push origin HEAD:main
    fi
"""
```

---

## 4. Kubernetes Cluster Architecture & Networking Mesh

### 4.1 Ingress Routing, Service Types & CoreDNS Resolution

```mermaid
flowchart TD
    User["🌐 External User Traffic"] --> NodePort["Frontend Service (NodePort: 31100)"]
    NodePort --> FEPods["Frontend Pods (Nginx Edge)"]

    subgraph InternalMesh ["Kubernetes Private Cluster Network (SDN)"]
        CoreDNS["CoreDNS Discovery: 'backend' ➔ 10.96.24.110"]
        BEClusterIP["Backend Service (ClusterIP: 3000)"]
        BEPods["Backend Pods (Node.js/Express)"]
    end

    FEPods -->|Nginx: proxy_pass http://backend:3000/api/| CoreDNS
    CoreDNS --> BEClusterIP
    BEClusterIP --> BEPods
```

#### 🎯 Service Comparison Table:
| Service | Type | Port | TargetPort | Security Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **`frontend`** | `NodePort` | 80 | 80 (NodePort 31100) | Public ingress entrypoint accepting user HTTP browser traffic. |
| **`backend`** | `ClusterIP`| 3000 | 3000 | Private internal IP. Completely inaccessible from public internet. |

---

### 4.2 Linux cgroups: CPU Throttling vs. Memory OOMKill

```mermaid
flowchart TD
    Pod["Running Container Pod"]
    
    subgraph ResourceEvaluation ["Linux cgroups Enforcement"]
        CPUCheck["Container hits CPU Limit (500m)"]
        MemCheck["Container hits Memory Limit (512Mi)"]
    end

    Pod --> CPUCheck & MemCheck

    subgraph EnforcementConsequences ["Kernel Level Action"]
        CFSThrottling["Linux CFS throttles CPU cycles<br/>➔ Pod latency increases, but process stays ALIVE!"]
        OOMKiller["Linux OOM-Killer terminates process<br/>➔ Container dies with Exit Code 137!"]
        RestartPolicy["Kubelet invokes restartPolicy: CrashLoopBackOff!"]
    end

    CPUCheck --> CFSThrottling
    MemCheck --> OOMKiller --> RestartPolicy
```

#### 🎯 Key Code Snippet (`k8s/backend-deployment.yaml`):
```yaml
resources:
  requests:
    cpu: 100m      # 👈 Used by K8s Scheduler for initial node placement
    memory: 128Mi
  limits:
    cpu: 500m      # 👈 Throttled by Linux CFS if exceeded
    memory: 512Mi  # 👈 Triggers OOMKill (Exit 137) if exceeded
```

---

## 5. Infrastructure as Code (Terraform) & Cloud Observability

### 5.1 Terraform AWS EC2 Provisioning Dependency Graph

```mermaid
flowchart TD
    VPC["aws_default_vpc.default"]
    AMI["data.aws_ami.ubuntu (Dynamic AMI Query: Canonical Ubuntu 22.04)"]
    Key["tls_private_key.generated (Fallback 4096-bit RSA Generation)"]
    KeyPair["aws_key_pair.deployer"]
    SG["aws_security_group.ec2_sg (Ingress: 22, 80, 443 | Egress: All)"]
    EC2["aws_instance.web"]

    VPC --> SG
    AMI & Key & KeyPair & SG --> EC2
```

---

### 5.2 Prometheus Pull-Model Scraping & Grafana Dashboards

```mermaid
flowchart TD
    subgraph Targets ["Scrape Targets (Every 15s via HTTP)"]
        cAdvisor["cAdvisor: Pod CPU, Memory, Network I/O"]
        KSM["kube-state-metrics: Deployment status, CrashLoopBackOffs"]
        NodeExp["node-exporter: Physical Node disk space, CPU load"]
    end

    subgraph PrometheusServer ["Prometheus Server (NodePort: 30090)"]
        PullEngine["Prometheus Pull Engine (Kubernetes Service Discovery)"]
        TSDB["Time-Series Database (TSDB)"]
        Alerts["Alertmanager Rules (e.g. Memory > 85%, CrashLoop alerts)"]
        PullEngine --> TSDB --> Alerts
    end

    Targets --> PullEngine

    subgraph Visualization ["Observability UI"]
        Grafana["Grafana Dashboards (NodePort: 32000)"]
    end

    TSDB --> Grafana
```

---

## 6. Production SRE Failure Scenarios & Troubleshooting Playbooks

### 🚨 Playbook 1: Pod in `CrashLoopBackOff`
```mermaid
flowchart TD
    Alert["Pod enters CrashLoopBackOff"] --> Step1["1. kubectl describe pod <pod-name> -n kubepay"]
    Step1 --> CheckExit["Check Last State Exit Code"]
    CheckExit -- Exit Code 1 --> DBError["Node.js process.exit(1) triggered:<br/>Check MongoDB connection string or IP whitelist!"]
    CheckExit -- Exit Code 137 --> OOMError["OOMKilled:<br/>Container exceeded memory limit! Increase memory limit in YAML."]
    Step1 --> Step2["2. kubectl logs <pod-name> -n kubepay --previous"]
```

---

## 7. Senior DevOps, SRE & Cloud Architect Interview Flashcards

### 🎴 Card 1: Shift-Left DevSecOps
* **Q:** *What is the difference between Trivy FS and Trivy Image in your CI pipeline?*
* **A:** Trivy FS runs *before* building the image, scanning raw source files for hardcoded secrets, database credentials, and unpinned dependencies. Trivy Image runs *after* compilation, inspecting the final container binary layers and base OS packages (e.g. Alpine Linux packages, OpenSSL, musl libc) for newly published CVEs.

### 🎴 Card 2: GitOps Pull vs Push Architecture
* **Q:** *Why is Pull-based GitOps with ArgoCD more secure than traditional Push-based CD with Jenkins?*
* **A:** In Push-based CD, Jenkins must hold full `cluster-admin` credentials, making it a high-value attack target. In Pull-based GitOps, no external system has cluster access. ArgoCD runs natively inside Kubernetes, pulling updates via outbound HTTPS. Furthermore, ArgoCD provides continuous drift detection and auto-healing (`selfHeal: true`).

### 🎴 Card 3: The Infinite Webhook Loop
* **Q:** *How did you solve the infinite build loop when your CD pipeline pushes updated manifests back to Git?*
* **A:** We implemented a triple-shield defense: 1) The CD pipeline tags commits with `[skip ci]`. 2) Jenkins SCM configuration enforces an exclusion regex `(?s).*\[skip ci\].*`. 3) Jenkins ignores commits affecting `k8s/**`. 4) A pre-commit `git diff --quiet` skips committing if the image tag is unchanged.

### 🎴 Card 4: CPU Throttling vs. Memory OOMKill
* **Q:** *What happens when a container reaches its CPU limit versus its Memory limit in Kubernetes?*
* **A:** CPU is a compressible resource: when a container hits its CPU limit, Linux CFS throttles its CPU time. The pod experiences latency, but stays alive. Memory is incompressible: when a container exceeds its memory limit, the Linux kernel invokes the OOM Killer, terminating the pod with exit code 137.
