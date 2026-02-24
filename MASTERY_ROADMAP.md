# Hathor-Red Codebase Mastery Roadmap

> **Purpose:** A phased, actionable plan for achieving complete ownership and technical mastery of the hathor-red music streaming platform.
> **Time estimate:** 6–8 weeks of focused effort across 5 phases.
> **Prerequisite:** Complete the [Day 1 Onboarding Guide](docs/onboarding/day1.md) before starting.

---

## Phase 0 — Foundation (Week 1)

**Goal:** Run the entire stack locally, trace a request end-to-end, and identify every moving part.

### 0.1 Environment Mastery

| Task | Verification |
|------|-------------|
| Clone repo, `npm run install-all`, `cp .env.example .env` | `node --version` ≥ 18, all deps installed |
| Start PostgreSQL + Redis via `docker compose up -d postgres redis` | `psql -U postgres -d hathor_music -c '\dt'` shows 8 tables |
| Apply schema and seed: `npm run db:setup` | Seed data visible in `users`, `songs` tables |
| Start dev servers: `npm run dev` | Frontend on `:3000`, backend on `:5000` |
| Run full Docker stack: `docker compose up` | All 4 services healthy at `GET /api/health` |

### 0.2 First Request Trace

Walk one request end-to-end and document what you find:

1. **Register a user** — `POST /api/auth/register`
   - Trace: `server/routes/auth.js` → validation middleware → `authController.register()` → `pg` INSERT → JWT response
2. **Login** — `POST /api/auth/login`
   - Trace: route → validation → `authController.login()` → bcrypt compare → JWT
3. **Upload a song** — `POST /api/songs/upload`
   - Trace: route → auth middleware → multer upload middleware → `songController.uploadSong()` → file written to `uploads/` → DB INSERT
4. **Stream a song** — `GET /api/songs/:id/stream`
   - Trace: route → auth middleware → `songController.streamSong()` → `fs.createReadStream` with range headers

### 0.3 Read These Files in Order

| # | File | Why |
|---|------|-----|
| 1 | `server/index.js` | Understand server bootstrap, middleware stack, route registration |
| 2 | `server/middleware/auth.js` | JWT verification — every protected route passes through this |
| 3 | `server/middleware/validation.js` | Input validation rules — this prevents injection and bad data |
| 4 | `server/config/database.js` | PostgreSQL pool creation and connection settings |
| 5 | `server/config/redis.js` | Redis client setup with fallback pattern |
| 6 | `database/schema.sql` | All 8 tables, constraints, indexes — the single source of truth |
| 7 | `server/socket/handlers.js` | Real-time events: rooms, cross-device sync, chat |
| 8 | `server/services/colabAIService.js` | AI integration with fallback mode |

### 0.4 Checkpoint

- [ ] Can explain the middleware execution order: `helmet → compression → cors → rateLimit → requestLogger → express.json → routes`
- [ ] Can explain why Redis errors must never crash the server (it is a cache layer, not a primary store)
- [ ] Can explain why `COUNT(*)` from PostgreSQL needs `parseInt` (the `pg` driver returns `bigint` as a string)
- [ ] Can explain why `socket.broadcast.emit` must never be used for user-specific state

---

## Phase 1 — Quality Gates (Week 2)

**Goal:** Master the testing and linting pipeline. Write your first tests.

### 1.1 Run the Existing Suite

```bash
# Tests — 14 tests must pass
./node_modules/.bin/jest

# Lint — zero warnings
./node_modules/.bin/eslint . --max-warnings=0

# Combined
npm run validate
```

### 1.2 Understand Existing Test Coverage

| Test File | What It Covers | Gap |
|-----------|---------------|-----|
| `cors.test.js` | CORS origin validation (12 tests) | — |
| `auth.utils.test.js` | JWT generation/verification, password hashing | Auth controller not tested |
| `colabAIService.test.js` | AI service API calls, error handling | AI controller not tested |
| `colabAIService.cache.test.js` | Redis caching for AI responses | — |

### 1.3 Test Writing Exercises

Write tests for **one controller at a time**, starting with the simplest. Each test should cover:
- Happy path
- Primary error case (missing/invalid input)
- Edge case (empty results, not found)

**Suggested order:**

| Priority | Controller | Reason |
|----------|-----------|--------|
| 1 | `playbackController` | Only 2 methods, isolated logic, good starter |
| 2 | `authController` | Security-critical — must be tested |
| 3 | `songController` | File I/O and streaming — requires mocking |
| 4 | `playlistController` | Complex queries, AI integration |
| 5 | `roomController` | Multi-user state, `parseInt` pitfall |
| 6 | `aiController` | Depends on `colabAIService` (already tested) |

### 1.4 Validation Middleware Deep-Dive

Read every validation chain in `server/middleware/validation.js`. For each one:
- Confirm it covers all required fields
- Confirm it sanitizes input (no raw user strings reach SQL)
- Confirm the route that uses it actually references it in the middleware array

### 1.5 Checkpoint

- [ ] `./node_modules/.bin/jest` passes with your new tests
- [ ] `./node_modules/.bin/eslint . --max-warnings=0` is clean
- [ ] You can explain the difference between `validate` middleware and the individual validation chains
- [ ] You have written at least 2 new test files

---

## Phase 2 — Architecture Mastery (Weeks 3–4)

**Goal:** Understand every data flow, every security boundary, and every failure mode.

### 2.1 Data Flow Maps

Trace and diagram these flows (use pen/paper, Mermaid, or any tool):

#### Flow A: User Registration → Login → Playback
```
Browser → POST /register → validation → authController → pg INSERT → JWT
Browser → POST /login → validation → authController → bcrypt → JWT
Browser → GET /songs → auth middleware → songController → pg SELECT → JSON
Browser → GET /songs/:id/stream → auth middleware → songController → fs.createReadStream → audio
```

#### Flow B: Real-Time Room Listening
```
Browser → Socket.io connect → JWT auth → join user-${userId} room
Browser → emit join-room → handler → pg INSERT room_participants → broadcast user-joined
Host → emit room-control → handler → pg UPDATE listening_rooms → broadcast room-update
```

#### Flow C: AI Playlist Generation
```
Browser → POST /ai/playlist/generate → auth → aiController → colabAIService
colabAIService → check Redis cache → miss → call Colab API → cache result → return
colabAIService → Colab unavailable → fallback mock response
```

### 2.2 Security Boundaries

Identify and verify each boundary:

| Boundary | File | What It Protects |
|----------|------|-----------------|
| JWT verification | `server/middleware/auth.js` | All `/api/*` routes except register/login/health |
| Input validation | `server/middleware/validation.js` | Every POST/PUT route |
| Rate limiting | `server/index.js` (express-rate-limit) | API: 100/15min, Auth: 10/hour |
| Parameterized SQL | All controllers | SQL injection prevention |
| Host-only room control | `server/socket/handlers.js` | Only room host can control playback |
| CORS | `server/index.js` | Origin whitelist per environment |
| Helmet CSP | `server/index.js` | XSS, clickjacking, content injection |
| File upload limits | `server/middleware/upload.js` | File size, type restrictions |

### 2.3 Failure Mode Analysis

For each component, answer: *what happens when it fails?*

| Component | Failure Mode | Expected Behavior |
|-----------|-------------|-------------------|
| PostgreSQL down | All queries fail | Server returns HTTP 500, logs error |
| Redis down | Cache miss | Falls back to PostgreSQL (try/catch pattern) |
| Colab AI unavailable | API timeout | Falls back to mock responses |
| File not found on stream | `fs.createReadStream` error | 404 response |
| JWT expired | Auth middleware rejects | 401 response |
| Rate limit exceeded | express-rate-limit | 429 Too Many Requests |

### 2.4 Database Schema Mastery

For each table, be able to answer:
1. What creates rows? (Which controller/handler?)
2. What reads rows? (Which queries, with what filters?)
3. What updates rows? (Which operations?)
4. What deletes rows? (Which operations, cascade rules?)
5. What indexes exist and why?

### 2.5 Checkpoint

- [ ] You have diagrams for all 3 data flows
- [ ] You can explain every row in the security boundaries table from memory
- [ ] You can predict the system behavior for each failure mode
- [ ] You can sketch the full database schema from memory

---

## Phase 3 — Operational Mastery (Weeks 4–5)

**Goal:** Own deployment, monitoring, and incident response.

### 3.1 Deployment Pipeline

Understand every stage of CI/CD:

| Stage | File | What It Does |
|-------|------|-------------|
| PR quality gate | `.github/workflows/quality-gate.yml` | Lint + type-check + test on every PR |
| Docker build | `.github/workflows/docker-image.yml` | Build image on push to main |
| Deploy to Railway | `.github/workflows/deploy.yml` | Test → build → deploy on push to main |
| Security scan | `.github/workflows/security-scan.yml` | SAST + dependency scanning (scheduled + PR) |
| Health check | `.github/workflows/health-check.yml` | Scheduled HTTP health probes |
| Cloud Build CI | `cloudbuild/cloudbuild.ci.yaml` | GCP-native CI pipeline |
| Cloud Build staging | `cloudbuild/cloudbuild.cd.stg.yaml` | Deploy to staging |
| Cloud Build prod | `cloudbuild/cloudbuild.cd.prod.yaml` | Deploy to production |

**Exercises:**
1. Read each workflow file end-to-end
2. Trigger a manual workflow run and watch it complete
3. Intentionally break a test and see the quality gate fail

### 3.2 Docker Mastery

```bash
# Build the image locally
docker build -t hathor-red .

# Run the full stack
docker compose up

# Inspect running containers
docker compose ps
docker compose logs -f app

# Shell into the running app
docker compose exec app sh
```

Understand the multi-stage Dockerfile:
- Builder stage: installs deps, builds frontend
- Production stage: copies built assets, runs server

### 3.3 Runbook Familiarity

Read and rehearse each runbook:

| Runbook | Key Takeaway |
|---------|-------------|
| `docs/runbooks/incident-response.md` | SEV levels, triage, commander assignment |
| `docs/runbooks/disaster-recovery.md` | Restore from backup, rehydrate caches |
| `docs/runbooks/rollback.md` | GCP Cloud Run revision rollback |
| `docs/runbooks/quality-gates.md` | What must pass before deploy |
| `docs/runbooks/production-readiness-scorecard.md` | 90-point checklist |

### 3.4 Environment Configuration

Master all 60+ environment variables in `.env.example`:

| Category | Key Variables | Impact |
|----------|--------------|--------|
| Database | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| Redis | `REDIS_URL` | Cache layer connection |
| Auth | `JWT_SECRET`, `JWT_EXPIRATION` | Token security |
| AI | `COLAB_API_KEY`, `COLAB_PROJECT_ID` | AI feature availability |
| Server | `PORT`, `NODE_ENV`, `CLIENT_URL` | Runtime behavior |
| Upload | `MAX_FILE_SIZE`, `UPLOAD_DIR` | File upload constraints |

### 3.5 Checkpoint

- [ ] You can deploy to a staging environment
- [ ] You can roll back a bad deployment
- [ ] You can respond to a hypothetical SEV2 incident using the runbook
- [ ] You can explain every environment variable's purpose

---

## Phase 4 — Feature Ownership (Weeks 5–7)

**Goal:** Extend the platform with confidence. Ship features without breaking things.

### 4.1 Contribution Workflow

```bash
# 1. Create a feature branch
git checkout -b claude/<feature-slug>

# 2. Make changes (scoped to plan)

# 3. Run quality gates
./node_modules/.bin/jest
./node_modules/.bin/eslint . --max-warnings=0

# 4. Commit with conventional messages
git add <specific-files>
git commit -m "feat: add listening history endpoint"

# 5. Push and open PR
git push -u origin claude/<feature-slug>
```

### 4.2 Feature Development Exercises

Build these features to prove mastery (increasing difficulty):

#### Exercise 1: Add a "Recently Played" Endpoint
- **Scope:** New route `GET /api/songs/recently-played` returning the last 20 songs from `listening_history`
- **Skills tested:** Route creation, auth middleware, parameterized SQL, pagination
- **Files touched:** `server/routes/songs.js`, `server/controllers/songController.js`
- **Test:** Write a test verifying the response shape and auth requirement

#### Exercise 2: Add Song Search with Filters
- **Scope:** Enhance `GET /api/songs` with `genre`, `artist`, `year` query filters
- **Skills tested:** Dynamic SQL building with parameterized queries, validation
- **Files touched:** `server/controllers/songController.js`, `server/middleware/validation.js`
- **Test:** Write tests for each filter combination

#### Exercise 3: Add Playlist Collaboration
- **Scope:** Allow multiple users to add songs to a shared playlist
- **Skills tested:** Authorization (playlist owner vs collaborator), new schema table, migration
- **Files touched:** `database/schema.sql`, new controller logic, new route, validation, tests

#### Exercise 4: Add Real-Time Song Reactions
- **Scope:** Users in a room can react to the current song (emoji reactions)
- **Skills tested:** Socket.io events, room-scoped broadcasts, database writes
- **Files touched:** `server/socket/handlers.js`, `database/schema.sql`, client components

### 4.3 Code Review Practice

Review your own code against these criteria before every PR:

- [ ] All SQL uses parameterized statements (`$1, $2`)
- [ ] All POST/PUT routes have validation middleware
- [ ] Redis calls are wrapped in try/catch
- [ ] Socket events target user/room-specific rooms, not broadcast
- [ ] `bigint` columns use `parseInt` before arithmetic
- [ ] No `.env` values committed
- [ ] Tests pass, lint is clean
- [ ] Documentation updated if behavior changed

### 4.4 Checkpoint

- [ ] You have shipped at least 2 of the 4 exercises
- [ ] Each exercise has tests and passes lint
- [ ] You can review someone else's PR using the checklist above

---

## Phase 5 — Technical Leadership (Weeks 7–8)

**Goal:** Drive architecture decisions, mentor others, and own the roadmap.

### 5.1 Architecture Decision Records

Read existing ADRs in `docs/decisions/`. Then write your own ADR for a real decision:

**ADR template:**
```markdown
# ADR-NNN: <Title>

## Status: Proposed | Accepted | Deprecated

## Context
What is the problem? What forces are at play?

## Decision
What did we decide and why?

## Consequences
What are the trade-offs? What do we gain and lose?
```

**Suggested ADR topics:**
- Should we migrate from Express to Fastify?
- Should we add GraphQL alongside REST?
- Should we move file storage to cloud object storage (GCS/S3)?
- Should we add WebRTC for live audio rooms?

### 5.2 Performance Baseline

Establish measurable baselines:

| Metric | How to Measure | Target |
|--------|---------------|--------|
| API latency P95 | Load test with `autocannon` or `k6` | < 200ms |
| Startup time | `time node server/index.js` | < 3s |
| Test suite runtime | `time ./node_modules/.bin/jest` | < 10s |
| Docker build time | `time docker build .` | < 60s |
| Bundle size | React build output | < 500KB gzipped |

### 5.3 Technical Debt Inventory

Audit the codebase for debt:

| Area | What to Look For |
|------|-----------------|
| Controllers | Duplicated query patterns, missing error handling |
| Tests | Missing controller tests (0/6 controllers have dedicated tests) |
| Middleware | Missing upload validation tests |
| Schema | Missing indexes, denormalization opportunities |
| Frontend | Missing error boundaries, loading states |
| Security | Rate limit tuning, CSP policy review |
| Observability | Structured logging, APM integration |
| Documentation | Stale docs, missing API examples |

### 5.4 Mentorship Readiness

You are ready to lead when you can:

- [ ] Explain the full architecture to a new hire in 15 minutes using only a whiteboard
- [ ] Debug a production issue using only logs and the runbooks
- [ ] Review a PR and identify security, performance, and correctness issues
- [ ] Write an ADR that the team accepts
- [ ] Propose and execute a refactoring that reduces code by 20%+ in a module
- [ ] Onboard a new contributor using the existing docs (and improve the docs based on friction points)

### 5.5 Final Checkpoint

- [ ] All Phase 0–4 checkpoints are complete
- [ ] You have written at least 1 ADR
- [ ] You have established performance baselines
- [ ] You have identified and documented 5+ technical debt items
- [ ] You can confidently own any incident, any PR review, and any architecture discussion

---

## Quick Reference: Files That Matter Most

The 80/20 of this codebase — these files control 80% of the platform's behavior:

| Priority | File | Why |
|----------|------|-----|
| ★★★ | `server/index.js` | Server bootstrap, all middleware, route registration |
| ★★★ | `server/middleware/auth.js` | Every protected request passes through here |
| ★★★ | `server/middleware/validation.js` | Every POST/PUT is validated here |
| ★★★ | `database/schema.sql` | Single source of truth for all data |
| ★★★ | `server/socket/handlers.js` | All real-time behavior |
| ★★☆ | `server/controllers/authController.js` | Registration, login, JWT |
| ★★☆ | `server/controllers/songController.js` | Core music functionality |
| ★★☆ | `server/controllers/playlistController.js` | Playlist CRUD + AI generation |
| ★★☆ | `server/services/colabAIService.js` | AI integration with fallback |
| ★★☆ | `server/config/database.js` | PostgreSQL connection management |
| ★☆☆ | `server/controllers/roomController.js` | Listening room management |
| ★☆☆ | `server/controllers/playbackController.js` | Cross-device sync state |
| ★☆☆ | `server/controllers/aiController.js` | AI route handlers |

---

## Pitfalls to Avoid (Lessons Learned)

These bugs have already been fixed. Do not re-introduce them:

| Pitfall | File | Rule |
|---------|------|------|
| `socket.broadcast.emit` for user sync | `server/socket/handlers.js` | Always use `socket.to('user-${userId}')` |
| Redis failure crashing the server | `server/controllers/playbackController.js` | Always wrap Redis in try/catch with DB fallback |
| `COUNT(*)` compared as string | `server/controllers/roomController.js` | Always `parseInt(value, 10)` for bigint columns |
| Variable shadowing in loops | `server/controllers/playlistController.js` | Use unique variable names in nested scopes |
| Missing validation on routes | `server/middleware/validation.js` | Every POST/PUT route needs a validation chain |
| String interpolation in SQL | All controllers | Always use parameterized queries (`$1, $2`) |

---

## Progress Tracker

Use this checklist to track your mastery journey:

```markdown
## My Mastery Progress

### Phase 0 — Foundation
- [ ] Environment running locally
- [ ] First request traced end-to-end
- [ ] Core files read and understood
- [ ] Phase 0 checkpoint complete

### Phase 1 — Quality Gates
- [ ] Existing tests understood
- [ ] First new test written and passing
- [ ] Validation middleware reviewed
- [ ] Phase 1 checkpoint complete

### Phase 2 — Architecture Mastery
- [ ] Data flow diagrams created
- [ ] Security boundaries documented
- [ ] Failure modes analyzed
- [ ] Schema mastered
- [ ] Phase 2 checkpoint complete

### Phase 3 — Operational Mastery
- [ ] CI/CD pipeline understood
- [ ] Docker workflow mastered
- [ ] Runbooks rehearsed
- [ ] Environment variables mastered
- [ ] Phase 3 checkpoint complete

### Phase 4 — Feature Ownership
- [ ] Exercise 1 shipped (Recently Played)
- [ ] Exercise 2 shipped (Song Search Filters)
- [ ] Exercise 3 shipped (Playlist Collaboration)
- [ ] Exercise 4 shipped (Song Reactions)
- [ ] Phase 4 checkpoint complete

### Phase 5 — Technical Leadership
- [ ] ADR written
- [ ] Performance baselines established
- [ ] Tech debt inventory complete
- [ ] Mentorship-ready
- [ ] Phase 5 checkpoint complete
```
