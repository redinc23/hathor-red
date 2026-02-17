# Deploy Hathor — Get Live in 15 Minutes

**Goal:** Push to main → app stays live. No fire drills.

---

## Step 1: Sign Up for Railway (2 min)

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **New Project**

---

## Step 2: Deploy from GitHub (2 min)

1. Choose **Deploy from GitHub repo**
2. Select `redinc23/hathor-red`
3. Railway reads `Dockerfile` and `railway.json` automatically
4. **First deploy starts.** Wait 2–3 min.

---

## Step 3: Add PostgreSQL (3 min)

1. In your project, click **+ New** → **Database** → **PostgreSQL**
2. Railway creates a Postgres instance
3. Click the Postgres service → **Variables** tab
4. Copy `DATABASE_URL` (or use **Connect** → **Postgres URL**)

---

## Step 4: Add Redis (2 min)

1. Click **+ New** → **Database** → **Redis**
2. Railway creates Redis
3. Copy `REDIS_URL` from the Redis service Variables

---

## Step 5: Set App Variables (3 min)

1. Click your **hathor** app service (not the databases)
2. Go to **Variables** tab
3. Add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Paste from Postgres (Railway can reference: `${{Postgres.DATABASE_URL}}`) |
| `REDIS_URL` | Paste from Redis (or `${{Redis.REDIS_URL}}`) |
| `JWT_SECRET` | `openssl rand -base64 32` |
| `JWT_EXPIRE` | `7d` |
| `CLIENT_URL` | Your app URL (e.g. `https://hathor-music.up.railway.app`) |
| `NODE_ENV` | `production` |

**Railway tip:** Use variable references: `${{Postgres.DATABASE_URL}}` links to your Postgres. Same for Redis.

---

## Step 6: Seed the Database (2 min)

1. In Railway, open your app service
2. Go to **Settings** → find **Deploy** or **Run Command**
3. For a one-time seed: use **Railway CLI** or add a deploy hook that runs seed

**Or run locally with prod DB:**
```bash
DATABASE_URL="postgresql://..." REDIS_URL="redis://..." pnpm run db:setup
```
(Use the URLs from Railway. Run once.)

---

## Step 7: Add Deploy Hook (2 min)

1. In Railway: your app → **Settings** → **Deployments**
2. Find **Deploy Hook** (or **Webhooks**)
3. Copy the deploy hook URL
4. In GitHub: repo → **Settings** → **Secrets and variables** → **Actions**
5. Add secret: `DEPLOY_HOOK` = (paste URL)

**Now:** Every push to `main` → GitHub Actions runs tests → triggers Railway deploy. Only deploys if CI passes.

---

## Step 8: Add Health Check (2 min)

1. In GitHub Secrets, add:
   - `APP_URL` = `https://your-app.up.railway.app` (your Railway URL)
   - `ALERT_WEBHOOK_URL` = (Google Chat or Slack webhook for "app is down" alerts)

2. The `health-check.yml` workflow runs every 15 min. If `/api/health` fails, it POSTs to your webhook.

---

## Verify It's Live

```bash
curl https://your-app.up.railway.app/api/health
```

Expected:
```json
{"status":"ok","checks":{"database":"healthy","redis":"healthy"}}
```

---

## Custom Domain (Optional)

1. Railway app → **Settings** → **Domains**
2. Add custom domain (e.g. `music.yourdomain.com`)
3. Point DNS CNAME to Railway's target
4. SSL is automatic

---

## Cost

| Service | Cost |
|---------|------|
| Railway Starter | $5/month (includes $5 credit) |
| PostgreSQL | Included |
| Redis | Included |
| **Total** | **$5/month** |

---

## If Something Breaks

**App won't start:**
- Check Railway **Deploy Logs**
- 99% of issues: missing `DATABASE_URL`, `REDIS_URL`, or `JWT_SECRET`

**Database connection fails:**
- Ensure `DATABASE_URL` is set (Railway injects it if you use `${{Postgres.DATABASE_URL}}`)
- For local Postgres, add `DATABASE_SSL=false`

**Redis connection fails:**
- Ensure `REDIS_URL` is set
- Railway Redis URL format: `redis://default:password@host:port`

---

## Alternative: Render (Free Tier)

1. [render.com](https://render.com) → New → Web Service
2. Connect `hathor-red` repo
3. Environment: **Docker**
4. Add PostgreSQL and Redis from Render dashboard
5. Add env vars same as above

---

**Push to main. Stay live. That's it.**
