# Production Deployment Guide

Three managed services, one application:

| Component | Platform | What it hosts | URL (example) |
| --------- | -------- | ------------- | ------------- |
| Frontend  | **Netlify** | static React/Vite build (`frontend/dist`) | `https://contactnest.netlify.app` |
| Backend   | **Render** (Docker web service) | Spring Boot API jar, container built from `backend/Dockerfile` | `https://phonebook-backend.onrender.com` |
| Database  | **Aiven for MySQL** | `users` + `contacts` tables over TLS | `phonebook-db-<project>.aivencloud.com:PORT` |

```
Browser
  │ HTTPS  (axios baseURL = VITE_API_BASE_URL + "/api")
  ▼
Netlify  ── CORS preflight + XHR ──>  Render (Spring Boot, profile "prod", PORT env var)
                                          │ JDBC/TLS  sslMode=REQUIRED
                                          ▼
                                    Aiven for MySQL
```

Nothing in the repository contains a credential: every secret is injected by the
platform as an environment variable (see [§4](#4-environment-variable-reference)).

---

## Table of contents

1. [What this repository now contains](#1-what-this-repository-now-contains)
2. [Prerequisites](#2-prerequisites)
3. [Deployment steps](#3-deployment-steps)
   - [Step 1 - Push the repository to GitHub](#step-1---push-the-repository-to-github)
   - [Step 2 - Create the Aiven for MySQL service](#step-2---create-the-aiven-for-mysql-service)
   - [Step 3 - Deploy the backend on Render](#step-3---deploy-the-backend-on-render)
   - [Step 4 - Deploy the frontend on Netlify](#step-4---deploy-the-frontend-on-netlify)
   - [Step 5 - Wire them together (CORS)](#step-5---wire-them-together-cors)
4. [Environment variable reference](#4-environment-variable-reference)
5. [Verification checklist](#5-verification-checklist)
6. [Security hardening](#6-security-hardening)
7. [Troubleshooting](#7-troubleshooting)
8. [Operating the deployment (redeploys, rotations, rollbacks)](#8-operating-the-deployment)

---

## 1. What this repository now contains

| File | Purpose |
| ---- | ------- |
| `backend/Dockerfile` | Multi-stage build (Maven 3.9 + Temurin 21 → JRE 21), non-root user, `JAVA_OPTS`, `HEALTHCHECK`. Render cannot run Java natively, so Docker is required. |
| `backend/.dockerignore` | Keeps `target/`, `.git`, local `.env` files out of the image. |
| `backend/src/main/resources/application.properties` | Local-development defaults; every value is now an env-var placeholder. |
| `backend/src/main/resources/application-prod.properties` | Production profile: Aiven JDBC URL, TLS, Hikari tuning, required secrets (no fallbacks), CORS. |
| `backend/src/main/java/com/phonebook/config/SecurityConfig.java` | CORS allow-list now driven by `app.cors.allowed-origins`; `/api/health` is public; preflight cached for 1 h. |
| `backend/src/main/java/com/phonebook/controller/HealthController.java` | New `GET /api/health` endpoint (checks the app *and* the database) used by Render's health check. |
| `backend/src/main/java/com/phonebook/security/JwtService.java` | No hardcoded fallback secret; fails fast with an actionable message if `JWT_SECRET` is missing/too short. |
| `backend/.env.example` | Template for every backend variable. |
| `backend/certs/README.md`, `backend/scripts/create-aiven-truststore.*` | Optional hardened TLS (`VERIFY_IDENTITY`) setup. |
| `frontend/src/api/axiosClient.js` | API base URL from `VITE_API_BASE_URL` (falls back to the dev proxy at `/api`). |
| `frontend/vite.config.js` | Dev proxy target overridable with `API_PROXY_TARGET`; fixed `dist` output. |
| `frontend/package.json` | Removed the Windows-only `@esbuild/win32-x64` runtime dependency so the Linux/Netlify install is clean. |
| `netlify.toml` | Netlify build settings (`base = frontend`), SPA fallback, security/caching headers, `VITE_API_BASE_URL`. |
| `render.yaml` | Render Blueprint: Docker web service, health check, all environment variables. |
| `db/schema.sql` | Optional explicit schema for "strict schema mode". |
| `.gitignore` | Blocks `.env*` files (except the examples) and TLS private material. |

---

## 2. Prerequisites

- **GitHub (or GitLab/Bitbucket) account** - both Render and Netlify deploy from Git.
- **Aiven account** - <https://console.aiven.io/signup> (the Free MySQL plan is enough to start).
- **Render account** - <https://dashboard.render.com/register> (free instance type available).
- **Netlify account** - <https://app.netlify.com/signup>.
- Optional but recommended locally: Docker Desktop (to build/run the image exactly as Render does) and the MySQL CLI.

Versions this configuration targets: **Java 21**, **Maven 3.9**, **Node 20**, **MySQL 8**.

---

## 3. Deployment steps

### Step 1 - Push the repository to GitHub

```powershell
cd "d:\Java Projects\phonebook_app"

# first time only
git init
git add .
git commit -m "Configure production deployment (Netlify + Render + Aiven)"

# create an EMPTY repository on GitHub first, then:
git remote add origin https://github.com/<your-user>/phonebook_app.git
git branch -M main
git push -u origin main
```

Before pushing, confirm that no secret is tracked:

```powershell
git status --short              # backend/.env.local and .env must NOT appear
git grep -nE "password|secret" -- . ":(exclude)*.example"
```

`backend/.env.example` and `frontend/.env.example` are templates and are
intentionally committed; `.env.local` / `.env` files are ignored.

> If your default branch is not `main`, change `branch: main` in `render.yaml`.

---

### Step 2 - Create the Aiven for MySQL service

1. Aiven Console → **Create service** → **MySQL**.
2. Pick a **plan** (Free works to start), a **cloud provider** and a **region close to your Render region** (for `region: oregon` in `render.yaml`, prefer a US-West region) - the latency between Render and the database is the biggest factor in API response time.
3. Open the service → **Overview** → **Connection information** and copy:

   | Aiven field | Goes into |
   | ----------- | --------- |
   | Host | `DB_HOST` |
   | Port | `DB_PORT` |
   | User (`avnadmin`) | `DB_USERNAME` |
   | Password | `DB_PASSWORD` |
   | Database (`defaultdb`) | `DB_NAME` |

4. Create the application database (recommended) - Console → service → **Databases** → *Add database* → `phonebook_db`, or from a terminal:

   ```powershell
   mysql -h <DB_HOST> -P <DB_PORT> -u avnadmin -p --ssl-mode=REQUIRED `
     -e "CREATE DATABASE IF NOT EXISTS phonebook_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

   (Or simply set `DB_NAME=defaultdb` and skip this step - Hibernate creates the
   tables inside `defaultdb`.)

5. **Networking / IP filter** (optional): Aiven accepts connections from anywhere by default, protected by TLS + password. To restrict it, enable *Allowed IP addresses* on the service and add Render's outbound ranges (Render docs → **Outbound traffic → Default IP ranges**; dedicated static outbound IPs require a paid Render workspace). An allow-list also blocks your local machine, so add your own IP if you connect with the MySQL CLI.

6. **TLS**: leave TLS enabled - Aiven requires it, and the backend requests it with `DB_SSL_MODE=REQUIRED` by default. For full certificate verification see [§6 Security hardening](#6-security-hardening).

7. Download the **CA certificate** (Console → Overview → *CA Certificate* → Download) if you plan to use `VERIFY_IDENTITY`; otherwise this can be skipped.

Keep the Aiven tab open - these values are needed in the next step. Never paste
them into a file inside the repository.

---

### Step 3 - Deploy the backend on Render

#### Option A (recommended) - Blueprint from `render.yaml`

1. Render Dashboard → **New +** → **Blueprint** → select your repository → *Apply*.
2. Render reads `render.yaml`, creates the web service `phonebook-backend` and prompts for every variable marked `sync: false`:

   | Prompt | Value |
   | ------ | ----- |
   | `DB_HOST` | Aiven host |
   | `DB_PORT` | Aiven port |
   | `DB_NAME` | `phonebook_db` (or `defaultdb`) |
   | `DB_USERNAME` | `avnadmin` |
   | `DB_PASSWORD` | Aiven password |
   | `APP_CORS_ALLOWED_ORIGINS` | Netlify origin (a placeholder is fine for the first deploy, updated in Step 5) |

   `JWT_SECRET` is generated by Render automatically (`generateValue: true`) and
   stays stable across deploys.
3. Wait for the first build (Maven downloads the dependencies inside Docker) and
   watch **Logs**. A healthy start looks like:

   ```
   CORS allowed origins: [https://contactnest.netlify.app]
   Tomcat started on port 10000 (http)
   Started PhonebookApplication in ... seconds
   ```

#### Option B - create the service manually

| Render field | Value |
| ------------ | ----- |
| Type | **Web Service** |
| Language / Environment | **Docker** |
| Root Directory | `backend` |
| Dockerfile Path | `./Dockerfile` (the field is resolved **relative to the Root Directory**, so this is `backend/Dockerfile`) |
| Instance Type | Free (or Starter+ to avoid cold starts) |
| Health Check Path | `/api/health` |
| Auto-Deploy | Yes (on commit) |
| Start command | *(leave empty - the image `ENTRYPOINT` launches the jar)* |

Then add the environment variables listed in
[§4 Environment variable reference](#4-environment-variable-reference).
`SPRING_PROFILES_ACTIVE=prod` is what activates `application-prod.properties`.

#### What Render does with this service

- **Build**: `docker build` with `backend/Dockerfile` (Maven `clean package` →
  JRE 21 runtime image, non-root `phonebook` user).
- **Start**: `java $JAVA_OPTS -jar /app/app.jar`, listening on the `PORT`
  variable Render injects (Spring reads it via `server.port=${PORT:8080}`).
- **Health check**: `GET /api/health` returns `200` only when the API can reach
  Aiven, and `503` otherwise.

Note the URL Render assigns - `https://<service-name>.onrender.com`. If
`phonebook-backend` is already taken globally, Render appends a suffix, so
**use the real URL** in Step 4 (`VITE_API_BASE_URL`) and Step 5
(`APP_CORS_ALLOWED_ORIGINS`).

#### Smoke-test the deployment

```powershell
curl.exe -i https://phonebook-backend.onrender.com/api/health
# HTTP/1.1 200 OK
# {"success":true,"message":"Phonebook API is healthy",
#  "data":{"service":"phonebook-backend","timestamp":"...","status":"UP","database":"UP"}}

curl.exe -s -X POST https://phonebook-backend.onrender.com/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"name":"Prod Test","email":"prod.test@example.com","password":"Secret123!","confirmPassword":"Secret123!"}'
```

A `503` with `"database":"DOWN"` means the Aiven variables are wrong (host,
port, password) or the Aiven IP allow-list blocks Render.

#### Optional - run the production image locally

```powershell
cd backend
docker build -t phonebook-backend .
Copy-Item .env.example .env.local     # then fill in the Aiven values
docker run --rm -p 8080:8080 --env-file .env.local phonebook-backend
curl.exe http://localhost:8080/api/health
```

Free Render services sleep after ~15 minutes of inactivity; the next request
takes 30-60 s to cold-start. The frontend sets no request timeout, so the request
simply completes slowly. Upgrade the instance type (or ping it periodically) if
that matters.

---

### Step 4 - Deploy the frontend on Netlify

1. Netlify → **Add new site** → **Import an existing project** → **GitHub** → pick the repository, branch `main`.
2. Use the settings from `netlify.toml` (they override the UI, but the UI should show the same values):

   | Setting | Value |
   | ------- | ----- |
   | Base directory | `frontend` |
   | Build command | `npm ci && npm run build` |
   | Publish directory | `dist` (relative to the base directory) |
   | Node version | `20` (`NODE_VERSION` in `netlify.toml`) |

3. Environment variable: **Site configuration → Environment variables** → add
   `VITE_API_BASE_URL = https://<your-render-service>.onrender.com` (no trailing
   slash, no `/api` suffix - the client appends `/api`).

   `netlify.toml` also defines `VITE_API_BASE_URL` with a default value, and
   file-based settings **take precedence over the UI**. If your Render URL is not
   `https://phonebook-backend.onrender.com`, edit `netlify.toml` (or delete that
   line and rely on the UI variable) and push the change.
4. Deploy. Netlify runs `npm ci` (needs the committed `package-lock.json`),
   builds with Vite and publishes `frontend/dist`.

`netlify.toml` also provides:

- a **SPA fallback** (`/*` → `/index.html`) so deep links and refreshes work,
- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` headers,
- immutable caching for fingerprinted `/assets/*` files.

#### Smoke-test the frontend

1. Open the Netlify URL (`https://<site>.netlify.app`).
2. Open DevTools → **Network**, register a user. The request must go to
   `https://<render-service>.onrender.com/api/auth/register` with status `201`.
3. In **Console**, confirm there is no
   `[ContactNest] VITE_API_BASE_URL is not set ...` error - that message means the
   variable was missing at build time.
4. In **Application → Local Storage**, `phonebook_token` and `phonebook_user`
   should appear after registration/login.

---

### Step 5 - Wire them together (CORS)

Browsers enforce CORS, so the API must explicitly allow the Netlify origin.

1. On Render → service → **Environment** → set:

   ```
   APP_CORS_ALLOWED_ORIGINS=https://contactnest.netlify.app
   ```

   Multiple origins are comma separated (no spaces needed, **no trailing slash**):

   ```
   APP_CORS_ALLOWED_ORIGINS=https://contactnest.netlify.app,https://www.contactnest.com,https://contactnest.com
   ```

   To also allow Netlify **deploy previews**, add the wildcard pattern
   `https://*.netlify.app` - be aware that this allows any `netlify.app` site to
   call your API, so remove it if you need a strict allow-list.
2. Save. Render redeploys automatically when environment variables change (or
   click **Manual Deploy → Deploy latest commit**).
3. Verify the preflight response:

   ```powershell
   curl.exe -i -X OPTIONS https://phonebook-backend.onrender.com/api/auth/login `
     -H "Origin: https://contactnest.netlify.app" `
     -H "Access-Control-Request-Method: POST" `
     -H "Access-Control-Request-Headers: content-type"
   ```

   Expect `HTTP/1.1 200` plus:

   ```
   Access-Control-Allow-Origin: https://contactnest.netlify.app
   Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
   Access-Control-Allow-Credentials: true
   ```

   A response without `Access-Control-Allow-Origin` means the origin is not in
   the allow-list or it contains a trailing slash / wrong scheme (`http` instead
   of `https`). The startup log line `CORS allowed origins: [...]` shows exactly
   what the running service accepted.

---

## 4. Environment variable reference

### Backend (Render)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `SPRING_PROFILES_ACTIVE` | **yes** | - | Must be `prod` to load `application-prod.properties`. |
| `DB_HOST` | **yes** | - | Aiven MySQL host (`...aivencloud.com`). |
| `DB_PORT` | **yes** | - | Aiven MySQL port. |
| `DB_NAME` | **yes** | - | Database holding the tables (`phonebook_db`, or `defaultdb` if you did not create one). |
| `DB_USERNAME` | **yes** | - | `avnadmin`. |
| `DB_PASSWORD` | **yes** | - | Aiven password. **Secret.** |
| `DB_SSL_MODE` | no | `REQUIRED` | `REQUIRED` (TLS, no CA verification) or `VERIFY_CA` / `VERIFY_IDENTITY`. |
| `DB_SSL_EXTRA` | no | *(empty)* | Extra JDBC parameters appended to the URL, must begin with `&` (used for the truststore in hardened TLS mode). |
| `DB_POOL_MAX_SIZE` | no | `5` | HikariCP `maximumPoolSize`. |
| `JWT_SECRET` | **yes** | - | Base64 secret, >= 32 bytes decoded. `openssl rand -base64 48`. **Secret.** |
| `JWT_EXPIRATION_MS` | no | `86400000` | Token lifetime (24 h). |
| `APP_CORS_ALLOWED_ORIGINS` | **yes** | - | Comma-separated browser origins (no trailing slash). |
| `JPA_DDL_AUTO` | no | `update` | `update` \| `validate` \| `none`. |
| `LOG_LEVEL_APP` | no | `INFO` | `logging.level.com.phonebook`. |
| `PORT` | injected | `8080` | Render sets this; Spring binds to it. |

`DB_URL` is also supported: point it at a complete JDBC URL to bypass the
composed Aiven URL (useful with a connection proxy).

### Frontend (Netlify)

| Variable | Required | Value |
| -------- | -------- | ----- |
| `VITE_API_BASE_URL` | **yes** (production) | `https://<render-service>.onrender.com` - origin only, no `/api`, no trailing slash. |
| `NODE_VERSION` | no | `20` (set in `netlify.toml`). |
| `API_PROXY_TARGET` | no | Local `npm run dev` only: where `/api` is proxied (default `http://localhost:8080`). Never used in a production build. |

Only variables prefixed with `VITE_` are inlined into the browser bundle, and
they are **public**. Never put a secret in a `VITE_*` variable.

### Secret handling rules applied here

- Secrets exist **only** as platform environment variables (Render dashboard /
  `generateValue`) - never in `render.yaml`, `netlify.toml`, Java code or
  `application*.properties`.
- `application-prod.properties` deliberately omits fallbacks for `DB_HOST`,
  `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET` and
  `APP_CORS_ALLOWED_ORIGINS`, so a misconfigured deploy never starts silently:
  - `JWT_SECRET` and `APP_CORS_ALLOWED_ORIGINS` are read with `@Value`, which
    aborts the start-up with
    `Could not resolve placeholder 'JWT_SECRET' in value "${JWT_SECRET}"`.
  - The `DB_*` variables are bound by Spring's data-source binder, which does
    **not** fail on an unresolved placeholder - it stays literal. Start-up then
    ends with `UnknownHostException: ${DB_HOST}` or
    `Access denied for user '${DB_USERNAME}'` (see the troubleshooting table).
- `JwtService` validates the secret at startup (Base64, >= 256 bit for HS256).
- Local `.env*` files are git-ignored; only the `.env.example` templates are
  committed.

---

## 5. Verification checklist

Run through this list after the three services are deployed. Replace the hosts
with your real URLs.

### 5.1 Backend / database

```powershell
$api = "https://phonebook-backend.onrender.com"

# 1. Liveness + database probe (must be 200 and database = UP)
curl.exe -s $api/api/health

# 2. Protected route without a token -> 401 JSON (the SPA clears its session on 401)
curl.exe -s -i $api/api/contacts | Select-Object -First 1

# 3. Registration -> 201 with a JWT
Set-Content "$env:TEMP\reg.json" '{"name":"Prod Test","email":"prod.test@example.com","password":"Secret123!","confirmPassword":"Secret123!"}'
$reg = curl.exe -s -X POST $api/api/auth/register -H "Content-Type: application/json" --data "@$env:TEMP\reg.json" | ConvertFrom-Json
$reg.success; $token = $reg.data.token

# 4. Login -> 200 with a JWT
Set-Content "$env:TEMP\login.json" '{"email":"prod.test@example.com","password":"Secret123!"}'
curl.exe -s -X POST $api/api/auth/login -H "Content-Type: application/json" --data "@$env:TEMP\login.json"

# 5. Authenticated CRUD
curl.exe -s -H "Authorization: Bearer $token" $api/api/auth/me
Set-Content "$env:TEMP\contact.json" '{"name":"Ada Lovelace","email":"ada@example.com","phone":"+1 555 0100","address":"London"}'
curl.exe -s -X POST $api/api/contacts -H "Content-Type: application/json" -H "Authorization: Bearer $token" --data "@$env:TEMP\contact.json"
curl.exe -s -H "Authorization: Bearer $token" "$api/api/contacts?search=Ada"
curl.exe -s -X DELETE -H "Authorization: Bearer $token" $api/api/contacts/1

# 6. Wrong password -> 401 "Invalid email or password"
curl.exe -s -X POST $api/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"prod.test@example.com\",\"password\":\"wrong\"}'

# 7. Clean up the test account
curl.exe -s -X DELETE -H "Authorization: Bearer $token" $api/api/users/me
```

Also confirm in the Aiven console (or with the MySQL CLI) that the rows really
landed in the database and disappear again after the cleanup:

```sql
SELECT id, name, email, created_at FROM users;
SELECT id, name, phone, user_id FROM contacts;
```

### 5.2 CORS

```powershell
# allowed origin -> 200 + Access-Control-Allow-Origin
curl.exe -s -i -X OPTIONS $api/api/auth/login `
  -H "Origin: https://<site>.netlify.app" -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: content-type,authorization" | Select-String "HTTP/|Access-Control"

# unknown origin -> 403 Invalid CORS request
curl.exe -s -i -X OPTIONS $api/api/auth/login `
  -H "Origin: https://not-my-site.example.com" -H "Access-Control-Request-Method: POST" | Select-String "HTTP/|Invalid"
```

### 5.3 Frontend

1. Open the Netlify URL in a private window.
2. Register a new user → the dashboard appears and the contact list loads.
3. Add / edit / delete a contact → toast confirms, no console errors.
4. DevTools → **Network**: every request goes to
   `https://<render-service>.onrender.com/api/...`; no request to
   `<netlify-site>/api/...` (which would mean `VITE_API_BASE_URL` was missing).
5. Reload the page → the session is restored (`GET /api/auth/me`).
6. Delete the account from the navbar → redirected to login, Vite/Netlify storage cleared.
7. Delete `phonebook_token` from Local Storage and reload → the app logs out
   cleanly (this exercises the 401 handling).

### 5.4 TLS / transport

- `curl.exe -v https://<render-service>.onrender.com/api/health` shows a valid
  certificate for `*.onrender.com`; `http://` redirects to `https://`.
- The Render log line `CORS allowed origins: [...]` matches the Netlify origin.
- In the Aiven console → service → **Overview**, confirm the connection count
  moves while the API is used (proof the API talks to Aiven, not to a local DB).

### 5.5 No secrets committed

```powershell
git grep -n "onrender" -- .              # only netlify.toml / render.yaml / docs
git grep -nE "avnadmin|aivencloud\.com"  # must return nothing (except .env.example)
git ls-files | Select-String -Pattern "\.env"   # only the .env.example files
```

---

## 6. Security hardening

The defaults are production-ready, but these steps raise the bar further.

### 6.1 Replace the development JWT secret (mandatory)

`application.properties` contains a **development-only** fallback key so that
`mvn spring-boot:run` works out of the box. Production always uses `JWT_SECRET`:

```powershell
openssl rand -base64 48        # or: [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Paste the result into the Render service (`JWT_SECRET`). Rotating it invalidates
every issued token, i.e. all users must log in again.

### 6.2 Strict schema mode

Once the first deploy has created the tables (or after applying `db/schema.sql`
yourself), stop letting Hibernate modify the schema:

1. Apply the DDL once: `mysql ... phonebook_db < db/schema.sql`
2. Set `JPA_DDL_AUTO=validate` on Render and redeploy. The app now fails fast if
   an entity no longer matches the database, instead of silently altering tables.

### 6.3 Hardened TLS verification (`VERIFY_IDENTITY`)

`DB_SSL_MODE=REQUIRED` already encrypts all traffic to Aiven. To also verify the
server certificate and hostname:

1. Aiven Console → service → **Overview** → *CA Certificate* → **Download**.
2. Save it as `backend/certs/aiven-ca.pem` and commit it (public CA material only).
3. Deploy the backend; the Docker build turns it into
   `/app/certs/aiven-truststore.p12` (see `backend/certs/README.md`).
4. Add to Render:

   ```
   DB_SSL_MODE=VERIFY_IDENTITY
   DB_SSL_EXTRA=&trustCertificateKeyStoreUrl=file:/app/certs/aiven-truststore.p12&trustCertificateKeyStoreType=PKCS12&trustCertificateKeyStorePassword=changeit
   ```

5. Replace `aiven-ca.pem` and redeploy whenever Aiven announces a CA rotation.

Behaviour differences: with `REQUIRED` a `wrong host`/man-in-the-middle
certificate would still connect; with `VERIFY_IDENTITY` it is rejected.

### 6.4 Least-privilege database user

Instead of using the `avnadmin` superuser, create an application user (Aiven
Console → service → **Users**, or SQL):

```sql
CREATE USER 'phonebook_app'@'%' IDENTIFIED BY '<strong-password>';
GRANT SELECT, INSERT, UPDATE, DELETE ON phonebook_db.* TO 'phonebook_app'@'%';
-- add CREATE, ALTER, INDEX, DROP only while JPA_DDL_AUTO=update
FLUSH PRIVILEGES;
```

Update `DB_USERNAME` / `DB_PASSWORD` on Render and redeploy.

### 6.5 Network-level restrictions

- Enable Aiven's **Allowed IP addresses** filter and add Render's outbound
  ranges (Render docs → *Outbound traffic → Default IP ranges*).
- On Render, keep the service public only if the SPA needs it - the SPA does, so
  instead protect the API with the platform's DDoS protection and consider
  rate limiting (`bucket4j` / a gateway) since the API currently has none.
- Optional: add `Strict-Transport-Security` to `netlify.toml` once a custom
  domain is in place (HSTS on `*.netlify.app` subdomains is not recommended).

### 6.6 Transport, storage and secrets

- `JWT` is stored in `localStorage` (existing design). Because that is readable
  by any script, keep the frontend dependency tree clean (`npm audit`) and avoid
  third-party scripts; the alternative would be an HttpOnly refresh-token cookie.
- Never commit `.env*` files; the repository only ships `.env.example`.
- Rotate the Aiven password from the Aiven console periodically and update
  `DB_PASSWORD` on Render (env-var edits trigger a redeploy).
- Render keeps environment values encrypted; use Render *Secret Files* only when
  a file (not a value) is required.
- Enable deploy notifications (Render → Notifications, Netlify → Notifications)
  so a failed deploy does not go unnoticed.
- Keep dependencies current: `mvn versions:display-dependency-updates`,
  `npm outdated`, and Spring Boot patch upgrades.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Render deploy fails at startup with `Could not resolve placeholder 'JWT_SECRET'` (or `'APP_CORS_ALLOWED_ORIGINS'`) | A required environment variable is missing in the prod profile | Add it in Render → Environment (this failure is intentional: it prevents an insecure start) |
| Render deploy fails at startup with `Application run failed ... java.net.UnknownHostException: ${DB_HOST}` (or `Access denied for user '${DB_USERNAME}'`) | A `DB_*` variable is missing, so the placeholder stayed literal in the JDBC URL (Spring binds `spring.datasource.*` leniently and does not name it) | Set every Aiven variable on the Render service (or re-sync the Blueprint prompts) and redeploy; the log line shows which placeholder is unresolved |
| `/api/health` returns `503` with `"database":"DOWN"` | Wrong Aiven host/port/user/password, database not created, or the Aiven IP allow-list blocks Render | Re-check the Aiven connection info, create `phonebook_db` (or set `DB_NAME=defaultdb`), review `pb`/Render logs for `Access denied` / `Unknown database` |
| Log: `Access denied for user 'avnadmin'@'...'` | Wrong password or missing grants | Re-copy the Aiven password, or grant privileges to the app user |
| Log: `SSL connection required` / `sslMode` errors | Aiven refuses plaintext connections | Keep `DB_SSL_MODE=REQUIRED` (or higher) - never `DISABLED` in production |
| Log: `Communications link failure` after a quiet period | Aiven closed an idle connection | Already mitigated by `max-lifetime=240s` + `keepalive-time=60s`; check `DB_POOL_MAX_SIZE` is within the Aiven connection limit |
| Log: `javax.net.ssl.SSLHandshakeException: ... unable to find valid certification path` | `VERIFY_IDENTITY` without a CA truststore | Either revert to `DB_SSL_MODE=REQUIRED` or add `certs/aiven-ca.pem` and set `DB_SSL_EXTRA` |
| Log: `trustCertificateKeyStorePassword was incorrect` | `DB_SSL_EXTRA` password differs from the build arg `TRUSTSTORE_PASSWORD` | Use the same password or rebuild with the new one |
| Render: `502 Bad Gateway` right after a deploy | App not listening on `$PORT`, or crashed during startup | Confirm `server.port=${PORT:8080}` was not overridden and no custom Start Command was set; check the logs for the stack trace |
| Render: build fails `COPY failed: file not found: pom.xml` | Root Directory / Dockerfile Path misconfigured | Root Directory must be `backend` (the Docker context), Dockerfile Path left empty |
| Browser: `blocked by CORS policy` on `POST /api/auth/login` | Origin missing from `APP_CORS_ALLOWED_ORIGINS` | Add the exact origin (scheme + host, no trailing slash); check the log line `CORS allowed origins: [...]`; redeploy |
| Preflight returns `403 Invalid CORS request` | Origin not allow-listed | Same as above |
| Browser console: `[ContactNest] VITE_API_BASE_URL is not set` | Variable missing at build time | Set it in the Netlify UI / `netlify.toml`, then **Clear cache and deploy site** |
| Requests go to `<netlify-site>/api/...` (404) | `VITE_API_BASE_URL` missing or `netlify.toml` value overridden | Fix the value and rebuild - Vite inlines env vars at build time, so a rebuild is mandatory |
| Netlify build fails: `npm ci ... lock file out of sync` | `package.json` and `package-lock.json` diverge | Run `npm install` locally, commit the updated lockfile |
| Netlify build fails: `You installed esbuild for another platform` | A platform-specific esbuild package was added to `dependencies` | Keep platform binaries out of `package.json` (already done) and clear the Netlify build cache |
| Refresh on a deep link returns Netlify 404 | SPA redirect missing | Keep the `[[redirects]] /* → /index.html` rule in `netlify.toml` |
| Login works but every reload logs the user out | `JWT_SECRET` changed (Render regenerated it) | Keep the generated value, or set a fixed secret you control |
| First request after idle takes ~60 s | Render free instances sleep | Expected; upgrade the instance type or keep it warm |
| `mvn package` on Windows fails with `Unable to rename ... .jar.original` | A running instance of the jar locks the file | Stop the local app (`Get-Process java` → `Stop-Process`) and rebuild |

---

## 8. Operating the deployment

### Deploying changes

| Change | What to do |
| ------ | ---------- |
| Backend code | `git push` → Render rebuilds the Docker image (`autoDeployTrigger: commit`) and switches over once `/api/health` passes |
| Frontend code | `git push` → Netlify rebuilds and publishes atomically |
| Backend environment variable | Render → Environment → edit/save (triggers a redeploy); or update `render.yaml` and **Sync** the Blueprint |
| Frontend environment variable | Netlify → Environment variables, then **Deploys → Trigger deploy → Clear cache and deploy site** (Vite inlines values at build time) |
| `render.yaml` structure change | Render → Blueprint → **Sync** |

### Rollback

- **Render**: service → *Deploys* → pick the last good deploy → **Rollback**.
  (Environment variables are rolled back too, so re-check them.)
- **Netlify**: site → *Deploys* → last good deploy → **Publish deploy**.
- **Database**: schema changes made by `ddl-auto=update` are not reverted by an
  app rollback - restore from an Aiven backup if needed.

### Rotating secrets

| Secret | Procedure | Impact |
| ------ | --------- | ------ |
| `JWT_SECRET` | New value in Render → redeploy | All users are logged out |
| `DB_PASSWORD` | Reset in the Aiven console → update `DB_PASSWORD` on Render → redeploy | Brief connection errors during the switch |
| Aiven CA certificate | Download the new `ca.pem` → replace `backend/certs/aiven-ca.pem` → push | Only affects `VERIFY_*` modes |

### Backups and disaster recovery

- Aiven runs automatic backups according to the plan; paid plans add
  point-in-time recovery. Check the *Backups* tab of the service.
- Independent export (recommended before risky changes):

  ```powershell
  mysqldump -h <DB_HOST> -P <DB_PORT> -u avnadmin -p --ssl-mode=REQUIRED `
    --single-transaction --set-gtid-purged=OFF phonebook_db > phonebook_db_backup.sql
  ```

- Restore: `mysql ... phonebook_db < phonebook_db_backup.sql`.
- A deleted account (and its contacts) cannot be recovered unless a backup
  exists - the API deletes rows permanently by design.

### Scaling and cost notes

| Service | Free tier reality |
| ------- | ----------------- |
| Netlify | 100 GB bandwidth/month, HTTPS + CDN included; no cold starts |
| Render | Free web services sleep after ~15 min idle (30-60 s cold start) and have 512 MB RAM; `JAVA_OPTS` already sizes the heap to ~70 % of that |
| Aiven | Free MySQL plans are limited in size/backups, and connection limits are low - keep `DB_POOL_MAX_SIZE` small (5 is a safe default) |

Both Render and Aiven allow plan changes without changing your configuration;
only `plan:` in `render.yaml` (and the Aiven console) needs updating.

### Logs and monitoring

- **Render**: *Logs* tab or a Log Stream; look for `CORS allowed origins`,
  `HikariPool-1 - Start completed`, `Started PhonebookApplication`.
- **Netlify**: build logs per deploy; *Functions/Edge* logs are unused here.
- **Aiven**: service *Logs* tab, plus metrics for connections, CPU and disk.
- External uptime checks should hit `https://<render-service>.onrender.com/api/health`
  (it validates the database too, so it is a true readiness probe).

### Local development (unchanged)

```powershell
# backend - uses the local MySQL defaults from application.properties
cd backend; mvn spring-boot:run

# frontend - Vite proxies /api to http://localhost:8080
cd frontend; npm run dev
```

To develop the frontend against the deployed API:

```powershell
cd frontend
$env:VITE_API_BASE_URL="https://phonebook-backend.onrender.com"; npm run build
npm run dev   # or preview the built bundle with: npm run preview
```

To run the backend against Aiven locally, copy `backend/.env.example` to
`backend/.env.local`, fill in the Aiven values, and start the jar with those
variables exported (`SPRING_PROFILES_ACTIVE=prod`).

---

## Appendix - quick command reference

| Task | Command |
| ---- | ------- |
| Build the jar | `cd backend; mvn -B -DskipTests package` |
| Run the jar (local DB) | `java -jar backend/target/phonebook-backend-0.0.1-SNAPSHOT.jar` |
| Build the production image | `cd backend; docker build -t phonebook-backend .` |
| Run the image with prod env | `docker run --rm -p 8080:8080 --env-file backend/.env.local phonebook-backend` |
| Frontend dev server | `cd frontend; npm run dev` |
| Frontend production build | `cd frontend; $env:VITE_API_BASE_URL="https://phonebook-backend.onrender.com"; npm run build` |
| Preview the built bundle | `cd frontend; npm run preview` |
| Generate a JWT secret | `openssl rand -base64 48` |
| Build the Aiven truststore | `backend/scripts/create-aiven-truststore.ps1 -CaPemPath backend/certs/aiven-ca.pem` |
| Health check | `curl.exe https://phonebook-backend.onrender.com/api/health` |
