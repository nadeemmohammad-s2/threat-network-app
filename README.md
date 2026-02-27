# Threat Network Database — Full Stack Application

A three-layer intelligence analysis platform: **SCD Type 2 versioning** on the core entity, **universal audit logging** across all tables, and **field-level provenance tracking** for per-field source attribution.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────────────┐
│   React UI       │────▶│   Express API    │────▶│   PostgreSQL 16              │
│   (port 3000)    │ REST│   (port 3001)    │ pg  │   (port 5432)               │
│                  │◀────│                  │◀────│                              │
│  • List + search │     │  • /threat-nets  │     │  • threat_network (SCD2)     │
│  • Detail tabs   │     │  • /provenance   │     │  • audit.change_log          │
│  • Inline cites  │     │  • /audit        │     │  • provenance.field_citation │
│  • Edit + save   │     │  • User context  │     │  • 7 junction tables         │
└──────────────────┘     └──────────────────┘     │  • Stored procedures         │
                                                   └──────────────────────────────┘
```

## Quick Start (Docker)

The fastest way to get everything running:

```bash
# 1. Clone or copy this directory
cd threat-network-app

# 2. Start PostgreSQL + API with one command
docker compose up -d

# 3. Verify
curl http://localhost:3001/api/health
# → {"status":"ok","database":"threat_network","time":"..."}

# 4. List threat networks
curl http://localhost:3001/api/threat-networks
```

Docker Compose will:
- Start PostgreSQL 16 and auto-run all SQL migration + seed scripts
- Start the Express API connected to the database
- Expose the API on port 3001

## Quick Start (Manual / No Docker)

### Prerequisites
- **PostgreSQL 14+** installed and running
- **Node.js 18+** installed

### Step 1: Create the Database

```bash
# Create the database and user
psql -U postgres -c "CREATE USER threat_admin WITH PASSWORD 'changeme';"
psql -U postgres -c "CREATE DATABASE threat_network OWNER threat_admin;"
psql -U postgres -c "ALTER USER threat_admin WITH SUPERUSER;"  # needed for CREATE EXTENSION

# Run migrations in order
psql -U threat_admin -d threat_network -f db/01_scd2_audit.sql
psql -U threat_admin -d threat_network -f db/02_provenance.sql
psql -U threat_admin -d threat_network -f db/03_seed.sql
```

Or use the migration runner:

```bash
cd api
cp .env.example .env    # Edit with your DB credentials
npm install
npm run db:setup -- --seed
```

### Step 2: Start the API

```bash
cd api
cp .env.example .env    # Edit .env with your DB credentials
npm install
npm run dev             # Starts with --watch for auto-reload
```

### Step 3: Start the Frontend

The React UI (threat_network_ui.jsx) is designed as an artifact/component. To run it in a standard React setup:

```bash
# Option A: Use Vite
npm create vite@latest frontend -- --template react
cd frontend
# Copy threat_network_ui.jsx into src/App.jsx
# Update the API_BASE constant to point to http://localhost:3001/api
npm run dev
```

## API Reference

### Threat Networks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/threat-networks` | List current threat networks (filterable) |
| `GET` | `/api/threat-networks/:id` | Full detail with all junction data |
| `PUT` | `/api/threat-networks/:id` | Update via SCD2 upsert |
| `DELETE` | `/api/threat-networks/:id` | Soft delete |
| `POST` | `/api/threat-networks/:id/rollback` | Restore a historical version |
| `GET` | `/api/threat-networks/:id/history` | Version timeline |
| `GET` | `/api/threat-networks/:id/compare?sk_old=X&sk_new=Y` | Field-level diff |
| `GET` | `/api/threat-networks/as-of/:timestamp` | Point-in-time snapshot |

#### Query Parameters (List)

| Param | Example | Description |
|-------|---------|-------------|
| `category` | `TCO` | Filter by category |
| `status` | `Active` | Filter by status |
| `violence` | `Very High` | Filter by violence level |
| `search` | `sinaloa` | Full-text search (name, acronym, category, HQ) |
| `limit` | `50` | Pagination limit (default 100) |
| `offset` | `0` | Pagination offset |

#### Update Example (PUT)

```bash
curl -X PUT http://localhost:3001/api/threat-networks/1 \
  -H "Content-Type: application/json" \
  -d '{
    "change_reason": "Updated membership estimate per 2025 NDTA",
    "user_id": 7,
    "name": "Sinaloa Cartel",
    "acronym": "CDS",
    "category": "TCO",
    "subcategory": "Drug Trafficking",
    "primary_motivation": "Financial",
    "estimated_membership": "15,000–50,000",
    "geo_area_operations": "North America, Central America, Europe",
    "network_type": "Hybrid",
    "sources": "DEA NDTA 2025"
  }'
```

This creates a new SCD2 version (v2) while preserving v1 as a historical snapshot.

### Provenance

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/provenance/citations/:table/:pk` | All citations for a record, grouped by field |
| `GET` | `/api/provenance/coverage/:table/:pk` | Citation coverage summary |
| `GET` | `/api/provenance/gaps/:table/:pk` | Uncited fields (intelligence gaps) |
| `POST` | `/api/provenance/citations` | Add a citation |
| `POST` | `/api/provenance/citations/bulk` | Bulk-add citations from one source |
| `POST` | `/api/provenance/citations/:id/supersede` | Replace a citation |
| `GET` | `/api/provenance/validate` | Find orphaned/broken citations |
| `GET` | `/api/provenance/sources` | List all sources |
| `POST` | `/api/provenance/sources` | Register a new source |
| `GET` | `/api/provenance/fields/:table` | Citable field registry |

#### Add Citation Example

```bash
curl -X POST http://localhost:3001/api/provenance/citations \
  -H "Content-Type: application/json" \
  -d '{
    "table_name": "threat_network",
    "record_pk": "1",
    "field_name": "estimated_membership",
    "source_id": 1,
    "confidence_level": "high",
    "analyst_user_id": 7,
    "obtained_date": "2025-02-10",
    "is_primary": true,
    "notes": "Page 47, Table 3.2 — membership estimate for 2025"
  }'
```

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/audit/:table/:pk` | Full change log for any table/record |

## Project Structure

```
threat-network-app/
├── docker-compose.yml          # One-command local deployment
├── db/
│   ├── 01_scd2_audit.sql       # Core schema + SCD2 + audit triggers
│   ├── 02_provenance.sql       # Provenance extension
│   └── 03_seed.sql             # Sample data
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js           # Express entry point
│       ├── db/
│       │   ├── pool.js         # Connection pool + withUser()
│       │   └── migrate.js      # Migration runner
│       └── routes/
│           ├── threatNetworks.js   # CRUD + SCD2 operations
│           ├── provenance.js       # Citations + sources
│           └── audit.js            # Change log queries
└── frontend/
    └── (React UI)
```

## Key Design Decisions

### API maps directly to SQL stored procedures

The Express routes are thin wrappers around the PostgreSQL procedures and views defined in the SQL files. Business logic lives in the database, not the API. This means:

- `PUT /threat-networks/:id` → calls `sp_threat_network_upsert()`
- `DELETE /threat-networks/:id` → calls `sp_threat_network_soft_delete()`
- `POST /threat-networks/:id/rollback` → calls `sp_threat_network_rollback()`
- `POST /provenance/citations` → calls `provenance.sp_add_citation()`

### User context for audit tracking

Every mutating API call wraps its queries in `withUser(userId, fn)`, which starts a transaction and sets `app.current_user_id` via `set_config()`. This means the audit trigger automatically captures who made every change, even on tables that don't have a `user_id` column.

### Junction table data is eager-loaded

`GET /threat-networks/:id` returns the full record with all 7 junction tables loaded in a single response. This avoids waterfall requests from the frontend and keeps the UI snappy. The 7 parallel queries add minimal overhead.

## Next Steps

- [ ] **Authentication** — Add JWT or session-based auth; map real user IDs to `app.current_user_id`
- [ ] **Wire the React frontend** — Replace mock data with `fetch()` calls to the API
- [ ] **Junction table CRUD** — Add POST/PUT/DELETE endpoints for relationships, persons, countries, etc.
- [ ] **Source impact analysis** — Endpoint to find all fields affected when a source is discredited
- [ ] **Intelligence gap dashboard** — Aggregate `fn_uncited_fields` across all records
- [ ] **Partitioning** — Partition `audit.change_log` by year when volume warrants it
