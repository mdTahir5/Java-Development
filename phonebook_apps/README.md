# ContactNest - Phonebook App

Full-stack phonebook / contact manager.

| Layer     | Stack                                              | Local dev                          | Production |
| --------- | -------------------------------------------------- | ---------------------------------- | ---------- |
| Frontend  | React 18, Vite 5, Tailwind CSS, Axios, lucide-react | `http://localhost:5173`            | Netlify |
| Backend   | Spring Boot 3.3 (Java 21), Spring Security, JWT (JJWT 0.12), JPA/Hibernate | `http://localhost:8080`  | Render (Docker) |
| Database  | MySQL 8 (JPA entities `users`, `contacts`)          | local MySQL `phonebook_db`         | Aiven for MySQL (TLS) |

```
Browser ──HTTPS──> Netlify (static React build)
                      │  Axios: VITE_API_BASE_URL + /api
                      ▼
                  Render web service (Spring Boot jar in Docker, SPRING_PROFILES_ACTIVE=prod)
                      │  JDBC over TLS (sslMode=REQUIRED / VERIFY_IDENTITY)
                      ▼
                  Aiven for MySQL
```

## Repository layout

```
phonebook_app/
├─ backend/                  Spring Boot API (Maven, Java 21)
│  ├─ Dockerfile             production image used by Render
│  ├─ certs/                 optional Aiven CA certificate + truststore notes
│  ├─ scripts/               helper to build the PKCS12 truststore
│  ├─ .env.example           backend environment variable template
│  └─ src/main/resources/
│     ├─ application.properties       local defaults (env-overridable)
│     └─ application-prod.properties  production values (Aiven, CORS, JWT)
├─ frontend/                 React + Vite client
│  ├─ .env.example           frontend environment variable template
│  └─ src/api/axiosClient.js reads VITE_API_BASE_URL
├─ db/schema.sql             optional explicit MySQL schema
├─ netlify.toml              Netlify build/redirect/header configuration
├─ render.yaml               Render Blueprint (Docker web service + env vars)
└─ DEPLOYMENT.md             step-by-step production deployment + verification
```

## Local development

Backend (needs a local MySQL; defaults are in `application.properties`):

```powershell
cd backend
mvn spring-boot:run            # http://localhost:8080
```

Frontend (Vite proxies `/api` to `http://localhost:8080`, so no configuration is required):

```powershell
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

Point the dev server at the deployed API instead of a local backend:

```powershell
$env:API_PROXY_TARGET="https://phonebook-backend.onrender.com"; npm run dev
```

## Production

Everything needed to deploy the three services (Aiven, Render, Netlify), the
environment-variable reference and a full verification checklist live in
**[DEPLOYMENT.md](DEPLOYMENT.md)**.

Quick summary:

- Backend: Render web service, `runtime: docker`, `rootDir: backend`,
  `SPRING_PROFILES_ACTIVE=prod`, health check `/api/health`.
- Frontend: Netlify site, base directory `frontend`, build `npm ci && npm run build`,
  publish `dist`, `VITE_API_BASE_URL=https://<render-service>.onrender.com`.
- Database: Aiven for MySQL, TLS required, credentials passed only through
  environment variables (never committed).
