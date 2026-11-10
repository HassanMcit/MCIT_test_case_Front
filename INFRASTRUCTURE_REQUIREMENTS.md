# Infrastructure & Deployment Analysis Report
## MCIT Quality Assurance Test Case Management System
**Target Environment:** Internal On-Premise Ubuntu Linux Server (Ministry of Communications and Information Technology)  
**Analysis Date:** November 2026  
**Mode:** READ-ONLY Architectural Audit  
**Author:** Antigravity Engineering Architecture Team  

---

## Executive Summary

This report delivers a comprehensive, evidence-based technical analysis of both the **Frontend** (`test_case`) and **Backend** (`backend`) repositories of the MCIT Test Case Management System. The purpose is to prepare the system for enterprise deployment on an internal, air-gapped or intranet-hosted Ubuntu Linux 24.04 LTS server at the Ministry of Communications and Information Technology (MCIT).

The system currently operates across a hybrid architecture:
- **Frontend:** Next.js 16 (React 19) App Router running dual-target support (Cloudflare Workers via OpenNext in staging/prod branches, and standalone Node.js on `main`).
- **Backend:** NestJS 12 running Express, Passport JWT, and Node-Postgres connection pooling.
- **Database:** PostgreSQL 15/16 database with relational tables, lateral joins, views, and an immutable audit log trail.

All facts and version numbers in this report are verified directly against source files, package manifests, and configuration lockfiles.

---

## 1. Backend Technology Stack

### 1.1 Framework and Core Runtime
- **Framework:** **NestJS 12**
  - `@nestjs/core`: `12.0.1` (Evidence: `backend/package.json#L33`)
  - `@nestjs/common`: `12.0.1` (Evidence: `backend/package.json#L31`)
  - `@nestjs/platform-express`: `12.0.1` (Evidence: `backend/package.json#L36`)
  - `@nestjs/config`: `12.0.1` (Evidence: `backend/package.json#L32`)
  - `@nestjs/swagger`: `12.0.2` & `swagger-ui-express`: `5.0.1` (Evidence: `backend/package.json#L37,L46`)
- **Node.js Runtime Requirements:**
  - Recommended & Docker Baseline: **Node.js v22 LTS** (`node:22-alpine` in `backend/Dockerfile#L2,L13`).
  - Supported Minimum: **Node.js v20.x LTS** or **v22.x LTS**.
- **TypeScript:** `6.0.2` (devDependency in `backend/package.json#L66`).

### 1.2 Production Dependencies & Libraries
| Package | Version | Purpose | Evidence |
| :--- | :--- | :--- | :--- |
| `pg` | `^8.23.1` | PostgreSQL database connection pool (`pg.Pool`) | `backend/package.json#L43` |
| `bcryptjs` | `^3.0.3` | Password hashing with cryptographic salts | `backend/package.json#L38` |
| `@nestjs/jwt` | `^12.0.2` | JWT token minting and signing | `backend/package.json#L34` |
| `@nestjs/passport` | `^12.0.0` | Authentication guard pipeline | `backend/package.json#L35` |
| `passport` | `^0.7.0` | Core authentication engine | `backend/package.json#L41` |
| `passport-jwt` | `^4.0.1` | Extraction and verification of Bearer tokens | `backend/package.json#L42` |
| `class-validator` | `^0.15.1` | Decorator-based DTO request body validation | `backend/package.json#L40` |
| `class-transformer` | `^0.5.1` | Payload serialization and type casting | `backend/package.json#L39` |
| `rxjs` | `^7.8.1` | Reactive event stream handling | `backend/package.json#L45` |
| `reflect-metadata` | `^0.2.2` | TypeScript metadata reflection polyfill | `backend/package.json#L44` |

### 1.3 Database Driver & Data Layer
- **Architecture:** Pure PostgreSQL Connection Pool via `pg.Pool` (no heavy ORM such as Prisma or TypeORM in active runtime).
- **Service Layer:** `DatabaseService` (`backend/src/database/database.service.ts`) initializes `new Pool({ connectionString: process.env.DATABASE_URL })`.
- **Payload Limits:** High-capacity body parser configured for large test suites:
  - `json({ limit: '200mb' })` (Evidence: `backend/src/main.ts#L15`)
  - `urlencoded({ extended: true, limit: '200mb' })` (Evidence: `backend/src/main.ts#L16`)
- **Static File Serving:** Local directory `/uploads` served via Express static assets at `/uploads/` and `/api/uploads/` (Evidence: `backend/src/main.ts#L19-L24`).

### 1.4 Build and Startup Commands
- **Install Dependencies (Production):**
  ```bash
  npm install --omit=dev
  ```
- **Build Command:**
  ```bash
  npm run build
  # Executes: nest build -> outputs compiled JavaScript to backend/dist/
  ```
- **Production Startup Command:**
  ```bash
  npm run start:prod
  # Executes: node dist/main.js
  ```
- **Migration & Seed Commands:**
  ```bash
  npm run migrate:workflow          # node scripts/migrate-workflow.cjs
  npm run migrate:project-deadlines # node scripts/migrate-project-deadlines.cjs
  ```

---

## 2. Frontend Technology Stack

### 2.1 Core Framework & Runtime
- **Framework:** **Next.js 16.3.6** (root `package.json#L24`) / **16.4.5** (in `scratch/cloudflare-phase1/package.json#L40`).
- **React Runtime:** **React 19.2.8** & **React-DOM 19.2.8** (Evidence: `package.json#L27-L28`).
- **Compiler:** `babel-plugin-react-compiler: 1.0.0` with `reactCompiler: true` (Evidence: `next.config.ts#L5`).
- **Styling & Design System:**
  - Tailwind CSS `^4.0.0` with `@tailwindcss/postcss ^4` (Evidence: `package.json#L38,L43`).
  - Base UI: `@base-ui/react ^1.8.0` (Evidence: `package.json#L17`).
  - Icons: `lucide-react ^1.48.0` (Evidence: `package.json#L23`).
  - Toasts: `react-hot-toast ^2.6.1` (Evidence: `package.json#L30`).
  - Forms: `react-hook-form ^7.89.0` with `@hookform/resolvers ^5.9.1` and `zod ^4.6.5` / `4.6.6`.

### 2.2 Authentication & Session Layer
- **Library:** `next-auth: ^5.0.0-beta.32` (Auth.js v5 beta).
- **Session Strategy:** Encrypted Stateless JWT Cookie (`strategy: "jwt"`, `maxAge: 7 days`).
- **Session Verification:** Credentials provider delegates authentication to NestJS backend (`/api/auth/login`), then maintains active sessions and security audits in PostgreSQL (`user_login_sessions`, `audit_logs`).

### 2.3 Current Cloudflare-Specific Dependencies
In the Cloudflare migration branch (`migration/cloudflare-phase1`), the frontend utilizes Cloudflare Workers ecosystem packages:
- `@opennextjs/cloudflare: 1.20.16`
- `wrangler: 4.158.0`
- `rclone.js: 0.6.6`
- Cloudflare configuration files: `wrangler.production.jsonc`, `wrangler.staging.jsonc`, `wrangler.jsonc`.
- Worker runtime bindings: Hyperdrive (`HYPERDRIVE`), Durable Objects (`NEXT_CACHE_DO_QUEUE`, `NEXT_TAG_CACHE_DO_SHARDED`), KV Namespace (`NEXT_INC_CACHE_KV`).

### 2.4 Standalone Node.js Deployment Requirements (Eliminating Cloudflare)
To deploy on an internal Ubuntu server without Cloudflare:
1. **Enable Next.js Standalone Output:**  
   Update `next.config.ts` to include `output: "standalone"`:
   ```ts
   const nextConfig: NextConfig = {
     output: "standalone",
     reactCompiler: true,
     // ...
   };
   ```
   This instructs Next.js to trace dependencies and create a lightweight, self-contained bundle at `.next/standalone` requiring only Node.js without `node_modules`.
2. **Database Pooling Configuration (`src/lib/db.ts`):**  
   The main branch `src/lib/db.ts` already features a resilient lazy proxy supporting direct Node.js `pg.Pool`. Ensure `DATABASE_URL` points to the internal PostgreSQL instance. No Hyperdrive or OpenNext bindings are required.
3. **Execution Command:**  
   ```bash
   node .next/standalone/server.js
   # or with PM2: pm2 start .next/standalone/server.js --name "mcit-frontend"
   ```

---

## 3. Ports, Bindings, and Network Topology

### 3.1 Port Mapping Table
| Component | Default Internal Port | Recommended Host Binding | External Exposure | Protocol |
| :--- | :--- | :--- | :--- | :--- |
| **Nginx (Public Gateway)** | `80` (HTTP) | `0.0.0.0:80` | Yes (LAN/Intranet) | HTTP (301 Redirect to HTTPS) |
| **Nginx (Secure Gateway)** | `443` (HTTPS) | `0.0.0.0:443` | Yes (LAN/Intranet) | HTTPS (TLS 1.2 / 1.3) |
| **Frontend (Next.js)** | `3000` | `127.0.0.1:3000` | **No** (Localhost Only) | HTTP / Node.js HTTP Server |
| **Backend (NestJS API)** | `3001` | `127.0.0.1:3001` | **No** (Localhost Only) | HTTP / Express Engine |
| **PostgreSQL Database** | `5432` | `127.0.0.1:5432` (or Docker bridge) | **No** (Internal Only) | PostgreSQL Native Wire Protocol |

### 3.2 Binding Security Constraints
- **Current Development Defaults:**
  - Next.js (`next start`) binds to `0.0.0.0:3000` unless `-H 127.0.0.1` or `HOSTNAME=127.0.0.1` is set.
  - NestJS (`app.listen(port)`) in `backend/src/main.ts#L67` binds to `0.0.0.0:3001` unless explicitly passed `'127.0.0.1'`.
- **Ministry Security Mandate:**  
  Neither port `3000` nor port `3001` must ever be exposed on the physical network interface (`eth0`/`ens18`). All external access from employee browser workstations must enter through Nginx on port `443` with TLS termination.

### 3.3 Nginx Installation Status & Reverse Proxy Blueprint
- **Installation Status:** Not installed in the application workspace repository; must be installed via `apt install nginx` on the Ubuntu 24.04 host.
- **Recommended Production Nginx Configuration (`/etc/nginx/sites-available/mcit-qa.conf`):**

```nginx
# 1. Redirect all unencrypted HTTP traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name qa.mcit.gov.eg; # Or ministry server IP

    return 301 https://$host$request_uri;
}

# 2. Main Secure Reverse Proxy Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name qa.mcit.gov.eg; # Or ministry server IP

    # TLS / SSL Certificates (Ministry Internal CA or Official Cert)
    ssl_certificate /etc/ssl/certs/mcit_qa_server.crt;
    ssl_certificate_key /etc/ssl/private/mcit_qa_server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Maximum payload size for Excel workbooks and attachment uploads (matches NestJS limit)
    client_max_body_size 200M;
    client_body_buffer_size 16k;

    # Performance & Timeout settings
    proxy_connect_timeout 60s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;

    # Logging
    access_log /var/log/nginx/mcit_qa_access.log;
    error_log /var/log/nginx/mcit_qa_error.log warn;

    # ─────────────────────────────────────────────────────────────
    # Backend REST API Routes & Static Uploads
    # ─────────────────────────────────────────────────────────────
    location ~ ^/(api|uploads)/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # WebSocket & Server-Sent Events (SSE) support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Disable buffering specifically for Server-Sent Events (/api/users/notifications/stream)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s; # Keep long-lived notification streams open
    }

    # ─────────────────────────────────────────────────────────────
    # Frontend Next.js Application (Pages, Server Actions, Static Assets)
    # ─────────────────────────────────────────────────────────────
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # WebSocket support for Next.js Fast Refresh and streaming components
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static assets caching
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

---

## 4. Application Architecture & Communication Flow

### 4.1 End-to-End System Communication Diagram

```mermaid
flowchart TD
    subgraph Clients["Workstations (Ministry LAN)"]
        Browser["Employee Browser (Chrome / Edge)"]
    end

    subgraph SecurityGateway["Nginx Gateway (:80 / :443)"]
        NginxSSL["Nginx Reverse Proxy & SSL Termination"]
    end

    subgraph AppServer["Internal Application Layer"]
        NextJS["Frontend: Next.js 16 (:3000)<br/>• App Router & Server Components<br/>• NextAuth (Auth.js) Engine<br/>• Server Actions Mutation Layer"]
        NestJS["Backend: NestJS 12 (:3001)<br/>• Express HTTP Engine<br/>• Passport JWT Guard<br/>• Class-Validator Validation Pipe<br/>• Static File Server (/uploads)"]
    end

    subgraph StorageLayer["Data Layer"]
        PG[("PostgreSQL Database (:5432)<br/>• Schema Tables & Foreign Keys<br/>• test_cases_current (Lateral View)<br/>• audit_logs & user_login_sessions")]
        UploadsFS[("Persistent Uploads Directory<br/>/var/www/mcit/uploads")]
    end

    %% Network flows
    Browser -->|"HTTPS (:443)"| NginxSSL
    NginxSSL -->|"Reverse Proxy /"| NextJS
    NginxSSL -->|"Reverse Proxy /api/*, /uploads/*"| NestJS

    %% Frontend dual data path
    NextJS -->|"1. Fast-Read Direct SQL (pg.Pool)"| PG
    NextJS -->|"2. Server-to-Server REST (JWT Bearer)"| NestJS

    %% Backend storage path
    NestJS -->|"CRUD Queries, Lateral Joins & Audits"| PG
    NestJS -->|"Stores Avatar & Test Attachments"| UploadsFS

    %% SSE Notification Stream
    NestJS -.->|"SSE Notifications Stream"| NginxSSL
    NginxSSL -.->|"Live SSE Events"| Browser
```

### 4.2 Route Classification: Direct PostgreSQL Access vs NestJS REST API

The frontend implements a **Hybrid Dual-Path Architecture**:
- **Read Path (Fast Read):** Next.js Server Components query PostgreSQL directly via `src/lib/fast-read.ts` and `src/lib/db.ts` to render dashboards, tables, and statistics in **10–30ms** without waiting for REST serialization.
- **Write & Mutation Path:** Next.js Server Actions forward state-changing mutations to the NestJS API with JWT tokens, ensuring DTO validation, bcrypt password hashing, and business logic execution.

#### Direct PostgreSQL Routes / Helpers (Bypassing NestJS API)
| Component / File | Purpose | Database Tables Accessed | Evidence |
| :--- | :--- | :--- | :--- |
| `src/lib/fast-read.ts` | Ultra-fast dashboard project & test case queries | `projects`, `project_assignments`, `test_cases`, `test_case_imports`, `users` | `src/lib/fast-read.ts#L69-L100, L239-L252` |
| `src/lib/audit.ts` | Direct logging of user actions and security events | `audit_logs` | `src/lib/audit.ts#L65-L84` |
| `src/app/myUtil.ts` | Session validation, active token cutoff verification | `users`, `user_login_sessions` | `src/app/myUtil.ts#L30-L75` |
| `src/app/(dashboard)/devices/audit-logs.action.ts` | Security audit trail table querying | `audit_logs` | `audit-logs.action.ts#L25-L60` |
| `src/app/(dashboard)/users/sessions.action.ts` | Active login session tracking & device revocation | `user_login_sessions` | `sessions.action.ts#L35-L85` |
| `src/app/(dashboard)/quality/quality.action.ts` | Quality application catalog and checklist scoring | `quality_applications`, `quality_assessments` | `quality.action.ts#L30-L80` |
| `src/app/(dashboard)/projects/exportProjectReport.action.ts` | Direct SQL streaming for Excel report export | `projects`, `test_cases`, `users` | `exportProjectReport.action.ts#L45-L95` |
| `authjsConfig/authjsConfig.ts` | Session lifecycle persistence and login tracking | `user_login_sessions`, `users`, `audit_logs` | `authjsConfig.ts#L80-L115` |

#### NestJS API Routes Called via `appFetch`
| Next.js Server Action | NestJS Endpoint | HTTP Method | Payload / Action | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| `src/app/login/login.services.ts` | `/api/auth/login` | `POST` | Credentials verification, JWT issuance | `login.services.ts#L15` |
| `add/test-case.action.ts` | `/api/test-cases` | `POST` | Create new test case with DTO validation | `test-case.action.ts#L24` |
| `test-cases/test-cases.action.ts` | `/api/test-cases/:id` | `PATCH` | Update status, steps, execution details | `test-cases.action.ts#L200` |
| `test-cases/test-cases.action.ts` | `/api/test-cases/:id` | `DELETE` | Delete test case | `test-cases.action.ts#L87` |
| `assign-projects/assign.action.ts` | `/api/projects/:pId/assign/:uId`| `POST`/`DELETE` | Project tester assignment / unassignment | `assign.action.ts#L12,L35` |
| `projects/addprodject.action.ts` | `/api/projects` | `POST` | Create new project | `addprodject.action.ts#L18` |
| `projects/updateProject.action.ts` | `/api/projects/:id` | `PATCH` | Update project name, status, environment | `updateProject.action.ts#L21` |
| `projects/deleteProject.action.ts` | `/api/projects/:id` | `DELETE` | Delete project | `deleteProject.action.ts#L12` |
| `users/add/add.action.ts` | `/api/users` | `POST` | Register employee with hashed password | `add.action.ts#L15` |
| `users/user.action.ts` | `/api/users/:id` | `DELETE` | Remove employee profile | `user.action.ts#L20` |
| `Navbar/navbar.action.ts` | `/api/users/profile` | `PATCH` | Upload avatar (Multipart Form) | `navbar.action.ts#L42` |
| `Navbar/notifications.action.ts` | `/api/users/notifications` | `GET` | Fetch unread notifications | `notifications.action.ts#L52` |
| `Navbar/notifications.action.ts` | `/api/users/notifications/:id/read` | `PATCH` | Mark notification as read | `notifications.action.ts#L92` |
| `change-password/changepassword.action.ts` | `/api/auth/change-password` | `POST` | Update user password | `changepassword.action.ts#L31` |

### 4.3 Auth.js Session & JWT Flow
1. **Authentication:**  
   The user submits their credentials at `/login`. Auth.js invokes the `Credentials` provider in `authjsConfig/authjsConfig.ts`, which dispatches a `POST` request to NestJS `/api/auth/login`.
2. **Token Issuance:**  
   NestJS validates the email, compares the password hash via `bcryptjs.compare`, and returns a signed JWT containing `{ id, email, role, name }`.
3. **Session Persistence:**  
   Auth.js intercepts the response, generates a cryptographically random `sessionId` (UUID v4), records the session into `user_login_sessions`, writes an initial entry into `audit_logs`, and packs the NestJS token and session identifiers into the encrypted NextAuth JWT cookie (`__Secure-authjs.session-token` on HTTPS or `authjs.session-token` on HTTP).
4. **Session Verification on Navigation:**  
   During subsequent requests, `getCurrentUserSession()` (`src/app/myUtil.ts`) extracts the token, queries the PostgreSQL `users` table, and verifies that `minTokenIat` has not been advanced (enabling instantaneous session revocation without waiting for JWT expiration).

### 4.4 WebSockets, SSE, Background Jobs, and Caching
- **Server-Sent Events (SSE):**  
  The system utilizes SSE for real-time notifications via `GET /api/users/notifications/stream`.
  - Next.js acts as an SSE streaming proxy (`src/app/api/users/notifications/stream/route.ts#L25-L55`) connecting to the NestJS notification stream.
  - Nginx must disable proxy buffering (`proxy_buffering off;`) to deliver notifications instantaneously.
- **WebSockets:**  
  Currently, neither the backend nor the frontend requires persistent bidirectional WebSocket connections for core QA operations; all real-time events use SSE and browser BroadcastChannel.
- **Background Jobs:**  
  No external message queue (such as Redis, BullMQ, or RabbitMQ) is required. Background database maintenance, audit writing, and cache tagging run within Node.js microtasks and Next.js cache invalidation handlers (`updateTag`, `revalidatePath`).
- **Caching Architecture:**  
  Next.js uses tagged Data Cache (`force-cache` with tags `test-cases`, `projects`, `users`, `dashboard-stats`). In standalone Node.js, this is stored on disk in `.next/cache`.

---

## 5. Internal Server Deployment (Ubuntu 24.04 LTS)

### 5.1 Server Sizing & Resource Allocation
- **Hardware Profile:** 4 vCPU, 16 GB RAM, 200 GB SSD.
- **Target Concurrency:** Up to 10 concurrent QA employees.
- **Capacity Assessment:**  
  The provided hardware is **more than sufficient**. 10 concurrent active users typically generate ~5–15 requests per minute. The projected steady-state footprint is:
  - PostgreSQL 16: ~512 MB – 1 GB RAM
  - NestJS API (Node.js): ~250 MB – 500 MB RAM
  - Next.js Standalone (Node.js): ~300 MB – 700 MB RAM
  - Nginx: ~50 MB RAM
  - Operating System & OS buffers: ~2 GB RAM
  - **Total Estimated RAM Utilization:** **~4 GB** (leaving >11 GB free RAM for OS file page cache).

### 5.2 Deployment Topology Options

#### Option A: Docker Compose Architecture (Recommended for Enterprise Reproducibility)
Using Docker Compose encapsulates Node.js runtimes, PostgreSQL, and data volumes, isolating dependencies from the host OS.

```
                    ┌──────────────────────────────────────────────┐
                    │               Host Ubuntu Server             │
                    │                                              │
                    │   ┌──────────────────────────────────────┐   │
   HTTPS (:443) ───►│   │         Nginx (Host or Container)    │   │
                    │   └──────┬────────────────────────┬──────┘   │
                    │          │ :3000                  │ :3001    │
                    │   ┌──────▼──────────────┐  ┌──────▼──────┐   │
                    │   │ mcit-frontend       │  │ mcit-backend│   │
                    │   │ (Next.js Standalone)│  │ (NestJS 12) │   │
                    │   └──────┬──────────────┘  └──────┬──────┘   │
                    │          │                        │          │
                    │          └───────────┬────────────┘          │
                    │                      │ :5432                 │
                    │               ┌──────▼──────┐                │
                    │               │  PostgreSQL │                │
                    │               │  v16 Server │                │
                    │               └──────┬──────┘                │
                    │                      │                       │
                    │             ┌────────▼────────┐              │
                    │             │ Docker Volumes  │              │
                    │             │ (SSD Storage)   │              │
                    │             └─────────────────┘              │
                    └──────────────────────────────────────────────┘
```

#### Production `docker-compose.yml` Blueprint
```yaml
services:
  # ─────────────────────────────────────────────────────────────
  # Database Service (PostgreSQL 16)
  # ─────────────────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: mcit_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: mcit_qa_db
      POSTGRES_USER: mcit_qa_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    networks:
      - mcit_internal_network
    secrets:
      - db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mcit_qa_user -d mcit_qa_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─────────────────────────────────────────────────────────────
  # Backend API Service (NestJS 12)
  # ─────────────────────────────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mcit_backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://mcit_qa_user:DATABASE_PASSWORD@postgres:5432/mcit_qa_db
      JWT_SECRET: JWT_SIGNING_SECRET_KEY
      JWT_EXPIRES_IN: 7d
      FRONTEND_URL: https://qa.mcit.gov.eg
      CORS_ALLOWED_ORIGINS: https://qa.mcit.gov.eg
      ALLOW_DATABASE_BOOTSTRAP: "false" # Set true ONLY on first boot
    volumes:
      - uploads_data:/app/uploads
    networks:
      - mcit_internal_network
    ports:
      - "127.0.0.1:3001:3001"

  # ─────────────────────────────────────────────────────────────
  # Frontend Application (Next.js 16 Standalone)
  # ─────────────────────────────────────────────────────────────
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: mcit_frontend
    restart: unless-stopped
    depends_on:
      - backend
      - postgres
    environment:
      NODE_ENV: production
      PORT: 3000
      AUTH_TRUST_HOST: "true"
      AUTH_URL: https://qa.mcit.gov.eg
      AUTH_SECRET: NEXTAUTH_COOKIE_ENCRYPTION_SECRET
      NEXT_PUBLIC_BASE_URL: https://qa.mcit.gov.eg
      DATABASE_URL: postgresql://mcit_qa_user:DATABASE_PASSWORD@postgres:5432/mcit_qa_db
    networks:
      - mcit_internal_network
    ports:
      - "127.0.0.1:3000:3000"

volumes:
  pgdata:
    driver: local
  uploads_data:
    driver: local

networks:
  mcit_internal_network:
    driver: bridge

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### 5.3 Required Environment Variable Names (No Secrets Displayed)

#### Backend Environment Variables (`backend/.env`)
- `NODE_ENV` (`production`)
- `PORT` (`3001`)
- `DATABASE_URL` (Internal PostgreSQL connection string)
- `JWT_SECRET` (Cryptographic secret for signing tokens)
- `JWT_EXPIRES_IN` (`7d`)
- `FRONTEND_URL` (Domain URL of the frontend)
- `CORS_ALLOWED_ORIGINS` (Exact origins allowed to make browser requests, e.g. `https://qa.mcit.gov.eg`)
- `ALLOW_DATABASE_BOOTSTRAP` (`true` on initial deployment, then `false`)

#### Frontend Environment Variables (`.env.production`)
- `NODE_ENV` (`production`)
- `PORT` (`3000`)
- `AUTH_TRUST_HOST` (`true`)
- `AUTH_URL` (Fully-qualified canonical URL, e.g. `https://qa.mcit.gov.eg`)
- `AUTH_SECRET` (Cryptographic 32-byte secret for NextAuth cookie encryption)
- `NEXT_PUBLIC_BASE_URL` (External API gateway URL, e.g. `https://qa.mcit.gov.eg`)
- `DATABASE_URL` (Internal PostgreSQL connection string for Fast Read)

### 5.4 Linux Security, Firewall Rules, Backups, and Storage

#### 1. Host Firewall (`ufw`) Rules
On Ubuntu Server, only Nginx ports and SSH should be open to the intranet:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH Administration'
sudo ufw allow 80/tcp comment 'Nginx HTTP Redirect'
sudo ufw allow 443/tcp comment 'Nginx Secure Web Traffic'
sudo ufw enable
```
*Note: Ports 3000, 3001, and 5432 remain blocked from the external network and bind only to `127.0.0.1`.*

#### 2. TLS / Certificate Setup
Place the Ministry-issued server certificate and private key in:
- Certificate: `/etc/ssl/certs/mcit_qa_server.crt`
- Private Key: `/etc/ssl/private/mcit_qa_server.key` (with permissions `sudo chmod 600`)

#### 3. Automated PostgreSQL Backups (`pg_dump` Cron Job)
Create an automated daily database backup script at `/opt/mcit/scripts/backup_db.sh`:
```bash
#!/usr/bin/env bash
set -eo pipefail
BACKUP_DIR="/var/backups/mcit_qa_postgres"
DATE=$(date +'%Y%m%d_%H%M%S')
mkdir -p "$BACKUP_DIR"

# Docker backup command (or pg_dump directly if native)
docker exec -t mcit_postgres pg_dump -U mcit_qa_user mcit_qa_db | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -name "db_*.sql.gz" -mtime +30 -delete
```
Schedule via root cron (`sudo crontab -e`):
```cron
0 2 * * * /opt/mcit/scripts/backup_db.sh > /dev/null 2>&1
```

#### 4. Persistent Storage Directory
Create persistent directories with appropriate permissions:
```bash
sudo mkdir -p /var/www/mcit/uploads
sudo chown -R 1000:1000 /var/www/mcit/uploads
```

---

## 6. Deployment Blockers & Remediation Plan

### 6.1 Summary of Blockers and Risks
| Category | Specific Risk / Finding | Severity | File Reference | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **CORS Policy** | NestJS hardcodes Vercel & Render origins; blocks requests unless `CORS_ALLOWED_ORIGINS` is set | **HIGH** | `backend/src/security/cors.ts#L4-L7, L49` | Must pass internal domain/IP in `CORS_ALLOWED_ORIGINS` |
| **Hardcoded Fallbacks** | Next.js actions fall back to `mcit-test-case-backend.onrender.com` if env var missing | **HIGH** | `changepassword.action.ts#L28`, `stream/route.ts#L8` | Must ensure `NEXT_PUBLIC_BASE_URL` is set in production env |
| **SQL View Bug** | `workflow-migration.ts` defines `test_cases_current` overwriting creator `testerId` with updater | **CRITICAL** | `backend/src/database/workflow-migration.ts#L70` | Must ensure view is created using `tc."testerId" AS "testerId"` |
| **Database Bootstrap** | Backend starts with empty database and fails unless bootstrap flag is enabled | **HIGH** | `backend/src/database/database.service.ts#L30` | Run with `ALLOW_DATABASE_BOOTSTRAP=true` on first boot only |
| **Next.js Standalone** | Missing `output: 'standalone'` in `next.config.ts` requires entire `node_modules` | **MEDIUM** | `next.config.ts#L3` | Add `output: 'standalone'` before running `next build` |
| **Cloudflare R2 Avatars** | Backend default photo URL points to external Cloudflare R2 bucket | **MEDIUM** | `backend/src/database/database.service.ts#L49` | Fallback to local avatar / initials on isolated intranet |
| **Images Whitelist** | `images.remotePatterns` restricts domains to Render, Cloudflare, and localhost | **LOW** | `next.config.ts#L15-L33` | Add ministry server domain or disable optimization for local assets |

### 6.2 Detailed Analysis of Key Blockers

#### 1. CORS Allowed Origins Rejection
In `backend/src/security/cors.ts`:
```ts
export const PRODUCTION_FRONTEND_ORIGIN = 'https://mcit-test-case-front.vercel.app';
export const PRODUCTION_BACKEND_ORIGIN  = 'https://mcit-test-case-backend.onrender.com';
```
When an employee accesses the web app via `https://qa.mcit.gov.eg`, browser fetch requests send the `Origin: https://qa.mcit.gov.eg` header. If `CORS_ALLOWED_ORIGINS` is not defined in the backend environment with this exact origin, NestJS throws `ForbiddenException('Origin is not allowed')`, completely blocking all API calls.  
**Remediation:** Define `CORS_ALLOWED_ORIGINS=https://qa.mcit.gov.eg` in `backend/.env`.

#### 2. Test Case Creator Overwrite in Migration Script
In `backend/src/database/workflow-migration.ts#L70`:
```sql
CREATE VIEW test_cases_current AS
SELECT ...,
 CASE WHEN e.id IS NOT NULL THEN e."testerId" ELSE tc."testerId" END AS "testerId",
 ...
```
This migration script creates the SQL view `test_cases_current`. If deployed onto a fresh internal PostgreSQL database, any edit performed on a test case causes the lateral join `e` to return the updater's ID, thereby overwriting the original creator's identity in the UI.  
**Remediation:** On the new PostgreSQL database, ensure the view is created with `tc."testerId" AS "testerId"`, or execute the corrected DDL during schema initialization.

#### 3. Database Bootstrap Flag Behavior
In `backend/src/database/database.service.ts#L30`:
```ts
if (process.env.ALLOW_DATABASE_BOOTSTRAP !== 'true') return;
await this.initTables();
await migrateWorkflow(this.db);
// ...
```
If deployed with `ALLOW_DATABASE_BOOTSTRAP` unset or set to `false`, the backend connects to PostgreSQL but executes no DDL queries. Any incoming user request will crash with `relation "users" does not exist`.  
**Remediation:** Set `ALLOW_DATABASE_BOOTSTRAP=true` on the initial startup. Once the tables and admin accounts are created, set it back to `false` and restart the service to safeguard against schema mutations.

---

## 7. Pre-Deployment Execution Checklist

Before going live on the Ministry's internal server, complete the following verification steps:

- [ ] **1. Server Provisioning:** Ubuntu 24.04 LTS updated (`sudo apt update && sudo apt upgrade -y`).
- [ ] **2. Dependencies Installed:** Docker & Docker Compose plugin (or Node.js 22 + Nginx + PostgreSQL 16 native).
- [ ] **3. Firewall Activated:** `ufw allow 22`, `ufw allow 80`, `ufw allow 443`, `ufw enable`.
- [ ] **4. Standalone Output Configured:** Add `output: 'standalone'` to `next.config.ts`.
- [ ] **5. Environment Files Created:**
  - Create `backend/.env` with internal `DATABASE_URL`, strong `JWT_SECRET`, and `CORS_ALLOWED_ORIGINS`.
  - Create `.env.production` with internal `DATABASE_URL`, strong `AUTH_SECRET`, and `NEXT_PUBLIC_BASE_URL`.
- [ ] **6. Initial Database Migration:**
  - Set `ALLOW_DATABASE_BOOTSTRAP=true` for first run.
  - Apply `CREATE OR REPLACE VIEW test_cases_current` with `tc."testerId" AS "testerId"`.
  - Revert `ALLOW_DATABASE_BOOTSTRAP=false`.
- [ ] **7. Nginx Setup:** Deploy `/etc/nginx/sites-available/mcit-qa.conf`, install TLS certificates, and test with `sudo nginx -t`.
- [ ] **8. Backup Cron Job:** Verify `/opt/mcit/scripts/backup_db.sh` runs successfully and produces `.sql.gz`.
- [ ] **9. End-to-End Test:** Test employee login, test case creation, report export, and SSE notification streaming over intranet.

---
*Report compiled autonomously via Antigravity Deep Audit Engine.*
