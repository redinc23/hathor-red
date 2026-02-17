# ARCHITECTURAL BLUEPRINT — END-TO-END COMPLETE

**Single consolidated document for study and reference. Save to your PC.**  
**Version:** 4.4 | **Date:** February 17, 2026  
**Owner:** Suran, Product Engineering Lead  

---

## TABLE OF CONTENTS

1. Executive Summary  
2. The 25-Step Lifecycle  
3. Full Pipeline: Research → Prototype → Code → Launch → Forever  
4. Mandatory Triggers (Zero Exceptions)  
5. Standardized Controls  
6. Visualization (Looker Studio, Chat)  
7. REPO STANDARD (All 48 Repos)  
8. Gap Analysis: What Can Go Wrong  
9. Steps 1–2 Deep Dive (Intake)  
10. Google-Native Tool Stack  
11. Risk Register  
12. Vision: 4 Days White Paper → 4 Weeks Competitor  

---

# 1. EXECUTIVE SUMMARY

This BRD defines an airtight, deterministic, autonomous end-to-end product lifecycle architecture for managing product development pipelines in **Google Workspace and GCP exclusively**. The system enforces a **25+ step state machine** from ideation through **research (NotebookLM, Drive), prototype, code, fullstack, features, repos, bugs, launches, and continuous improvement forever**.

**Mandatory triggers:** Every repo gets Cloud Build on creation—no repo without deploy. No "forgot to wire Cloud Build." Research triggers on approval; prototype triggers on research complete; deploy on merge to main. SDLC, debugging, project management—all automated.

**Google-first mandate:** Forms, Sheets, Docs, Drive, Gmail, Chat, Apps Script, Workflows, Cloud Functions, Pub/Sub, Vertex AI, NotebookLM, Firestore, BigQuery, Cloud Build, Cloud Source Repositories—at every step. Operational automations (PR staleness, build-failure alerts, approval nudges) ensure nothing dies on the vine. Third-party tools only when Google has no equivalent.

**Vision:** One day an idea → 4 days white paper (NotebookLM + Vertex AI) → 4 weeks US competitor (mandatory Cloud Build, no manual deploy, Looker Studio + Chat visibility). Prep now, prosper forever.

---

# 2. THE 25-STEP LIFECYCLE

| Step | State | Trigger | Actions |
|------|-------|---------|---------|
| 1 | IDEA_SUBMITTED | Form submit | Apps Script onFormSubmit → Pub/Sub; fallback: Cloud Scheduler polls Sheet every 15 min |
| 2 | INTAKE_VALIDATED | Pub/Sub event | Function validates; idempotency check for projectId |
| 3 | BRIEF_REQUESTED | Validation pass | Publish to brief-requests |
| 4 | BRIEF_AI_GENERATING | Brief request | Vertex AI generates product brief |
| 5 | BRIEF_DRAFT_READY | AI complete | Store in Firestore |
| 6 | STAKEHOLDER_REVIEW | Draft ready | Send approval webhook to Sheet |
| 7 | APPROVAL_PENDING | Webhook received | Saga: Hold; Cloud Tasks poll every 10s |
| 8 | APPROVED | User approves | Transition to provisioning |
| 9 | DENIED | User denies | Compensate: Delete draft, log to BigQuery |
| 9a | RESEARCH_STARTED | Approved | Create Drive folder, NotebookLM corpus, Docs template |
| 9b | PROTOTYPE_STARTED | Research complete | Create prototype Doc/Colab; link to brief |
| 10 | PROVISIONING_STARTED | Prototype approved | Heavy Lifter: Create GCP project |
| 11 | VPC_PROVISIONED | Project created | Create VPC, subnets |
| 12 | IAM_CONFIGURED | VPC ready | Assign IAM roles |
| 13 | REPO_CREATED | IAM ready | **Cloud Source Repos + Cloud Build trigger created together**—no repo without deploy |
| 14 | SPEC_AI_GENERATING | Repo ready | Vertex AI generates technical spec |
| 15 | SPEC_COMMITTED | Spec ready | Git push spec to repo |
| 16 | SCAFFOLD_AI_GENERATING | Spec committed | Vertex AI generates code scaffold |
| 17 | CI_PIPELINE_ATTACHED | Scaffold pushed | Trigger exists from step 13; first build runs |
| 18 | BUILD_VALIDATING | Push/PR event | Cloud Build runs tests, lint |
| 19 | PR_REVIEW_AI | Build pass | Vertex AI reviews PR |
| 20 | QA_GATE_PASSED | All checks pass | Quality gate; block merge if fail |
| 21 | RELEASE_PIVOT | QA passed | Saga pivot; irreversible |
| 22 | DEPLOYED_TO_PROD | Release tagged | Cloud Build deploys |
| 23 | MONITORING_ACTIVE | Deployed | Alerts, dashboards, SLOs |
| 24 | STALE_DETECTION | >14 days inactive | Cloud Scheduler checks |
| 25 | ARCHIVED | Stale confirmed | Move to /99_ARCHIVED/ |
| ∞ | CONTINUOUS_IMPROVEMENT | Post-launch forever | Bugs, feedback, deploys on merge |

---

# 3. FULL PIPELINE: RESEARCH → PROTOTYPE → CODE → LAUNCH → FOREVER

| Phase | Trigger | What Happens (All Automated) |
|-------|---------|-----------------------------|
| **Research** | Approval | Drive folder; NotebookLM corpus; Doc template; Chat notification |
| **Prototype** | Research complete | Colab or Doc; link to brief; Vertex AI drafts wireframe |
| **Code** | Prototype approved | Repo + Cloud Build created together. No repo without deploy. |
| **Features / Bugs** | PR opened, issue created | Cloud Build runs; PR staleness → Chat; Bugs → Sheet or Issues |
| **Launch** | QA passed | Tag → deploy. No manual deploy. |
| **Forever** | Merge to main, feedback, bugs | Deploy on merge; feedback → Pub/Sub; bugs → triage |

---

# 4. MANDATORY TRIGGERS (ZERO EXCEPTIONS)

| Trigger | When | Enforced By |
|---------|------|-------------|
| Cloud Build on push to main | Repo created (step 13) | Heavy Lifter |
| Cloud Build on PR | Repo created (step 13) | Heavy Lifter |
| Build failure → Chat | Build fails | Cloud Build webhook → Pub/Sub → Function |
| PR >3 days → Chat + Gmail | Daily | Cloud Scheduler → Function |
| Deploy on merge to main | Merge event | Cloud Build trigger |
| Research folder creation | Approval | Pub/Sub → Function |
| Build/deploy → BigQuery | Build/deploy event | Function → Looker Studio |
| Research nudge (7 days) | RESEARCH_STARTED + 7 days | Cloud Scheduler → Function |

**Rule:** A repo that cannot deploy is a failed provision. Roll back. Fix. No exceptions.

---

# 5. STANDARDIZED CONTROLS (MISTAKES WE WOULDN'T MAKE)

| Control | Enforcement |
|---------|-------------|
| No secrets in code | Cloud Build step: secret scan. Block merge if found. |
| .gitignore (.env, keys) | Repo template. Heavy Lifter clones template. |
| cloudbuild.yaml from org template | Same for all 48. No snowflakes. |
| Deploy only from main | Trigger: branch = main. |
| Dependency vuln scan | Cloud Build step. Block deploy if critical. |
| Branch protection | No force push to main. PR required. |
| docs/rollback.md | In template. Every repo has it. |

**Repo template:** `org/repo-template` in Cloud Source Repos or Shared Drive.

---

# 6. VISUALIZATION: WHERE IS THE BUILD? WHEN IS IT GOING UP?

| View | Tool | What |
|------|------|------|
| Pipeline dashboard | **Looker Studio** | 48 tools × status, last build, last deploy |
| Build/deploy feed | **Google Chat** #pipeline | Every build start/success/fail, every deploy |
| Status export | **Sheets** | Rows: tools. Cols: Status, Last Build, Last Deploy |

**Data flow:** Cloud Build → Pub/Sub → Function → BigQuery. Looker Studio + Chat.

---

# 7. REPO STANDARD (APPLY TO ALL 48 REPOS)

## Mandatory Workflows (Every Repo)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| Quality Gate | PR, push | Lint, type-check, test, build. Block merge if fail. |
| Deploy | Push to main | Build → Deploy. No merge to main without deploy path. |
| Bug-to-Issue | After Quality Gate | 3 consecutive fails → create issue. 2 successes → close. |
| Security Scan | PR, push | Secret scan, vuln scan. Block merge if critical. |

## Agent / Workflow Flow: PR → Deployment

```
PR opened → Quality Gate (lint, test, build)
          → Security Scan (secrets, vulns)
          → 3 fails → Bug-to-Issue creates issue
          → Merge to main
          → Deploy workflow (build, deploy)
          → Fail → Alert. Remediate.
```

## What Must NOT Be in Repo

.env | *.pem | *.key | service-account.json | password123 | node_modules/ | dist/ | build/

## What MUST Be in Repo

.gitignore | .env.example | docs/rollback.md | README.md | build, test, validate scripts

## Checklist: Is This Repo Compliant?

- [ ] Quality Gate workflow exists and runs on PR
- [ ] Deploy workflow exists and runs on push to main
- [ ] Bug-to-Issue workflow exists
- [ ] Security Scan workflow exists (secret + vuln)
- [ ] .env in .gitignore; .env.example present
- [ ] docs/rollback.md exists
- [ ] No secrets in code
- [ ] Merge to main triggers deploy

---

# 8. GAP ANALYSIS: WHAT CAN GO WRONG

| What Goes Wrong | Prevention |
|-----------------|------------|
| Repo has no Cloud Build | Heavy Lifter creates repo + triggers atomically |
| Build succeeds but nobody knows | Cloud Build → BigQuery → Looker Studio |
| Deploy fails silently | Webhook → Chat + Gmail |
| Secrets in code | Secret scan. Block merge. |
| 48 tools, no single view | Looker Studio dashboard |
| Research phase stalls | 7-day nudge → Chat + Gmail |
| PR dies on the vine | PR >3 days → Chat + Gmail + Sheets |
| No visibility on builds | Looker Studio + Chat #pipeline |

## Third-Party Pressure (Stay Google)

| Don't Pay For | Use Instead |
|---------------|-------------|
| Jira | Sheets + Firestore |
| PagerDuty | Cloud Monitoring → Chat + Gmail |
| Datadog | Cloud Monitoring, Trace, Logging |
| Slack | Google Chat |
| GitHub | Cloud Source Repositories |
| Vercel/Netlify | Cloud Run + Cloud Build |

---

# 9. STEPS 1–2 DEEP DIVE (INTAKE)

## The "Open Sheet" Anti-Pattern

**Never use `onOpen` or `onEdit` for critical pipeline triggers.** They require human action. Use `onFormSubmit` (event-driven) or time-driven (Cloud Scheduler).

| Trigger | Requires Human? | Use for Critical? |
|---------|-----------------|-------------------|
| onOpen | Yes | No |
| onFormSubmit | No | Yes |

## Step 1 Checklist

- Google Form linked to Sheet
- Apps Script with **installable** onFormSubmit trigger
- Pub/Sub topic `intake-ideas`
- Fallback: Cloud Scheduler polls Sheet every 15 min for unprocessed rows
- Generate projectId in Apps Script: `"idea-" + Utilities.getUuid()`

## Step 2 Checklist

- Cloud Function triggered by Pub/Sub
- Validate payload; idempotency check for projectId
- Reject to DLQ if invalid
- Redact PII in logs

---

# 10. GOOGLE-NATIVE TOOL STACK

| Capability | Google Tool |
|------------|-------------|
| Intake & UI | Forms, Sheets, Docs, Drive |
| Automation | Apps Script, Google Workflows |
| Orchestration | Cloud Functions, Pub/Sub, Cloud Tasks |
| AI & Research | Vertex AI, NotebookLM, Colab |
| Persistence | Firestore, BigQuery, Cloud Storage |
| Source control | Cloud Source Repositories |
| CI/CD | Cloud Build, Artifact Registry |
| Observability | Cloud Monitoring, Trace, Logging |
| Alerting | Cloud Monitoring → Gmail, Chat |
| Dashboards | Looker Studio |

---

# 11. RISK REGISTER

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Vertex AI quota exceeded | Token bucket; fallback to queue |
| R2 | Firestore write conflict | Optimistic locking; retry |
| R3 | GCP project creation fails | Saga compensate |
| R4 | Approval webhook lost | Cloud Tasks retry; DLQ |
| R5 | BigQuery ingest delay | Async; eventual consistency |
| R6 | Region outage | Multi-region; failover |
| R7 | PII leakage in logs | Redaction pipeline |
| R8 | Repo without Cloud Build | Zero tolerance; Heavy Lifter creates atomically |
| R9 | No visibility on builds | Looker Studio; Chat #pipeline |
| R10 | Secrets/vulns in code | Secret scan; vuln scan; block merge |

---

# 12. VISION: 4 DAYS WHITE PAPER → 4 WEEKS COMPETITOR

| Day | What Happens (Automated) |
|-----|--------------------------|
| Day 1 | Idea submitted. Brief AI generates. Approval. Research folder + NotebookLM. |
| Day 2–4 | Research. NotebookLM. Vertex AI drafts white paper. |
| Day 4 | White paper in Doc. McKinsey buys it. |
| Day 5–7 | Prototype. Approve. Provision. Repo + Cloud Build. Scaffold. |
| Day 8–21 | Code. Features. PRs. Builds. Deploys. Chat feed. Dashboard. |
| Day 22–28 | QA. Release. Deploy. US competitor to music platform. |

---

# ROLLBACK PROCEDURE (Every Repo)

1. Identify last good commit: `git log main --oneline -5`
2. Revert: `git revert -m 1 <merge_commit_sha>` then `git push origin main`
3. Deploy workflow runs on push. Ensure it deploys reverted state.

---

*End of document. Save this file. Study it. Apply it across all 48 repos. Prep now, prosper forever.*
