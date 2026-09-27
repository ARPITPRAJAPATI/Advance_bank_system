# 🛠️ DevOps Troubleshooting & Problem-Solving Log

This document records all errors, root causes, severity levels, and exact solutions encountered during the setup and deployment of **Kube Pay (Advance Banking System)**.

---

## 📋 Problem Summary Matrix

| ID | Issue Description | Severity | Component | Status |
| :---: | :--- | :---: | :--- | :---: |
| **ERR-01** | Git Bash Windows Path Backslash Escaping | 🟢 **Low** | Local Terminal / Git Bash | ✅ Resolved |
| **ERR-02** | Jenkins GPG Key Expired / Package Not Available | 🔴 **High** | Linux APT / Jenkins Repo | ✅ Resolved |
| **ERR-03** | Jenkins 2.568 Java 17 Incompatibility & Service Crash | 🔥 **Critical** | Jenkins Service / Java Runtime | ✅ Resolved |
| **ERR-04** | Docker Daemon Socket Permission Denied | 🟡 **Medium** | Linux Permissions / Docker Socket | ✅ Resolved |
| **ERR-05** | SSH Agent Auth Failure (Wrong Username & PEM Key Format) | 🔴 **High** | Jenkins SSH Launcher / Trilead API | ✅ Resolved |
| **ERR-06** | EKS Cluster Kubernetes Version Deprecated (1.30 EOL) | 🟡 **Medium** | AWS EKS / eksctl | ✅ Resolved |
| **ERR-07** | ArgoCD ApplicationSet CRD Annotation Size Exceeded 256KB | 🟡 **Medium** | ArgoCD / Kubernetes CRD | ✅ Resolved |
| **ERR-08** | ArgoCD App Creation Failure: "k8s: app path does not exist" | 🔴 **High** | ArgoCD Repo Server / Git Remote | 🔄 In Progress |

---

## 🔍 Detailed Incident Logs

### 📌 ERR-01: Git Bash Windows Path Syntax Failure
- **Error Message**:
  ```bash
  $ cd C:\Users\arpit\Downloads
  bash: cd: C:UsersarpitDownloads: No such file or directory
  ```
- **Severity**: 🟢 **Low** (Syntax & Shell behavior)
- **Root Cause**:
  In Unix-based shells like Git Bash (MINGW64), the backslash `\` is an escape character. Windows paths like `\Users\arpit\Downloads` had their backslashes stripped, evaluating to `C:UsersarpitDownloads`.
- **Resolution**:
  Use forward slashes or POSIX home directory syntax:
  ```bash
  cd ~/Downloads
  # OR
  cd /c/Users/arpit/Downloads
  ```

---

### 📌 ERR-02: Jenkins Repository GPG Key Rotation (2023 ➔ 2026)
- **Error Message**:
  ```bash
  W: OpenPGP signature verification failed: NO_PUBKEY 7198F4B714ABFC68
  E: The repository 'https://pkg.jenkins.io/debian-stable binary/ Release' is not signed.
  E: Package 'jenkins' has no installation candidate
  ```
- **Severity**: 🔴 **High** (Blocked package manager from installing Jenkins)
- **Root Cause**:
  Legacy tutorials reference `jenkins.io-2023.key`. The Jenkins project rotated its package signing key to `jenkins.io-2026.key`. Consequently, APT rejected the unsigned repository data and refused to install Jenkins.
- **Resolution**:
  1. Download the current `jenkins.io-2026.key` into `/etc/apt/keyrings/`.
  2. Update the `/etc/apt/sources.list.d/jenkins.list` file:
  ```bash
  sudo mkdir -p /etc/apt/keyrings
  sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key
  echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
  sudo apt-get update -y
  ```

---

### 📌 ERR-03: Jenkins 2.568 Java 17 Incompatibility & Restart Loop
- **Error Message**:
  ```text
  Job for jenkins.service failed because the control process exited with error code.
  Running with Java 17 from /usr/lib/jvm/java-17-openjdk-amd64, which is older than the minimum required version (Java 21).
  Supported Java versions are: [21, 25]
  jenkins.service: Start request repeated too quickly.
  ```
- **Severity**: 🔥 **Critical** (Systemd service dead on arrival)
- **Root Cause**:
  1. Traditional guides install `openjdk-17-jre`. However, Jenkins LTS releases starting from version `2.568.x` completely dropped support for Java 17 and strictly mandate Java 21 or Java 25.
  2. Because the process crashed multiple times in seconds, systemd triggered its anti-flap rate limit (`Start request repeated too quickly`), refusing further start attempts.
- **Resolution**:
  1. Remove legacy Java 17 runtime packages.
  2. Install Java 21 JDK and JRE (`openjdk-21-jre openjdk-21-jdk`).
  3. Set system default Java to Java 21 via `update-alternatives`.
  4. Reset systemd unit failure state and restart:
  ```bash
  sudo apt remove -y openjdk-17-jre openjdk-17-jre-headless
  sudo apt install -y openjdk-21-jre openjdk-21-jdk
  sudo update-alternatives --set java /usr/lib/jvm/java-21-openjdk-amd64/bin/java
  sudo systemctl reset-failed jenkins
  sudo systemctl start jenkins
  ```

---

### 📌 ERR-04: Docker Daemon Socket Permission Denied
- **Error Message**:
  ```text
  permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
  ```
- **Severity**: 🟡 **Medium** (Docker operations blocked for non-root user)
- **Root Cause**:
  Adding the `ubuntu` user to the `docker` group via `usermod -aG docker ubuntu` does not apply to active, already-open SSH sessions without a complete logout or group refresh. Hence, access to `/var/run/docker.sock` was restricted to root only.
- **Resolution**:
  Grant read/write permissions to the Docker socket for non-root execution:
  ```bash
  sudo chmod 666 /var/run/docker.sock
  ```

---

### 📌 ERR-05: Jenkins SSH Agent Authentication Failure (Username & PEM Format)
- **Error Message**:
  ```text
  ERROR: Server rejected the 1 private key(s) for aru (credentialId:worker/method:publickey)
  ERROR: Failed to authenticate as aru with credential=worker
  Caused by: java.io.IOException: PEM problem: it is of unknown type.
  ```
- **Severity**: 🔴 **High** (Agent unable to join cluster)
- **Root Cause**:
  1. The credential username was set to `aru` instead of AWS Ubuntu's default user `ubuntu`.
  2. The generated key used OpenSSH new format (`BEGIN OPENSSH PRIVATE KEY`) instead of the classic PKCS#1 PEM format (`BEGIN RSA PRIVATE KEY`), which Jenkins' `trilead-api` PEMDecoder expects.
- **Resolution**:
  1. Set the Jenkins credentials username to `ubuntu`.
  2. Generate a standard classic PEM format key using `ssh-keygen -m PEM -t rsa -b 2048` or use the AWS `.pem` key directly.

---

### 📌 ERR-06: EKS Cluster Kubernetes Version Deprecated (1.30 EOL)
- **Error Message**:
  ```text
  Error: resolving cluster version: invalid version, 1.30 is no longer supported, supported values: 1.31, 1.32, 1.33, 1.34, 1.35, 1.36
  ```
- **Severity**: 🟡 **Medium** (Cluster creation blocked by version policy)
- **Root Cause**:
  AWS EKS actively retires older Kubernetes versions following upstream end-of-life cycles. The legacy tutorial used Kubernetes version `1.30`, which has been deprecated. Currently supported versions start from `1.31` upwards.
- **Resolution**:
  Use current supported stable Kubernetes version `1.32`:
  ```bash
  eksctl create cluster --name=kubepay-cluster --region=ap-south-1 --version=1.32 --without-nodegroup
  ```

---

### 📌 ERR-07: ArgoCD ApplicationSet CRD Annotation Size Exceeded (256 KB Limit)
- **Error Message**:
  ```text
  The CustomResourceDefinition "applicationsets.argoproj.io" is invalid: metadata.annotations: Too long: may not be more than 262144 bytes
  ```
- **Severity**: 🟡 **Medium** (CRD installation failure)
- **Root Cause**:
  Standard `kubectl apply` stores the entire manifest inside the `kubectl.kubernetes.io/last-applied-configuration` annotation. Modern ArgoCD CRDs exceed the 256 KB annotation ceiling.
- **Resolution**:
  Use Kubernetes Server-Side Apply (SSA) which tracks field ownership on the server side instead of storing a huge JSON annotation:
  ```bash
  kubectl apply -n argocd --server-side --force-conflicts -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
  ```

---

### 📌 ERR-08: ArgoCD Repo Server Path Resolution Failure ("k8s: app path does not exist")
- **Error Message**:
  ```text
  Unable to create application: application spec for navpay is invalid: 
  InvalidSpecError: Unable to generate manifests in k8s: rpc error: code = Unknown desc = k8s: app path does not exist
  ```
- **Severity**: 🔴 **High** (Blocks GitOps application creation and automated reconciliation)
- **Root Cause**:
  ArgoCD is a pull-based GitOps engine where the remote Git repository (`origin/main`) serves as the single source of truth (SSOT). When an application is defined with `path: k8s` and `targetRevision: HEAD` (or `main`), the `argocd-repo-server` pod executes an internal `git fetch`/`clone` of `https://github.com/ARPITPRAJAPATI/Advance_bank_system.git` and inspects the filesystem at the requested directory. Because the `k8s/` folder was never committed and pushed to the remote GitHub repository, the `argocd-repo-server` cannot find the specified directory on GitHub and throws an `InvalidSpecError`.
- **Resolution**:
  1. Create the `k8s/` directory with production Kubernetes manifests (`backend-deployment.yaml`, `backend-service.yaml`, `frontend-deployment.yaml`, `frontend-service.yaml`, `backend-secret.yaml`).
  2. Commit and push the new manifests and restructured codebase to the remote GitHub repository:
     ```bash
     git add .
     git commit -m "feat: add k8s manifests and complete gitops configuration"
     git push origin main
     ```
  3. Re-create or refresh the application in ArgoCD. Once the directory exists on GitHub, `argocd-repo-server` reads the manifests and builds the live resource tree.

