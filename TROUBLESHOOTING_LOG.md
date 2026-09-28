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
| **ERR-08** | ArgoCD App Creation Failure: "k8s: app path does not exist" | 🔴 **High** | ArgoCD Repo Server / Git Remote | ✅ Resolved |
| **ERR-09** | GitHub Push Protection Blocked Live Secrets | 🔴 **High** | Git / GitHub Security Scanner | ✅ Resolved |
| **ERR-10** | Namespace Mismatch Between Microservices (`default` vs `kubepay`) | 🟡 **Medium** | Kubernetes CoreDNS / Service Discovery | ✅ Resolved |
| **ERR-11** | OWASP Dependency-Check NVD API Rate Limit & Missing XML Report | 🔴 **High** | Jenkins CI / OWASP Tooling | ✅ Resolved |
| **ERR-12** | GitOps Infinite CI/CD Feedback Loop via Webhook & SCM Polling | 🔥 **Critical** | Jenkins Pipeline / Git SCM / Webhook | ✅ Resolved |
| **ERR-13** | 502 Bad Gateway / MongoDB ENOTFOUND CrashLoopBackOff | 🔥 **Critical** | Kubernetes Pods / ArgoCD Reconciliation | ✅ Resolved |
| **ERR-14** | Jenkins SMTP Email Configuration Failure (Port 25 vs 465 SSL) | 🟡 **Medium** | Jenkins System / Gmail SMTP / email-ext | ✅ Resolved |

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

---

### 📌 ERR-09: GitHub Push Protection Rejection Triggering Misleading VS Code "Try Running Pull" Error
- **Error Message**:
  ```text
  Can't push refs to remote. Try running "Pull" first to integrate your changes.
  ```
  *(Terminal raw error: `remote: error: GH007: Your push would contain 4 secrets of 3 different types... Push declined due to detected secrets`)*
- **Severity**: 🔴 **High** (Blocks Git sync, potential high-severity credential exposure)
- **Root Cause**:
  1. Plaintext secrets (`MONGO_URI`, `JWT_SECRET`, `CLIENT_SECRET`, `REFRESH_TOKEN`) were committed inside `k8s/backend-secret.yaml` in an unpushed commit (`c8912d3`).
  2. GitHub's native **Secret Scanning & Push Protection** actively inspects all commits during `git push`. When detected, GitHub immediately drops the connection and returns HTTP/Git hook exit code `1`.
  3. The VS Code Git client does not parse GitHub-specific hook rejections (`GH007`); it naively defaults to prompting: *"Can't push refs to remote. Try running 'Pull' first to integrate your changes."*
  4. Running `git pull` does NOT solve the problem because the local branch is not behind `origin/main` — rather, the local commit contains forbidden secret payloads.
- **Resolution**:
  1. Add Kubernetes secret patterns to `.gitignore` to prevent future tracking:
     ```gitignore
     # ------------------------------
     # Kubernetes Secrets
     # ------------------------------
     k8s/*secret*.yaml
     !k8s/*secret*.example.yaml
     ```
  2. Soft-reset the offending commit so that uncommitted changes remain staged without data loss:
     ```bash
     git reset --soft HEAD~1
     ```
  3. Untrack the live secret file from the Git index:
     ```bash
     git rm --cached k8s/backend-secret.yaml
     ```
  4. Create a sanitized template file `k8s/backend-secret.example.yaml` containing placeholder values for Git tracking.
  5. Commit and push the clean manifests without secret payloads (`git push origin main` ➔ Success).
  6. Apply the actual secrets directly to the Kubernetes cluster using `kubectl apply -f -` on the Master node.

---

### 📌 ERR-10: Namespace Mismatch Between Microservices (`default` vs `kubepay`)
- **Error Message**:
  ```text
  Failed to connect to backend: http://backend:3000 -> getaddrinfo ENOTFOUND backend
  ```
- **Severity**: 🟡 **Medium** (Service discovery failure across isolated namespaces)
- **Root Cause**:
  Kubernetes namespaces provide logical isolation and separate CoreDNS search domains. 
  When a container queries `http://backend:3000`, the resolver queries `backend.<current-namespace>.svc.cluster.local`.
  If the `frontend` pod runs in `kubepay` but the `backend` service is deployed in `default`, simple name resolution (`http://backend:3000`) fails because cross-namespace calls mandate the Fully Qualified Domain Name (FQDN): `http://backend.default.svc.cluster.local:3000`.
- **Resolution**:
  Standardize all microservices and auxiliary resources under the single dedicated application namespace `kubepay`:
  - `k8s/namespace.yaml` ➔ `name: kubepay`
  - `k8s/backend-deployment.yaml` ➔ `namespace: kubepay`
  - `k8s/backend-service.yaml` ➔ `namespace: kubepay`
  - `k8s/frontend-deployment.yaml` ➔ `namespace: kubepay`
  - `k8s/frontend-service.yaml` ➔ `namespace: kubepay`
  - `k8s/backend-secret.yaml` ➔ `namespace: kubepay`

---

### 📌 ERR-11: OWASP Dependency-Check NVD API Rate Limit & Missing XML Report
- **Error Message**:
  ```text
  [Invoke Dependency-Check] (self time 969ms)
  [Publish Dependency-Check results -- **/dependency-check-report.xml] (self time 39ms)
  Collecting Dependency-Check artifact Unable to find Dependency-Check reports to parse
  Build step 'Publish Dependency-Check results' marked build as failure (Exit code 13)
  ```
- **Severity**: 🔴 **High** (Blocks CI pipeline security scanning)
- **Root Cause**:
  1. The National Vulnerability Database (NVD) enforces strict rate limiting on unauthenticated IP addresses. Without an NVD API key, automated downloads fail with HTTP 403/429, causing the CLI scanner to abort prematurely with exit code 13.
  2. Because the scan process crashed, the output file `**/dependency-check-report.xml` was never written.
  3. The Jenkins post-build publisher plugin searched for `dependency-check-report.xml`, found no matching file, and marked the entire build as `FAILURE`.
- **Resolution**:
  1. Procured an official NVD API key from NIST (`85E00693-0DD1-4343-A874-97B42E144F64`).
  2. Updated the Jenkins pipeline stage arguments to supply `--nvdApiKey`, enforce `--format XML`, and disable unused audits:
     ```groovy
     stage('OWASP: Dependency-Check') {
         steps {
             dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit --format XML --nvdApiKey 85E00693-0DD1-4343-A874-97B42E144F64', odcInstallation: 'OWASP'
             dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
         }
     }
     ```
  3. First run downloaded and cached the complete 292MB NVD database into `/home/ubuntu/tools/.../OWASP/data/odc.mv.db` on the worker node.
  4. Subsequent scans execute incrementally in under 3 seconds without errors.

---

### 📌 ERR-12: GitOps CI/CD Infinite Feedback Loop via Webhook & SCM Polling
- **Error Message**:
  ```text
  c.c.jenkins.GitHubPushTrigger$1#run: SCM changes detected in KubePay-CI. Triggering #14
  ...
  Triggering #15
  ...
  Triggering #16 (Infinite loop)
  ```
- **Severity**: 🔥 **Critical** (Server exhaustion, infinite build loop, resource starvation)
- **Root Cause**:
  1. **Feedback Loop Architecture**: In a monorepo setup containing both application source code and Kubernetes manifests, `KubePay-CI` triggers `KubePay-CD`. The CD job bumps image tags in `k8s/*.yaml` and runs `git push origin main`.
  2. GitHub Webhook detects the push on `main` and pings Jenkins (`http://<master>:8080/github-webhook/`).
  3. By default, Jenkins GitHub plugin triggers builds on any push unless explicitly configured with commit message filters.
  4. **The Secondary SCM Bug**: Even after adding `MessageExclusion` (`(?s).*\[skip ci\].*`) and `PathRestriction` (`k8s/.*`) in Jenkins job UI, the loop persisted! Server logs revealed:
     ```text
     Ignored commit db26876: Found excluded message: chore(gitops) ... [skip ci]  <-- SCM #1 ignored it
     Using strategy: Default
     git ls-remote -h -- https://github.com/ARPITPRAJAPATI/Advance_bank_system.git
     Changes found ➔ Triggering #21                                              <-- SCM #2 triggered it!
     ```
     Because the `Jenkinsfile` contained an in-pipeline `stage('Git: Code Checkout') { git branch: 'main' ... }`, Jenkins registered that as a **second SCM source**. The second SCM had `poll: true` by default without exclusions, causing it to trigger the build anyway!
- **Resolution**:
  1. Configured Jenkins Git SCM **Additional Behaviours**:
     - **Ignore commits with certain messages**: `(?s).*\[skip ci\].*`
     - **Polling ignores changes in certain paths**: `k8s/.*`
  2. Updated `Jenkinsfile` and `gitops/Jenkinsfile-CD` to disable polling on in-pipeline checkouts:
     ```groovy
     stage('Git: Code Checkout') {
         steps {
             git branch: 'main', changelog: false, poll: false, url: 'https://github.com/ARPITPRAJAPATI/Advance_bank_system.git'
         }
     }
     ```
  3. Git Webhook now cleanly recognizes `[skip ci]`, logs `No changes`, and stops the pipeline cleanly without looping.

---

### 📌 ERR-13: Application 502 Bad Gateway / MongoDB ENOTFOUND CrashLoopBackOff
- **Error Message**:
  ```text
  Frontend UI: "Request failed with status code 502"
  Backend Pod Logs:
  server is running on port 3000
  error querySrv ENOTFOUND _mongodb._tcp.cluster0.mongodb.net
  kubectl get pods -n kubepay:
  backend-598c756d7b-bnzrl   0/1   CrashLoopBackOff
  ```
- **Severity**: 🔥 **Critical** (Banking API completely non-functional, user registration blocked)
- **Root Cause**:
  1. A template file named `k8s/backend-secret.example.yaml` was tracked in Git with dummy values (`cluster0.mongodb.net`).
  2. ArgoCD watches the `k8s` directory with `selfHeal: true`. Because the example file had `kind: Secret` and `name: backend-secret`, ArgoCD automatically deployed the dummy secret to the cluster and continuously overwrote manual updates.
  3. The backend container failed to resolve the dummy MongoDB cluster address and crashed on startup, leaving Nginx with no upstream servers (returning HTTP 502).
- **Resolution**:
  1. Renamed `k8s/backend-secret.example.yaml` to `k8s/backend-secret.example` so ArgoCD does not parse it as a Kubernetes manifest.
  2. Applied the production `backend-secret.yaml` directly to the `kubepay` namespace on EKS:
     ```bash
     kubectl apply -f k8s/backend-secret.yaml
     ```
  3. Executed rolling restart of backend pods:
     ```bash
     kubectl rollout restart deployment backend -n kubepay
     ```
  4. Both backend pods transitioned to `1/1 Running` with 0 restarts. ArgoCD health updated to **`Healthy`** 🟢 and user registration / fund transfers started working flawlessly.

---

### 📌 ERR-14: Jenkins SMTP Email Configuration Failure (Port 25 vs 465 SSL)
- **Error Message**:
  ```text
  Failed to send out e-mail: com.sun.mail.util.MailConnectException: Couldn't connect to host, port: smtp.gmail.com, 25; timeout -1
  ```
- **Severity**: 🟡 **Medium** (Build notifications fail to deliver)
- **Root Cause**:
  1. Cloud providers (including AWS EC2) block outbound traffic on port `25` by default to prevent spam.
  2. Google SMTP requires secure TLS or SSL authentication with an App Password.
  3. Default Jenkins mail configuration uses port `25` with `useSsl: false`.
- **Resolution**:
  1. Generated 16-character Google App Password via Google Account Security settings.
  2. Configured both **Mailer** and **Extended Email Notification (email-ext)** in Jenkins System:
     - **SMTP Server**: `smtp.gmail.com`
     - **SMTP Port**: `465`
     - **Authentication**: `arpitprajapati2005@gmail.com` + Google App Password
     - **Use SSL**: `true`
     - **Default Content Type**: `HTML (text/html)`
  3. Verified via Jenkins test email utility ➔ Success! Deployment alerts now deliver automatically upon pipeline completion.


