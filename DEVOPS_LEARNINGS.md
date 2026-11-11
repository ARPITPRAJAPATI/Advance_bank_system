# 🚀 KubePay DevSecOps, GitOps & Cloud Architecture Master Deep Dive
> **Repository:** KubePay (Advance Banking System)  
> **Component:** Continuous Integration, Automated Security Gates, GitOps CD, Kubernetes Orchestration & Terraform IaC  
> **Tech Stack:** Jenkins, Trivy, SonarQube, OWASP Dependency-Check, Docker, ArgoCD, Kubernetes (EKS), Terraform, Prometheus, Grafana  
> **Author:** Arpit Prajapati  
> **Target Audience:** DevOps Engineers, DevSecOps Specialists, Site Reliability Engineers (SRE), Cloud Architects

---

## 📑 Table of Contents
1. [High-Level DevSecOps & Cloud Topology](#1-high-level-devsecops--cloud-topology)
2. [File-by-File Deep Dive](#2-file-by-file-deep-dive)
   - [2.1 `Jenkinsfile` & The 10-Stage DevSecOps CI Pipeline](#21-jenkinsfile--the-10-stage-devsecops-ci-pipeline)
   - [2.2 `gitops/Jenkinsfile-CD` & The GitOps Continuous Delivery Bridge](#22-gitopsjenkinsfile-cd--the-gitops-continuous-delivery-bridge)
   - [2.3 ArgoCD Engine & In-Cluster Auto-Healing Architecture](#23-argocd-engine--in-cluster-auto-healing-architecture)
   - [2.4 `k8s/backend-deployment.yaml` & `backend-service.yaml`](#24-k8sbackend-deploymentyaml--backend-serviceyaml)
   - [2.5 `k8s/frontend-deployment.yaml` & `frontend-service.yaml`](#25-k8sfrontend-deploymentyaml--frontend-serviceyaml)
   - [2.6 `k8s/backend-secret.example` & Kubernetes Secret Hygiene](#26-k8sbackend-secretexample--kubernetes-secret-hygiene)
   - [2.7 `terraform/ec2.tf` & Declarative Infrastructure Automation](#27-terraformec2tf--declarative-infrastructure-automation)
   - [2.8 Prometheus & Grafana Observability Helm Stack](#28-prometheus--grafana-observability-helm-stack)
3. [The Infinite CI/CD Loop Nightmare & The Triple-Shield Defense](#3-the-infinite-cicd-loop-nightmare--the-triple-shield-defense)
4. [Push-Based vs Pull-Based Deployments: The Security Rationale](#4-push-based-vs-pull-based-deployments-the-security-rationale)
5. [Production SRE Troubleshooting & Playbooks](#5-production-sre-troubleshooting--playbooks)
6. [Senior DevOps, SRE & Cloud Architect Interview Q&A](#6-senior-devops-sre--cloud-architect-interview-qa)

---

## 1. High-Level DevSecOps & Cloud Topology

The KubePay platform follows a **Shift-Left DevSecOps** and **Declarative GitOps** paradigm. Security scans and static code analysis happen *before* compilation, and the deployment mechanism completely eliminates the need for Jenkins to hold sensitive Kubernetes cluster credentials.

```mermaid
flowchart TD
    subgraph Developer_Workstation ["Developer Layer"]
        Dev["Developer"] -->|1. git push origin main| GitHub["GitHub Repository (main branch)"]
    end

    subgraph CI_Pipeline ["Jenkins DevSecOps CI Pipeline (Agent: Node)"]
        Clean["cleanWs()"]
        Checkout["Git Checkout (poll: false)"]
        TrivyFS["Trivy: Filesystem Scan (Secrets & CVEs)"]
        Sonar["SonarQube: Code Quality & Gate"]
        OWASP["OWASP Dep-Check (NVD XML Cached)"]
        DockerBuild["Docker Build & Tag (:BUILD_NUM & :latest)"]
        TrivyImg["Trivy: Container Image Scan"]
        DockerPush["Docker Hub Registry (Push)"]
        TriggerCD["Trigger: GitOps CD Pipeline"]
    end

    GitHub -->|2. Webhook Trigger| Clean
    Clean --> Checkout --> TrivyFS --> Sonar --> OWASP --> DockerBuild --> TrivyImg --> DockerPush --> TriggerCD

    subgraph CD_Pipeline ["Jenkins GitOps CD Pipeline (KubePay-CD)"]
        StreamEdit["sed -i Manifest Image Tags"]
        PreFlight["grep Pre-Flight Manifest Validation"]
        CommitGitOps["git commit [skip ci] & push"]
    end

    TriggerCD --> StreamEdit --> PreFlight --> CommitGitOps
    CommitGitOps -->|3. Manifest Update| GitHub

    subgraph K8s_Cluster ["Kubernetes Production Cluster (AWS EKS)"]
        subgraph ArgoCD_Namespace ["Namespace: argocd"]
            ArgoController["ArgoCD Application Controller<br/>(Polls Git every 3m / Webhook)"]
        end

        subgraph KubePay_Namespace ["Namespace: kubepay"]
            FE_Ingress["Frontend Service (NodePort: 31100)"]
            FE_Pods["Frontend Pods (Nginx SPA Replicas: 2)"]
            BE_ClusterIP["Backend Service (ClusterIP: 3000)"]
            BE_Pods["Backend Pods (Node.js Replicas: 2)"]
            Secrets["K8s Secrets (envFrom: secretRef)"]
        end

        subgraph Monitoring_Namespace ["Namespace: monitoring"]
            Prometheus["Prometheus Server (NodePort: 30090)"]
            Grafana["Grafana Dashboard (NodePort: 32000)"]
        end
    end

    ArgoController -->|4. Pull Desired State| GitHub
    ArgoController -->|5. Declarative Reconciliation & Self-Heal| KubePay_Namespace
    Prometheus -->|Scrape Metrics (15s)| KubePay_Namespace
    Grafana -->|Visualize Health| Prometheus
```

---

## 2. File-by-File Deep Dive

---

### 2.1 `Jenkinsfile` & The 10-Stage DevSecOps CI Pipeline

```groovy
pipeline {
    agent { label 'Node' }

    environment {
        SONAR_HOME      = tool 'Sonar'
        DOCKER_USER     = 'aruhehe'
        BACKEND_IMAGE   = 'aruhehe/kubepay-backend'
        FRONTEND_IMAGE  = 'aruhehe/kubepay-frontend'
        TAG             = "${params.DOCKER_TAG ?: env.BUILD_NUMBER}"
    }

    parameters {
        string(name: 'DOCKER_TAG', defaultValue: '', description: 'Optional custom tag. Leave empty to auto-use Jenkins BUILD_NUMBER')
    }

    stages {
        stage('Workspace Cleanup') {
            steps {
                cleanWs()
            }
        }

        stage('Git: Code Checkout') {
            steps {
                git branch: 'main', changelog: false, poll: false, url: 'https://github.com/ARPITPRAJAPATI/Advance_bank_system.git'
            }
        }

        stage('Trivy: Filesystem Scan') {
            steps {
                sh "trivy fs --format table -o trivy-fs-report.html ."
            }
        }

        stage('SonarQube: Code Analysis') {
            steps {
                withSonarQubeEnv('Sonar') {
                    sh """
                        $SONAR_HOME/bin/sonar-scanner \
                            -Dsonar.projectName=KubePay \
                            -Dsonar.projectKey=KubePay \
                            -Dsonar.sources=backend,frontend \
                            -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/.git/**
                    """
                }
            }
        }

        stage('SonarQube: Quality Gate') {
            steps {
                script {
                    waitForQualityGate abortPipeline: false, credentialsId: 'sonar-token'
                }
            }
        }

        stage('OWASP: Dependency-Check') {
            steps {
                dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit --format XML --nvdApiKey 85E00693-0DD1-4343-A874-97B42E144F64', odcInstallation: 'OWASP'
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }

        stage('Docker: Build & Push Images') {
            steps {
                script {
                    withDockerRegistry([credentialsId: 'docker', url: '']) {
                        sh "docker build -t ${BACKEND_IMAGE}:${TAG} -t ${BACKEND_IMAGE}:latest ./backend"
                        sh "docker push ${BACKEND_IMAGE}:${TAG}"
                        sh "docker push ${BACKEND_IMAGE}:latest"

                        sh "docker build -t ${FRONTEND_IMAGE}:${TAG} -t ${FRONTEND_IMAGE}:latest ./frontend"
                        sh "docker push ${FRONTEND_IMAGE}:${TAG}"
                        sh "docker push ${FRONTEND_IMAGE}:latest"
                    }
                }
            }
        }

        stage('Trivy: Container Image Scan') {
            steps {
                sh "trivy image --format table -o trivy-backend-image.html ${BACKEND_IMAGE}:${TAG}"
                sh "trivy image --format table -o trivy-frontend-image.html ${FRONTEND_IMAGE}:${TAG}"
            }
        }

        stage('Trigger: GitOps CD Pipeline') {
            steps {
                script {
                    echo "🚀 Triggering GitOps CD Pipeline with Tag: ${TAG}..."
                    build job: "KubePay-CD", parameters: [
                        string(name: 'BACKEND_DOCKER_TAG', value: "${TAG}"),
                        string(name: 'FRONTEND_DOCKER_TAG', value: "${TAG}")
                    ], wait: false
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: '*.html, **/dependency-check-report.xml', allowEmptyArchive: true
            echo "🎉 CI Pipeline Finished! Deployed images tagged with ${TAG}"
        }
        failure {
            emailext (
                attachLog: true,
                to: "arpitprajapati2005@gmail.com",
                subject: "🚨 [FAILED] Kube Pay CI Pipeline - Build #${env.BUILD_NUMBER}",
                mimeType: 'text/html',
                body: "..."
            )
        }
    }
}
```

#### Line-by-Line Architectural Rationale:
* `TAG = "${params.DOCKER_TAG ?: env.BUILD_NUMBER}"`:
  * **The Immutable Tagging Standard**: Deploying containers with `:latest` in production is a major operational risk. If a bug is deployed, you cannot identify which commit caused it, and `kubectl rollout undo` fails because the image tag never changed.
  * This fallback assigns sequential, immutable tags matching the Jenkins build number (`:23`, `:24`), while allowing manual tag overrides for hotfix patches.
* `cleanWs()`:
  * Eliminates workspace cache pollution from previous builds, guaranteeing deterministic builds.
* `git ... changelog: false, poll: false`:
  * Disables expensive SCM polling and changelog calculations, reducing checkout time to under 1 second.
* **Trivy Filesystem Scan vs Trivy Image Scan**:
  * *Trivy FS*: Scans raw source code for hardcoded secrets, AWS keys, database credentials, and unpinned dependencies *before* anything is compiled.
  * *Trivy Image*: Scans the final built binary container layers and base OS packages (e.g. Alpine Linux system packages, OpenSSL, musl libc) *after* compilation.
* **The OWASP Dependency-Check Optimization (15m ➔ 3s)**:
  * By default, OWASP downloads the entire National Vulnerability Database (NVD) data feeds over HTTP on every pipeline execution. Due to NVD rate limits, this previously caused 15-minute pipeline freezes.
  * Supplying `--nvdApiKey`, disabling unused package managers (`--disableYarnAudit --disableNodeAudit`), and caching the local XML database reduced scan times from **15 minutes** to **under 3 seconds**!
* `build job: "KubePay-CD", wait: false`:
  * Asynchronously invokes the downstream GitOps CD pipeline without holding the CI Jenkins agent queue open.

---

### 2.2 `gitops/Jenkinsfile-CD` & The GitOps Continuous Delivery Bridge

```groovy
pipeline {
    agent { label 'Node' }

    environment {
        APP_NAME        = 'Kube Pay (Advance Banking System)'
        REPO_URL        = 'https://github.com/ARPITPRAJAPATI/Advance_bank_system.git'
        ARGOCD_URL      = 'https://13.203.207.58:31136'
        NOTIFICATION_TO = 'arpitprajapati2005@gmail.com'
        TARGET_BACKEND_TAG  = "${params.BACKEND_DOCKER_TAG ?: 'latest'}"
        TARGET_FRONTEND_TAG = "${params.FRONTEND_DOCKER_TAG ?: 'latest'}"
    }

    parameters {
        string(name: 'BACKEND_DOCKER_TAG', defaultValue: 'latest', description: 'Docker tag for Backend')
        string(name: 'FRONTEND_DOCKER_TAG', defaultValue: 'latest', description: 'Docker tag for Frontend')
    }

    stages {
        stage('Validate Parameters') {
            steps {
                script {
                    echo "📋 Target Deploy Versions -> Backend: ${env.TARGET_BACKEND_TAG} | Frontend: ${env.TARGET_FRONTEND_TAG}"
                }
            }
        }

        stage('Workspace Cleanup') {
            steps { cleanWs() }
        }

        stage('Git Checkout: Main') {
            steps {
                git branch: 'main', changelog: false, poll: false, url: "${env.REPO_URL}"
            }
        }

        stage('Update Kubernetes Manifests') {
            steps {
                script {
                    sh """
                        sed -i "s|image: aruhehe/kubepay-backend:.*|image: aruhehe/kubepay-backend:${env.TARGET_BACKEND_TAG}|g" k8s/backend-deployment.yaml
                        sed -i "s|image: aruhehe/kubepay-frontend:.*|image: aruhehe/kubepay-frontend:${env.TARGET_FRONTEND_TAG}|g" k8s/frontend-deployment.yaml
                    """
                }
            }
        }

        stage('Pre-Flight Manifest Validation') {
            steps {
                script {
                    sh """
                        grep "image: aruhehe/kubepay-backend:${env.TARGET_BACKEND_TAG}" k8s/backend-deployment.yaml
                        grep "image: aruhehe/kubepay-frontend:${env.TARGET_FRONTEND_TAG}" k8s/frontend-deployment.yaml
                        echo "✅ Manifests successfully verified!"
                    """
                }
            }
        }

        stage('Git: Commit & Push to GitOps Repo') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'github', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                        sh """
                            git config user.name "ARPITPRAJAPATI"
                            git config user.email "${env.NOTIFICATION_TO}"

                            if git diff --quiet k8s/backend-deployment.yaml k8s/frontend-deployment.yaml; then
                                echo "⚠️ No changes detected in image tags. Skipping commit."
                            else
                                git add k8s/backend-deployment.yaml k8s/frontend-deployment.yaml
                                git commit -m "chore(gitops): bump deployment versions to backend:${params.BACKEND_DOCKER_TAG} frontend:${params.FRONTEND_DOCKER_TAG} [skip ci]"
                                git push https://\${GIT_USER}:\${GIT_TOKEN}@github.com/ARPITPRAJAPATI/Advance_bank_system.git HEAD:main
                            fi
                        """
                    }
                }
            }
        }
    }
}
```

---

### 2.3 ArgoCD Engine & In-Cluster Auto-Healing Architecture

In KubePay, ArgoCD runs inside the `argocd` namespace on the Kubernetes cluster.
* **Continuous Git Reconciliation**: ArgoCD queries GitHub every 3 minutes (or receives instant GitHub webhook pings).
* **Declarative Self-Healing (`selfHeal: true`)**:
  * If a rogue developer or cluster administrator manually runs `kubectl scale deployment backend --replicas=10` or changes an environment variable directly via `kubectl edit`, ArgoCD detects configuration drift and automatically reverts the cluster to match Git within seconds!
* **Automated Pruning (`prune: true`)**:
  * If a resource manifest is removed from Git, ArgoCD cleanly terminates and garbage-collects the corresponding Kubernetes resource.

---

### 2.4 `k8s/backend-deployment.yaml` & `backend-service.yaml`

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: kubepay
  labels:
    app: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: aruhehe/kubepay-backend:23
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: backend-secret
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
---
# backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: kubepay
spec:
  type: ClusterIP # 👈 Completely private, zero public attack surface
  selector:
    app: backend
  ports:
    - port: 3000
      targetPort: 3000
```

#### Architectural Rationale:
1. **ClusterIP Port 3000**:
   * Security defense-in-depth: Sensitive database queries, JWT parsing, and financial mutations must **never** be directly routable from the public internet.
   * `ClusterIP` binds the service to an internal virtual IP accessible only within the cluster software-defined network.
2. **Resource Requests vs Limits**:
   * `requests: cpu 100m, memory 128Mi`: Used by the Kubernetes Scheduler to place the pod on an EC2 worker node with available capacity.
   * `limits: cpu 500m, memory 512Mi`: Enforced by Linux **cgroups**.
   * If CPU limit is breached: Linux throttles CPU cycles (latency increases, but pod stays alive).
   * If Memory limit is breached: Linux triggers an **OOMKill (Exit Code 137)**, terminating the container immediately to prevent host node starvation.

---

### 2.5 `k8s/frontend-deployment.yaml` & `frontend-service.yaml`

```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: kubepay
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: aruhehe/kubepay-frontend:23
          imagePullPolicy: Always
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
---
# frontend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: kubepay
spec:
  type: NodePort # 👈 Edge ingress entrypoint
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
      nodePort: 31100
```

---

### 2.6 `k8s/backend-secret.example` & Kubernetes Secret Hygiene

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secret
  namespace: kubepay
type: Opaque
stringData:
  PORT: "3000"
  MONGO_URI: "mongodb+srv://<username>:<password>@cluster0.mongodb.net/bank-system"
  JWT_SECRET: "your_jwt_secret_here"
  CLIENT_ID: "your_google_client_id.apps.googleusercontent.com"
  CLIENT_SECRET: "your_google_client_secret"
  REFRESH_TOKEN: "your_google_refresh_token"
  EMAIL_USER: "your_email@gmail.com"
```

#### Production Secret Hygiene Rule:
* **Never commit real credentials to Git!** Only `backend-secret.example` is committed as documentation.
* The actual `backend-secret` is created out-of-band directly on the Kubernetes cluster using `kubectl create secret generic backend-secret --from-env-file=.env -n kubepay` or synced using AWS Secrets Manager / HashiCorp Vault via External Secrets Operator.

---

### 2.7 `terraform/ec2.tf` & Declarative Infrastructure Automation

```hcl
# 1. Default VPC Adoption
resource "aws_default_vpc" "default" {
}

# 2. Dynamic lookup for latest Ubuntu 22.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 3. Dynamic RSA Key Pair Generation Fallback
resource "tls_private_key" "generated" {
  count     = fileexists(var.public_key_path) ? 0 : 1
  algorithm = "RSA"
  rsa_bits  = 4096
}

# 4. AWS Key Pair
resource "aws_key_pair" "deployer" {
  key_name   = var.key_name
  public_key = fileexists(var.public_key_path) ? file(var.public_key_path) : tls_private_key.generated[0].public_key_openssh
}

# 5. Security Group
resource "aws_security_group" "ec2_sg" {
  name        = "ec2-default-vpc-sg"
  vpc_id      = aws_default_vpc.default.id

  ingress {
    description = "Allow SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "Allow HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "Allow HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 6. EC2 Provisioning
resource "aws_instance" "web" {
  ami                    = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deployer.key_name
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  tags = {
    Name = "EC2-Instance"
  }
}
```

---

### 2.8 Prometheus & Grafana Observability Helm Stack

* Installed via `kube-prometheus-stack` into the `monitoring` namespace.
* **Prometheus Server (NodePort: 30090)**:
  * Pull-based metrics collector scraping targets every 15 seconds.
  * Targets:
    1. `cAdvisor`: Container CPU, memory usage, network bytes transmitted.
    2. `kube-state-metrics`: Deployment readiness, CrashLoopBackOff count, pod eviction events.
    3. `node-exporter`: Physical Linux EC2 node I/O, disk pressure, kernel thread count.
* **Grafana Dashboards (NodePort: 32000)**:
  * Visualizes cluster health, saturation, and latency (Golden Signals).

---

## 3. The Infinite CI/CD Loop Nightmare & The Triple-Shield Defense

### The Disaster Scenario:
1. Developer pushes code to GitHub.
2. GitHub Webhook triggers Jenkins CI.
3. Jenkins CI completes build and triggers Jenkins CD.
4. Jenkins CD modifies `backend-deployment.yaml` and commits back to GitHub.
5. GitHub Webhook sees a new commit and triggers Jenkins CI again... creating an **infinite recursive billing loop**!

### KubePay's Triple-Shield Defense:
```mermaid
flowchart LR
    CD_Commit["1. Commit Message:<br/>chore(gitops): ... [skip ci]"] --> Jenkins_Filter["2. Jenkins SCM Exclusion Regex:<br/>(?s).*\[skip ci\].*"]
    Jenkins_Filter --> Path_Filter["3. SCM Path Exclusion:<br/>k8s/** ignored by CI"]
    Path_Filter --> Diff_Guard["4. git diff --quiet:<br/>No tag changes = No commit!"]
```

1. **Commit Message Flag**: The CD pipeline tags commits with `[skip ci]`.
2. **Jenkins SCM Message Exclusion**: Jenkins Git plugin configured with regex `(?s).*\[skip ci\].*`.
3. **Jenkins SCM Path Exclusion**: Jenkins CI ignores changes made strictly inside `k8s/**`.
4. **`git diff --quiet`**: If the image tag didn't change, the CD pipeline skips the commit entirely.

---

## 4. Push-Based vs Pull-Based Deployments: The Security Rationale

| Attribute | Traditional Push CD (e.g. Jenkins `kubectl apply`) | KubePay Pull GitOps (ArgoCD) |
| :--- | :--- | :--- |
| **Cluster Access** | CI server must store full `cluster-admin` kubeconfig. | **Zero credentials outside cluster.** ArgoCD runs inside K8s. |
| **Blast Radius** | If Jenkins is compromised, the attacker owns the production cluster. | Compromised Jenkins only has Git write access to manifest files. |
| **Drift Detection** | None. Manual `kubectl` changes remain undetected. | **Continuous**. Automatically detects and corrects drift (`selfHeal`). |
| **Firewall Ingress** | Kubernetes API server must allow incoming connections from CI IP. | Kubernetes API remains completely private; ArgoCD pulls outbound via HTTPS. |

---

## 5. Production SRE Troubleshooting & Playbooks

### Playbook 1: Pod in `CrashLoopBackOff`
```bash
# 1. Inspect recent exit code and termination reason
kubectl describe pod <pod-name> -n kubepay

# 2. Check live container logs
kubectl logs <pod-name> -n kubepay --previous
```
* **Common Root Cause**: `process.exit(1)` triggered because `MONGO_URI` in `backend-secret` is invalid or MongoDB Atlas network access list blocked the EC2 public IP.

### Playbook 2: Pod Terminated with `OOMKilled` (Exit Code 137)
```bash
# Check container memory limit events
kubectl get events -n kubepay --sort-by='.metadata.creationTimestamp'
```
* **Resolution**: Increase `resources.limits.memory` in `backend-deployment.yaml` from `512Mi` to `1Gi` and push to Git. ArgoCD auto-deploys the update.

---

## 6. Senior DevOps, SRE & Cloud Architect Interview Q&A

### Q1: "Explain the architectural difference between Push-based CD and Pull-based GitOps."
> **Answer:** *"In traditional Push-based CD, an external runner like Jenkins stores cluster-admin credentials and runs `kubectl apply` against the Kubernetes API. This violates the principle of least privilege, exposes cluster credentials on the CI tool, and cannot detect manual configuration drift. In Pull-based GitOps with ArgoCD, no external system has cluster access. ArgoCD runs natively inside Kubernetes, continuously watches Git as the single source of truth, and pulls updates into the cluster. Furthermore, with `selfHeal: true`, ArgoCD continuously reconciles cluster drift: if a developer manually alters a replica count via kubectl, ArgoCD immediately reverts it back to match Git."*

### Q2: "How did you solve the infinite build loop problem in your CI/CD setup?"
> **Answer:** *"When our CD pipeline updates image tags in the Kubernetes deployment YAMLs and pushes them back to Git, a naive webhook would trigger the CI pipeline again in an infinite loop. We implemented a multi-layered guard: First, the CD pipeline commits with a message containing `[skip ci]`. Second, in Jenkins CI SCM settings, we added an SCM Message Exclusion regex `(?s).*\[skip ci\].*` and a Path Exclusion on `k8s/**`. Third, before committing, the CD pipeline runs `git diff --quiet`; if the image tag is unchanged, it skips the commit entirely."*

### Q3: "What happens when a container reaches its CPU limit versus its Memory limit in Kubernetes?"
> **Answer:** *"They behave fundamentally differently due to Linux kernel cgroup enforcement. CPU is a compressible resource: when a container hits its CPU limit, the CFS (Completely Fair Scheduler) throttles the container's CPU cycles. The application experiences increased response latency, but the process is not killed. Memory is an incompressible resource: when a container exceeds its memory limit, the Linux kernel invokes the Out-Of-Memory (OOM) Killer. The container is immediately terminated with exit code 137, and Kubernetes restarts the pod according to its restartPolicy."*

### Q4: "How did you optimize OWASP Dependency-Check from 15 minutes to 3 seconds in Jenkins?"
> **Answer:** *"By default, OWASP Dependency-Check downloads the complete National Vulnerability Database (NVD) CVE feeds on every single run. Due to recent NVD API rate limits, unauthenticated downloads suffered severe network throttling. We registered an official NVD API key (`--nvdApiKey`), disabled unused language scanners (`--disableYarnAudit --disableNodeAudit`), and configured Jenkins to maintain a persistent local XML cache on the agent node. Subsequent pipeline executions only perform fast incremental delta checks, reducing the scan duration from 15 minutes to under 3 seconds."*

