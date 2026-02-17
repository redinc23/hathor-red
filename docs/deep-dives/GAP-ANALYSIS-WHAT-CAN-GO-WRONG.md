# Gap Analysis: What Can Go Wrong? — Prep Now, Prosper Forever

**Blueprint Reference:** [ARCHITECTURAL_BLUEPRINT.md](../ARCHITECTURAL_BLUEPRINT.md)  
**Purpose:** No holes. No fire drills. Real end-to-end. One day an idea → 4 days white paper → 4 weeks competitor.  
**Principle:** Do the deep dive now. Don't think about it 24/7 later. Run the business.

---

## 1. What Can Go Wrong? (And How We Prevent It)

| What Goes Wrong | Why It Happens | Prevention (Built-In, Every Time) |
|-----------------|----------------|-----------------------------------|
| **Repo has no Cloud Build** | Someone forgot to wire it | Heavy Lifter creates repo + triggers atomically. No repo without deploy. Zero exceptions. |
| **Build succeeds but nobody knows** | No visibility | Cloud Build status → BigQuery → **Looker Studio** dashboard. Build events → **Google Chat**. |
| **Deploy fails silently** | No alert | Cloud Build webhook on failure → Pub/Sub → Function → **Chat** + **Gmail**. |
| **Secrets in code** | Dev committed .env or API key | **Standardized control:** Pre-commit or Cloud Build step scans for secrets (gitleaks, secret manager check). Block merge if found. |
| **.env in repo** | Forgot .gitignore | **Standardized control:** Repo template includes .gitignore. Heavy Lifter clones template. No custom repo from scratch. |
| **Wrong branch deployed** | Deployed from feature branch | **Standardized control:** Cloud Build trigger only on `main`. No trigger on other branches for prod deploy. |
| **No staging environment** | Went straight to prod | **Standardized control:** Every repo gets staging + prod. Deploy to staging on PR merge to `develop`; prod on merge to `main`. |
| **48 tools, no single view** | Scattered across Sheets, Firestore, Cloud Build UI | **Looker Studio** dashboard: Tool | Status | Last Build | Last Deploy | Next Step. One place. |
| **Research phase stalls** | Nobody marks "done" | Cloud Scheduler: 7 days after RESEARCH_STARTED, send **Chat** nudge. Auto-transition option. |
| **Prototype approval bottleneck** | Approval Sheet buried | **Operational automation:** Pending prototypes in daily **Chat** digest. Link to Sheet. |
| **PR dies on the vine** | Out of sight, out of mind | PR >3 days → **Chat** + **Gmail** + **Sheets**. Already in blueprint. |
| **DLQ fills up, nobody looks** | No triage | DLQ message → **Chat** alert + **Sheets** triage row. Already in blueprint. |
| **Dependency vuln in prod** | No scan before deploy | **Standardized control:** Cloud Build step: `gcloud artifacts docker images scan` or OSV scanner. Block deploy if critical. |
| **License compliance** | OSS with wrong license | **Standardized control:** Cloud Build step: license checker (e.g., FOSSA, or Google's OSS compliance). Warn/block. |
| **Schema drift** | Firestore/BigQuery schema changed, code broke | **Standardized control:** Schema in repo; Cloud Build validates. Migration scripts versioned. |
| **Rollback needed, nobody knows how** | No runbook | **Standardized control:** Every repo has `docs/rollback.md`. Cloud Build failure links to it in Chat. |
| **Different cloudbuild.yaml per repo** | Inconsistent, some miss steps | **Standardized control:** Shared `cloudbuild.yaml` template in org repo. Heavy Lifter copies it. All repos same. |
| **Force push to main** | Accidental overwrite | **Standardized control:** Branch protection (Cloud Source Repos or mirror to GitHub with rules). No force push. |
| **No visibility on "when is build going up"** | Dev/leadership blind | **Looker Studio** + **Sheets** dashboard. "Build in progress" | "Deploy scheduled" | "Live at X". Real-time. |

---

## 2. Underutilized Google Tools (Use Them)

| Tool | Currently | Should Be | Action |
|------|-----------|-----------|--------|
| **Looker Studio** | Not mentioned | **Pipeline dashboard** — 48 tools, status, last build, last deploy, next step. Connect to BigQuery, Sheets. Free. | Add to blueprint. Build dashboard. |
| **Google Sites** | Not mentioned | Internal portal: links to Form, dashboard, runbooks, Chat. One URL. | Optional; or use Drive + Doc. |
| **Cloud Build status** | Scattered in GCP console | Centralized in Looker Studio. Build history, success rate, duration. | Export to BigQuery; dashboard. |
| **Cloud Monitoring dashboards** | Per-service | Consolidated "Pipeline Health" dashboard: all builds, deploys, errors. | Create dashboard. |
| **Google Chat spaces** | Ad-hoc | **#pipeline** — all build/deploy/PR alerts. **#ops** — DLQ, incidents. **#research** — research complete nudges. | Standardize spaces. |
| **Apps Script** | Form → Pub/Sub | Also: Sheet → sync to BigQuery for dashboard. Calendar → meeting notes. Drive → folder templates. | Expand usage. |
| **NotebookLM** | Research corpus | Also: ingest competitor docs, market reports. Auto-add to corpus on approval. | Ensure automation. |
| **Colab** | Prototypes | Also: data exploration, quick POCs. Link from Drive folder. | Standardize. |
| **Cloud Workflows** | Underused | Long-running flows: approval → research → prototype → provision. Reduce Function sprawl. | Consider for Saga. |
| **Artifact Registry** | Container storage | Vulnerability scanning on push. Block deploy if critical. | Enable. |
| **Security Command Center** | Not mentioned | Scan GCP resources. Misconfig, vulns. | Enable for org. |
| **Cloud Scheduler** | Some jobs | **Cron for everything:** Research nudge, PR staleness, intake fallback, stale project. | Audit; add missing. |

---

## 3. Third-Party Pressure Points (Don't Pay When Google Works)

| We Might Be Forced Into | Google Alternative | Decision |
|-------------------------|-------------------|----------|
| **Jira** | Sheets + Apps Script + Firestore | Stay Google. |
| **PagerDuty** | Cloud Monitoring → Gmail + Chat | Stay Google. |
| **Datadog / New Relic** | Cloud Monitoring, Trace, Logging | Stay Google. |
| **Slack** | Google Chat | Stay Google. |
| **GitHub** | Cloud Source Repositories | Stay Google. |
| **Notion** | Docs + Drive + Sheets | Stay Google. |
| **Linear / Asana** | Sheets + Calendar | Stay Google. |
| **Vercel / Netlify** | Cloud Run + Cloud Build | Stay Google. |
| **Sentry** | Cloud Error Reporting (Cloud Logging) | Stay Google. |
| **Postman** | Apigee (if enterprise) or Cloud Build + curl | Evaluate. |
| **Figma** | Google Drawings, Slides (limited) | For high-fidelity: Figma may be needed. Document exception. |
| **McKinsey-style decks** | Slides + Vertex AI for narrative | Stay Google. |

**Rule:** Before any paid 3rd party, check: does Google have it? If yes, use Google. Document exceptions.

---

## 4. Standardized Controls (Mistakes We Wouldn't Make — Built Into Every Repo)

**These are mandatory. No repo without them. Heavy Lifter or repo template enforces.**

| Control | How Enforced | When |
|---------|--------------|------|
| **No secrets in code** | Cloud Build step: secret scan (e.g., GCP Secret Manager check, gitleaks). Block merge if found. | Every PR |
| **.gitignore includes .env, keys, etc.** | Repo template. Heavy Lifter clones template. | Repo creation |
| **cloudbuild.yaml from org template** | Heavy Lifter copies `org/cloudbuild-template.yaml`. Same for all 48. | Repo creation |
| **Deploy only from main** | Cloud Build trigger: branch = `main`. No other branch deploys to prod. | Repo creation |
| **Staging before prod** | Two triggers: `develop` → staging; `main` → prod. Or feature flags. | Repo creation |
| **Dependency vuln scan** | Cloud Build step: `npm audit` / `pip audit` / container scan. Block if critical. | Every build |
| **License check** | Cloud Build step: OSS license compliance. Warn on GPL, etc. | Every build |
| **Branch protection** | No force push to main. PR required. (Cloud Source Repos or GitHub mirror.) | Repo creation |
| **Rollback doc** | `docs/rollback.md` in template. Required. | Repo creation |
| **Standard folder structure** | Template: `src/`, `docs/`, `cloudbuild.yaml`, `.gitignore`. | Repo creation |

**Repo template location:** Shared Drive or Cloud Source Repos `org/repo-template`. Heavy Lifter copies it. One source of truth.

---

## 5. Visualization: Where Is the Build? When Is It Going Up?

**Requirement:** Me and the devs need a visual. No fire drills. No "where's that deploy?"**

### 5.1 Pipeline Dashboard (Looker Studio)

**Data sources:** BigQuery (build events, deploy events, state transitions), Sheets (manual overrides), Firestore (via BigQuery export or connector).

**Widgets:**

| Widget | Data | Update |
|-------|------|--------|
| **48 tools × status** | Tool name | Status (Research, Prototype, Build, Deploy, Live) | Real-time |
| **Last build** | Per tool: timestamp, success/fail, link to logs | On build complete |
| **Last deploy** | Per tool: timestamp, env (staging/prod), link | On deploy complete |
| **Build in progress** | Tool, started at, link to Cloud Build | On build start |
| **Deploy scheduled** | Tool, branch, ETA | When merge to main |
| **Alerts** | Failed builds, stuck PRs, DLQ count | Real-time |

**How:** Cloud Build → Pub/Sub → Function → BigQuery. Looker Studio connects to BigQuery. Dashboard auto-refreshes.

### 5.2 Google Chat #pipeline

- Every build start: "🔨 [Tool-X] build started (main)"
- Every build success: "✅ [Tool-X] build passed"
- Every build fail: "❌ [Tool-X] build failed — [link]"
- Every deploy: "🚀 [Tool-X] deployed to prod — [link]"

**No need to open GCP console.** Chat is the feed.

### 5.3 Sheets "Pipeline Status" (Fallback / Export)

- Rows: 48 tools. Cols: Status, Last Build, Last Deploy, Owner, Link.
- Updated by: Cloud Function on build/deploy events. Or Apps Script sync from BigQuery.
- For those who prefer Sheets over Looker.

---

## 6. End-to-End: One Day Idea → 4 Days White Paper → 4 Weeks Competitor

| Day | What Happens (Automated) |
|-----|--------------------------|
| **Day 1** | Idea submitted. Brief AI generates. Approval requested. Research folder + NotebookLM created. |
| **Day 2–4** | Research. NotebookLM. Docs. Vertex AI can draft white paper from brief + research. Approval. |
| **Day 4** | White paper in Doc. Export to PDF. Share. McKinsey buys it. (Manual handoff, but artifact exists.) |
| **Day 5–7** | Prototype. Colab or Doc. Approve. Provision. Repo + Cloud Build. Scaffold. |
| **Day 8–21** | Code. Features. PRs. Builds. Deploys. Chat feed. Dashboard. No fire drills. |
| **Day 22–28** | QA. Release. Deploy to prod. Monitoring. US competitor to music platform. |

**Key:** Research → white paper is accelerated by NotebookLM + Vertex AI. Prototype → prod is accelerated by mandatory Cloud Build + no manual deploy. Visibility by Looker Studio + Chat. No gaps.

---

## 7. Checklist: Are We Ready?

| Question | Answer |
|----------|--------|
| Can we see all 48 tools at a glance? | Looker Studio dashboard |
| Do we know when a build is going up? | Chat + dashboard |
| Are mistakes (secrets, vulns) blocked before merge? | Standardized controls in Cloud Build |
| Are we paying for tools we don't need? | Google-first; no Jira, PagerDuty, etc. |
| Is every repo the same (no snowflakes)? | Repo template + Heavy Lifter |
| Can we run the business without thinking about this 24/7? | Yes—automation + visibility |

---

*Last updated: Feb 17, 2026*
