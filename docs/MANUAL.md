# Hathor Manual (How It Works Now)

This is the practical guide for anyone (developer, operator, or curious teammate) who needs to understand and run the current Hathor stack quickly.

## 1) What this project is

Hathor is a full-stack music platform with:
- user auth,
- song upload/listing/playback metadata,
- AI endpoints for playlist/recommendation/chat flows,
- real-time listening rooms via Socket.io,
- PostgreSQL for persistent data,
- Redis for cache + shared real-time state.

## 2) High-level architecture

- **Frontend (`client/`)**: React app, talks to REST API + Socket.io.
- **Backend (`server/`)**: Express API, auth, business logic, room sync.
- **Database (`database/`)**: SQL schema and seed data.
- **Infra configs**: Docker + deployment docs for Railway/Render and others.

Core flow:
1. User authenticates and receives JWT.
2. Frontend sends JWT on protected API requests.
3. Backend reads/writes data in PostgreSQL.
4. Backend uses Redis for low-latency state/caching.
5. Socket.io broadcasts room/playback events to connected clients.

## 3) Local setup (recommended path)

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+

### Install
```bash
npm install
cd client && npm install && cd ..
```

### Create and load database
```bash
createdb hathor_music
psql -d hathor_music -f database/schema.sql
# optional sample data
psql -d hathor_music -f database/seed.sql
```

### Configure environment
```bash
cp .env.example .env
```
Then update at least:
- DB credentials (`DB_*` or `DATABASE_URL`)
- Redis config (`REDIS_*` or `REDIS_URL`)
- `JWT_SECRET`
- `CLIENT_URL`

### Run app
```bash
npm run dev
```

Default local URLs:
- Frontend: `http://localhost:3000`
- API base: `http://localhost:5000/api`
- Health: `http://localhost:5000/api/health`

## 4) Day-to-day commands

From repo root:

```bash
npm run dev          # full stack dev
npm run server       # backend only
npm run client       # frontend only
npm run build        # frontend build
npm run test         # jest tests
npm run validate     # type-check + lint + tests (best pre-merge check)
```

## 5) API map (quick mental model)

Main REST groups in `server/routes/`:
- `auth.js` → login/register + user auth
- `songs.js` → song metadata and upload-related endpoints
- `playlists.js` → playlist management
- `playback.js` → playback/session operations
- `rooms.js` → listening room lifecycle
- `ai.js` → AI-backed playlist/recommendation/chat endpoints

If you need full endpoint-by-endpoint details, use `API.md`.

## 6) Real-time listening rooms: how they work

- Socket handlers live in `server/socket/handlers.js`.
- Clients connect, join a room, and receive broadcast events.
- Host actions (play/pause/seek/next) are synchronized across listeners.
- Redis is used to keep shared state responsive across sessions.

When debugging room sync, inspect:
1. client socket emit/subscribe logic,
2. server socket handlers,
3. Redis connectivity/latency.

## 7) Data and storage

- Schema source of truth: `database/schema.sql`
- Sample content: `database/seed.sql`
- Uploaded media directory: `uploads/`

Operational note: `uploads/` is local filesystem storage by default. In production, move to durable object storage if horizontal scaling is needed.

## 8) AI subsystem (current behavior)

- Config is environment-driven (see `.env.example`, `server/config/colabAI.js`).
- Service layer lives in `server/services/colabAIService.js`.
- Controller entry points are in `server/controllers/aiController.js`.

If AI features fail:
1. verify Colab-related env variables,
2. verify outbound network access,
3. check backend logs for rate-limit/timeout errors,
4. fall back to non-AI features while recovering.

## 9) Deployment paths

Primary docs:
- `DEPLOY.md` (fast path)
- `DEPLOYMENT.md` (detailed)
- `DEPLOYMENT_CHECKLIST.md` (release checklist)
- `PRODUCTION_READY.md` (gaps/hardening)

Infra files available:
- `Dockerfile`
- `docker-compose.yml`
- `render.yaml`
- `railway.json`

## 10) Troubleshooting quick list

- **API down**: check backend process + `PORT` conflicts + `api/health`.
- **Login fails**: verify `JWT_SECRET`, DB user table, and auth route responses.
- **Rooms not syncing**: verify socket connection and Redis status.
- **No songs shown**: check DB seed, upload directory, and API response payloads.
- **AI endpoints timing out**: check Colab credentials, timeout config, and retries.

## 11) Suggested onboarding order for new contributors

1. Read `README.md` (overview + quick start).
2. Read this manual (`docs/MANUAL.md`).
3. Read `ARCHITECTURE.md` for deeper design context.
4. Run app locally and test one flow each: auth, song list, room join, AI prompt.
5. Before PR: run `npm run validate`.

---

If you only remember one thing: **run the stack with `npm run dev`, keep `.env` correct, and use `API.md` + server routes for source-of-truth behavior.**
