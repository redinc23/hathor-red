# Day 1 Onboarding Guide

Welcome! This guide gets you from zero to productive in under 10 minutes.

## 0. Prerequisites

- Node.js 18+
- npm 8+
- Docker Desktop (or Docker Engine)
- Git and a GitHub account

## 1. Clone and Setup

```bash
git clone <repo-url>
cd hathor-red
cp .env.example .env
```

## 2. Install Dependencies

```bash
npm run install-all
```

## 3. Start Datastores

Use your preferred method (Docker Compose, local services, or devcontainer).

```bash
docker compose up -d postgres redis
```

## 4. Seed Data

```bash
npm run db:setup
```

## 5. Run the App

```bash
npm run dev
```

## 6. Verify

- Frontend: http://localhost:3000
- Backend: http://localhost:5000/api/health

## 7. Quick Troubleshooting

- If Postgres fails, check that port 5432 is free.
- If Redis fails, check that port 6379 is free.
- If the client does not load, run `npm run client` separately.

## 8. First Task Checklist

- [ ] Run the test suite at least once: `npm test`
- [ ] Read `ARCHITECTURE.md`
- [ ] Review `API.md` and `FEATURES.md`
- [ ] Open a draft PR with your first small change
