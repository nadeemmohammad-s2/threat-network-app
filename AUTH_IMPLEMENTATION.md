# Google Authentication Implementation

This document captures everything that was done to enable Google Single Sign-On (SSO) on Hybrid Threat Central, including session timeout, role-based access control (RBAC), and an admin panel for user management.

---

## What Was Built

| Component | Description |
|---|---|
| Google OAuth login | Restricted to `@section2.com` accounts only |
| Session management | Inactivity warning at 90 min, auto-logout at 2 hours, 8-hour absolute max |
| RBAC user groups | `admins`, `analysts`, `read_only` — route-level access control |
| Admin panel UI | In-app user and group management, no code changes or redeployment required |
| Session persistence | Sessions stored in PostgreSQL, survive API restarts |

---

## Architecture

```
Frontend (us-west4)          API (us-central1)           PostgreSQL
─────────────────────        ─────────────────────       ─────────────────
App.tsx                 →    /auth/google            →   Google OAuth
  checks /auth/me             /auth/google/callback       users table
  stores sid in              /auth/me                     user_sessions
  localStorage               /auth/logout                 user_groups
                                                          groups
threat_network_ui.jsx   →    /api/*                  →   threat_network DB
  sends x-session-id          isAuthenticated             (all existing tables)
  header on every call        requireGroup
```

---

## Files Changed

### New Files
| File | Purpose |
|---|---|
| `api/src/auth.js` | Passport Google strategy — upserts user on login, loads groups |
| `api/src/middleware/auth.js` | `isAuthenticated` and `requireGroup` middleware |
| `api/src/routes/authRoutes.js` | `/auth/google`, `/auth/me`, `/auth/logout` endpoints |
| `api/src/routes/adminRoutes.js` | Admin CRUD endpoints for users and groups |
| `frontend/src/LoginScreen.tsx` | Google Sign-In button UI |
| `frontend/src/AdminPanel.jsx` | Full admin panel for user and group management |

### Modified Files
| File | What Changed |
|---|---|
| `api/src/server.js` | Added session middleware, passport, CORS headers, auth routes, protected API routes |
| `api/package.json` | Added `passport`, `passport-google-oauth20`, `express-session`, `connect-pg-simple` |
| `frontend/src/App.tsx` | Added auth state, session check, inactivity timeout, admin toggle |
| `frontend/src/threat_network_ui.jsx` | Updated `api()` function to send `x-session-id` header and handle 401s |

---

## Database Tables Added

Run these migrations on the `threat_network` database as `s2-postgresql-usr`:

```sql
-- Session storage (used by connect-pg-simple)
CREATE TABLE IF NOT EXISTS user_sessions (
  sid     VARCHAR NOT NULL PRIMARY KEY,
  sess    JSON NOT NULL,
  expire  TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON user_sessions (expire);

-- Users (auto-created on first login)
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  google_id   VARCHAR UNIQUE NOT NULL,
  email       VARCHAR UNIQUE NOT NULL,
  name        VARCHAR,
  photo       VARCHAR,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  last_login  TIMESTAMP,
  last_active TIMESTAMP
);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR UNIQUE NOT NULL,
  description VARCHAR,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- User to Group assignments
CREATE TABLE IF NOT EXISTS user_groups (
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  group_id    INT REFERENCES groups(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by INT REFERENCES users(id),
  PRIMARY KEY (user_id, group_id)
);

-- Default groups
INSERT INTO groups (name, description) VALUES
  ('admins',    'Full access including user management and audit logs'),
  ('analysts',  'Read and write access to threat networks and entities'),
  ('read_only', 'Read-only access to threat networks and entities')
ON CONFLICT (name) DO NOTHING;
```

---

## GCP Configuration

### OAuth Consent Screen
- **Location:** GCP Console → APIs & Services → OAuth Consent Screen
- **Type:** Internal (Google Workspace only)
- **App name:** Hybrid Threat Central

### OAuth Client ID
- **Location:** GCP Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
- **Authorized JavaScript origins:** `https://threat-network-app-807423602117.us-west4.run.app`
- **Authorized redirect URIs:** `https://threat-network-api-807423602117.us-central1.run.app/auth/google/callback`

### Cloud Run Environment Variables (threat-network-api)
| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | From OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | From OAuth credentials |
| `GOOGLE_CALLBACK_URL` | `https://threat-network-api-807423602117.us-central1.run.app/auth/google/callback` |
| `SESSION_SECRET` | Generated with `openssl rand -base64 32` |
| `FRONTEND_URL` | `https://threat-network-app-807423602117.us-west4.run.app` |

---

## How Cross-Origin Sessions Work

The frontend (`us-west4`) and API (`us-central1`) are on different domains, so browser cookies cannot be shared directly. The solution uses a **session ID header**:

1. After Google login, the API saves the session to PostgreSQL and redirects to the frontend with `?sid=SESSION_ID` in the URL
2. The frontend stores the `sid` in `localStorage`
3. Every API call sends `x-session-id: SESSION_ID` as a request header
4. The API middleware reconstructs the signed session cookie from the header value and passes it to `express-session` for validation

This approach works around the cross-origin cookie restriction without requiring both services to be on the same domain.

---

## Group Permission Matrix

| Route | admins | analysts | read_only |
|---|---|---|---|
| `GET /api/threat-networks` | ✅ | ✅ | ✅ |
| `PUT /api/threat-networks/:id` | ✅ | ✅ | ❌ |
| `GET /api/entities` | ✅ | ✅ | ✅ |
| `POST /api/entities` | ✅ | ✅ | ❌ |
| `GET /api/ref` | ✅ | ✅ | ✅ |
| `GET /api/provenance` | ✅ | ✅ | ❌ |
| `POST /api/provenance` | ✅ | ✅ | ❌ |
| `GET /api/audit` | ✅ | ❌ | ❌ |
| `GET /api/admin/*` | ✅ | ❌ | ❌ |

---

## Session Timeout Behaviour

| Event | Timing | What Happens |
|---|---|---|
| Inactivity warning | 90 minutes idle | Yellow banner appears with "Stay Logged In" button |
| Inactivity auto-logout | 2 hours idle | Automatic logout, redirected to login screen |
| Absolute session max | 8 hours | Cookie expires regardless of activity |
| Server-side check | Every API request | 401 returned if session expired, frontend redirects to login |
| Session cleanup | Every 15 minutes | Expired sessions pruned from `user_sessions` table |

---

## First-Time Admin Setup

After deployment, the first admin must be assigned via Cloud Shell since no users exist yet:

```bash
# 1. Log in to the app first so your user record is created
# 2. Then run this in Cloud Shell to assign yourself as admin:

PGPASSWORD='your-db-password' psql -h YOUR_DB_IP -U s2-postgresql-usr -d threat_network -c "
INSERT INTO user_groups (user_id, group_id)
SELECT u.id, g.id
FROM users u, groups g
WHERE u.email = 'your.email@section2.com'
AND g.name = 'admins'
ON CONFLICT DO NOTHING;"

# 3. Log out and log back in — the admin panel will now appear
```

After this, all future user and group management can be done through the **Admin Panel** in the app itself — no further Cloud Shell access required.

---

## Admin Panel

The admin panel is accessible only to users in the `admins` group. It appears as a **⬡ floating button** in the bottom-right corner of the app.

### Users Tab
- View all users who have logged in
- Search and filter by name, email, group, or status
- Assign users to groups with one click
- Remove users from groups
- Activate or deactivate user accounts

### Groups Tab
- View all groups with member counts
- Create new custom groups with a name and description

### Key principle
All user and group management is handled through this UI — no code changes or redeployment are ever needed to grant or revoke access.

---

## Deployment Notes

### API deployment (manual — no auto-trigger exists)
Any changes to the API must be deployed manually:
```bash
gcloud run deploy threat-network-api \
  --source ./api \
  --region us-central1 \
  --project section2-475402
```

### Frontend deployment (auto-trigger on push to main)
Frontend changes deploy automatically via Cloud Build trigger `61792a64-5a2a-4f60-9c5f-0033477d20e0` on every push to `main`. To trigger manually:
```bash
gcloud builds triggers run 61792a64-5a2a-4f60-9c5f-0033477d20e0 \
  --branch=main \
  --project=section2-475402
```

---

## Troubleshooting

### Login redirects back to login screen
- Check API logs: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=threat-network-api" --project=section2-475402 --limit=20 --format="value(textPayload)" --freshness=5m`
- Check if user was created: `SELECT * FROM users;`
- Check if sessions table exists: `SELECT COUNT(*) FROM user_sessions;`

### "Failed to load / Unauthorized" after login
- User has no group assigned yet
- Assign via Admin Panel or Cloud Shell (see First-Time Admin Setup above)
- Log out and back in after group assignment

### Login screen not appearing for returning users
- Expected behaviour — users already signed into Google are authenticated automatically
- To test the full login flow, use a different browser where Google is not signed in

### App not sending session to API
- Check `localStorage` for `sid` key in browser DevTools → Application → Local Storage
- If missing, the session was not captured after login — try logging out and back in
- Check CORS headers: `curl -v -H "Origin: https://threat-network-app-807423602117.us-west4.run.app" https://threat-network-api-807423602117.us-central1.run.app/auth/me 2>&1 | grep -i access-control`

### Deserialize error in API logs
- Old sessions stored the full user object instead of just the user ID
- Clear all sessions: `DELETE FROM user_sessions;`
- All users will need to log in again
