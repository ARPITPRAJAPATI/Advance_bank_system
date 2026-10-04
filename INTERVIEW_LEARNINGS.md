# 🎓 KubePay DevSecOps & Cloud Engineering — Master Interview Revision Guide
> **Repository:** KubePay (Advance Banking System)  
> **Author:** Arpit Prajapati  
> **Purpose:** Comprehensive file-by-file revision guide containing deep architectural rationale, line-by-line breakdowns, edge cases, and high-impact interview Q&As.

---

## 📑 File Revision Tracking Index

| # | File Path | Category | Core Concept / Focus | Status |
| :-: | :--- | :--- | :--- | :-: |
| **01** | `frontend/Dockerfile` & `nginx.conf` | Containerization | Multi-Stage Builds, Layer Caching, Nginx SPA Reverse Proxy | ✅ Revised |
| **02** | *Upcoming...* | — | — | ⏳ In Queue |

---

## 📦 Chapter 1: `frontend/Dockerfile` & `frontend/nginx.conf`

### 1. File Code Reference
```dockerfile
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


# Production stage
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

### 2. Line-by-Line Architectural Breakdown

#### 🔹 The Build Stage (`builder`)
* `FROM node:22-alpine AS builder`:
  * Uses lightweight Alpine Linux with Node.js v22.
  * The `AS builder` alias creates a disposable build environment. Everything in this stage (Node runtime, npm cache, source code, devDependencies) will be discarded in the final image.
* `WORKDIR /app`: Sets the operational directory inside the container.
* `COPY package*.json ./` followed by `RUN npm install`:
  * **Critical Layer Caching Rule**: Docker caches image layers. By copying only `package.json` and `package-lock.json` first, Docker reuses the cached `node_modules` layer as long as dependencies haven't changed.
  * If we did `COPY . .` first, every single UI/code tweak would invalidate the Docker cache, forcing a slow `npm install` on every single build!
* `COPY . .`: Copies the actual source code (React, Vite config, assets).
* `RUN npm run build`: Vite compiles the React JSX/TSX into pure, optimized HTML, JS, and CSS bundles inside `/app/dist`.

#### 🔹 The Production Stage (`nginx:alpine`)
* `FROM nginx:alpine`:
  * Discards Node.js completely! A production static web server does not need Node.js to serve compiled HTML/CSS/JS.
  * Image size drops dramatically from **~1.2 GB** (Node image) to **~25 MB** (Nginx alpine).
* `COPY nginx.conf /etc/nginx/conf.d/default.conf`:
  * Injects our custom Nginx routing and reverse-proxy configuration.
* `COPY --from=builder /app/dist /usr/share/nginx/html`:
  * Copies **only** the compiled production artifacts from the `builder` stage into Nginx's default public web root.
* `EXPOSE 80`: Documents that container listens on port 80.
* `CMD ["nginx", "-g", "daemon off;"]`:
  * Runs Nginx in the foreground (`daemon off;`).
  * **Why?** Docker containers stay alive as long as PID 1 (primary process) is running. If Nginx runs as a background daemon, PID 1 exits immediately, causing the container to crash with exit code 0.

---

### 3. The `nginx.conf` Companion Architecture

```nginx
server {
    listen 80;
    server_name localhost;

    # 1. SPA Routing Engine
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # 2. Kubernetes Cluster Reverse Proxy
    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Key Engineering Decisions in `nginx.conf`:
1. **`try_files $uri $uri/ /index.html;`**:
   * In a React Single Page Application (SPA), routes like `/dashboard`, `/transfer`, `/login` exist only in client-side React Router, NOT as actual physical files on disk.
   * Without `try_files`, refreshing the page on `http://app/dashboard` would return a **404 Not Found** from Nginx.
   * This directive tells Nginx: *"If the file does not exist, serve `index.html` and let React Router handle the URL."*
2. **`proxy_pass http://backend:3000/api/;`**:
   * Uses Kubernetes CoreDNS! `backend` resolves directly to the Kubernetes `ClusterIP` service named `backend` on port `3000`.
   * Completely eliminates CORS issues because the browser only talks to frontend `:80`, and Nginx proxies `/api` calls internally.
   * Headers like `X-Real-IP` and `X-Forwarded-For` preserve the client's original IP address for financial audit logs.

---

### 4. 🔥 Interview Questions & High-Impact Answers

#### Q1: "Why did you use Multi-stage Docker build for the React frontend?"
> **Answer:** *"React is a client-side Single Page Application that compiles into static HTML, CSS, and JS bundles during build time. Running a Node.js runtime in production to serve static files is an anti-pattern because it consumes hundreds of megabytes of unnecessary RAM and introduces a massive attack surface with Node vulnerabilities. By using a multi-stage build, we compile the app in a disposable Node builder stage, and copy only the `/dist` artifacts into an ultra-lean `nginx:alpine` image. This shrunk our production container size from ~1.2 GB to ~25 MB and gave us enterprise static file caching and reverse-proxying out of the box."*

#### Q2: "In your Dockerfile, why did you separate `COPY package*.json ./` and `RUN npm install` from `COPY . .`?"
> **Answer:** *"This is intentional Docker layer cache optimization. Docker caches each layer based on checksums. Dependencies in `package.json` change infrequently, whereas application source code changes on every commit. If we put `COPY . .` before `npm install`, any minor UI code change would invalidate the cache and force Docker to re-download all npm dependencies. By copying `package*.json` and running `npm install` first, Docker reuses the cached dependencies layer, reducing our build times from several minutes to under 5 seconds."*

#### Q3: "What is `daemon off;` in `CMD ['nginx', '-g', 'daemon off;']`?"
> **Answer:** *"By default, Nginx runs as a background daemon and forks worker processes. A Docker container only lives as long as its primary process (PID 1) is running. If Nginx runs as a daemon in the background, PID 1 exits immediately and Docker terminates the container with status 0. `daemon off;` forces Nginx to stay in the foreground as PID 1, keeping the container alive and streaming logs directly to `stdout`."*

#### Q4: "What happens if a user refreshes the page on `/dashboard` in your React app without `try_files` in Nginx?"
> **Answer:** *"Nginx will return a 404 HTTP error. Because React uses client-side routing (React Router HTML5 History API), `/dashboard` is a virtual route, not a physical directory on the Nginx file system. The `try_files $uri $uri/ /index.html;` directive instructs Nginx to first look for a file, then a directory, and if neither exists, fall back to serving `/index.html`, allowing React Router to hydrate and render the correct view."*

---
