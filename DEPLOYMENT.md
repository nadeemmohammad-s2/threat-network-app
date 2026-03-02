# Threat Network App — Deployment Guide

This document captures the full deployment setup for the Threat Network App on Google Cloud Platform, including all configuration decisions, fixes, and environment variables required to run the system.

---

## Architecture

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐     ┌─────────────────────────────┐
│  threat-network-app             │────▶│  threat-network-api             │────▶│  Cloud SQL (PostgreSQL)     │
│  Cloud Run (us-west4)           │     │  Cloud Run (us-central1)        │     │  section2-bank-info         │
│  https://threat-network-app-    │     │  https://threat-network-api-    │     │  database: threat_network   │
│  807423602117.us-west4.run.app  │     │  807423602117.us-central1       │     │  user: s2-postgresql-usr    │
└─────────────────────────────────┘     │  .run.app                       │     └─────────────────────────────┘
                                        └─────────────────────────────────┘
```

---

## GCP Services Used

| Service | Name | Region |
|---|---|---|
| Cloud Run | `threat-network-app` | us-west4 |
| Cloud Run | `threat-network-api` | us-central1 |
| Cloud SQL | `section2-bank-info` | us-west4 |
| Cloud Build | Trigger: `rmgpgab-threat-network-app-us-west4-nadeemmohammad-s2-threattHz` | global |
| Artifact Registry | `cloud-run-source-deploy` | us-west4 |

---

## Repository Structure

```
threat-network-app/
├── .dockerignore               # Excludes node_modules, dist, api/, db/ from Docker context
├── Dockerfile                  # Builds frontend React app with nginx
├── docker-compose.yml          # Local development setup
├── db/
│   ├── 01_scd2_audit.sql       # Core schema + SCD2 versioning + audit triggers
│   ├── 02_provenance.sql       # Provenance/citations schema
│   ├── 03_seed.sql             # Sample threat network data (3 networks)
│   ├── 04_entity_tables.sql    # Persons, Organizations, Countries, Boundaries, Subclasses
│   ├── 05_reference_tables.sql # 30 reference/lookup tables
│   ├── 06_htf_reference_tables.sql # HTF reference data
│   ├── 07_phases_1_to_5.sql    # Junction tables and phase data
│   └── 08_rename_provenance_source.sql # Schema rename migration
├── api/
│   └── src/
│       ├── server.js           # Express entry point
│       ├── db/pool.js          # PostgreSQL connection pool
│       └── routes/             # API route handlers
└── frontend/
    ├── .env.production         # NOT used (URL hardcoded in source — see below)
    ├── src/
    │   ├── App.tsx             # Root component — imports ThreatNetworkApp
    │   ├── threat_network_ui.jsx  # Main UI component (1100+ lines)
    │   └── threat_network_ui.d.ts # TypeScript declaration for JSX module
    └── ...
```

---

## Frontend (threat-network-app)

### Dockerfile

The root `Dockerfile` builds the React/Vite frontend and serves it with nginx on port 8080 (required by Cloud Run):

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN printf 'server {\n  listen 8080;\n  location / {\n    root /usr/share/nginx/html;\n    index index.html;\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### API URL Configuration

The API base URL is **hardcoded** in `frontend/src/threat_network_ui.jsx` line 4:

```js
const API_BASE = "https://threat-network-api-807423602117.us-central1.run.app/api";
```

> ⚠️ If the API Cloud Run URL ever changes, update this line and redeploy the frontend.

### Key Files Fixed During Deployment

| File | Issue | Fix |
|---|---|---|
| `Dockerfile` | Missing from repo root | Created with nginx serving on port 8080 |
| `.dockerignore` | Named `dockerignore` (missing dot) | Renamed to `.dockerignore` |
| `frontend/src/App.tsx` | Was default Vite boilerplate | Replaced to import `ThreatNetworkApp` |
| `frontend/src/threat_network_ui.jsx` | API_BASE pointed to `localhost:3001` | Hardcoded production API URL |
| `frontend/src/threat_network_ui.d.ts` | Missing — caused TypeScript build error | Created type declaration for JSX module |
| `frontend/src/App.jsx` | Duplicate of old UI with `localhost:3001` | Deleted — was overriding `App.tsx` |

### Cloud Build Trigger

The Cloud Build trigger automatically builds and deploys on every push to `main`. If a build uses a cached image unexpectedly, manually trigger from **Cloud Build → Triggers → Run**.

---

## API (threat-network-api)

### Environment Variables

Set these in **Cloud Run → threat-network-api → Edit & Deploy → Variables & Secrets**:

| Variable | Value |
|---|---|
| `DB_HOST` | Cloud SQL public IP |
| `DB_PORT` | `5432` |
| `DB_NAME` | `threat_network` |
| `DB_USER` | `s2-postgresql-usr` |
| `DB_PASSWORD` | *(stored securely — do not commit)* |
| `CORS_ORIGINS` | `https://threat-network-app-807423602117.us-west4.run.app` |
| `NODE_ENV` | `production` |

### CORS Configuration

CORS is configured in `api/src/server.js` using the `CORS_ORIGINS` environment variable:

```js
app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
}));
```

> ⚠️ If the frontend URL ever changes, update `CORS_ORIGINS` in the API Cloud Run environment variables.

---

## Database (Cloud SQL)

### Instance Details

| Setting | Value |
|---|---|
| Instance | `section2-bank-info` |
| Region | `us-west4` |
| Database | `threat_network` |
| Owner | `s2-postgresql-usr` |
| PostgreSQL version | 16 |

### Running Migrations

All migrations must be run **in order** using `s2-postgresql-usr` (the database owner):

```bash
# Clone the repo in Cloud Shell first
git clone https://github.com/nadeemmohammad-s2/threat-network-app.git
cd threat-network-app

# Create schemas first
gcloud sql connect section2-bank-info --user=s2-postgresql-usr --database=threat_network --quiet << 'EOF'
CREATE SCHEMA IF NOT EXISTS audit AUTHORIZATION "s2-postgresql-usr";
CREATE SCHEMA IF NOT EXISTS provenance AUTHORIZATION "s2-postgresql-usr";
EOF

# Run all migrations in order
gcloud sql connect section2-bank-info --user=s2-postgresql-usr --database=threat_network --quiet < db/01_scd2_audit.sql
gcloud sql connect section2-bank-info --user=s2-postgresql-usr --database=threat_network --quiet < db/02_provenance.sql
gcloud sql connect section2-bank-info --user=s2-postgresql-usr --database=threat_network --quiet < db/03_seed.sql
gcloud sql connect section2-bank-info --user=s2-postgresql-usr --database=threat_network --quiet < db/04_entity_tables.sql
gcloud sql connect section2-bank-info --user=s2-postgresql-usr --database=threat_network --quiet < db/05_reference_tables.sql
gcloud sql connect section2-bank-info --user=s2-postgresql-usr --database=threat_network --quiet < db/06_htf_reference_tables.sql
gcloud sql connect section2-bank-info --user=s2-postgresql-usr --database=threat_network --quiet < db/07_phases_1_to_5.sql
gcloud sql connect section2-bank-info --user=s2-postgresql-usr --database=threat_network --quiet < db/08_rename_provenance_source.sql
```

> ⚠️ Always use `s2-postgresql-usr` — `postgres` does not have ownership of the `threat_network` database in this instance.

### Known Migration Warnings (Non-blocking)

- `gin_trgm_ops` index error in `06_htf_reference_tables.sql` — text search optimization, skipped safely
- `RAISE NOTICE` syntax error at end of `03_seed.sql` — final print statement only, all data inserted successfully

---

## Local Development

```bash
# Start everything with Docker Compose
docker compose up -d

# API will be at http://localhost:3001
# Frontend at http://localhost:3000

# Run migrations manually if needed
psql -U threat_admin -d threat_network -f db/01_scd2_audit.sql
# ... repeat for all migration files
```

---

## Planned Improvements

- [ ] **Google Authentication** — Restrict login to `@section2.com` email domain using OAuth2 + Passport.js
- [ ] **Junction table CRUD** — Add POST/PUT/DELETE endpoints for relationships, persons, countries
- [ ] **Source impact analysis** — Endpoint to find all fields affected when a source is discredited
- [ ] **Intelligence gap dashboard** — Aggregate uncited fields across all records
- [ ] **Audit log partitioning** — Partition `audit.change_log` by year when volume grows

---

## Troubleshooting

### "Failed to fetch" in the UI
1. Check browser DevTools → Network tab for the failing request URL
2. If calling `localhost:3001` — the old bundle is cached. Hard refresh (`Ctrl+Shift+R`) or check `threat_network_ui.jsx` line 4
3. If getting CORS error — verify `CORS_ORIGINS` env var on `threat-network-api` Cloud Run service
4. If getting 500 — check API logs in Cloud Run → `threat-network-api` → Logs tab

### Bundle hash not changing after code updates
- Verify the correct file was committed: `git show HEAD:frontend/src/threat_network_ui.jsx | head -5`
- Check for duplicate files: ensure `frontend/src/App.jsx` does not exist (it overrides `App.tsx`)
- Manually trigger a fresh Cloud Build from Cloud Build → Triggers → Run

### Database permission errors
- Always connect as `s2-postgresql-usr` for the `threat_network` database
- The `postgres` user does not own this database and cannot create schemas or tables in it
