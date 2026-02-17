# REPO STANDARD — Apply to All Business Repos

**Owner:** Engineering Lead  
**Applies to:** Every repo across the company (48 tools, all products)  
**Purpose:** No fire drills. No "we forgot." Agents and workflows see PRs through to deployment. Bugs dealt with incessantly until remediated or kicked out.

---

## 1. Mandatory Workflows (Every Repo)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **Quality Gate** | PR, push | Lint, type-check, test. Block merge if fail. |
| **Deploy** | Push to `main` | Build → Deploy. No merge to main without deploy path. |
| **Bug-to-Issue** | After Quality Gate | 3 consecutive fails → create issue. 2 successes → close. Deal with it. |
| **Security Scan** | PR, push | Secret scan, vuln scan. Block merge if critical. |
| **PR Staleness** | Daily (optional) | PR open >3 days → notify. No PR dies on the vine. |

**Rule:** A repo that cannot deploy on merge to main is broken. Fix it.

---

## 2. Agent / Workflow Flow: PR → Deployment

```
PR opened
    → Quality Gate runs (lint, test)
    → Security Scan runs (secrets, vulns)
    → If fail: Bug-to-Issue creates/updates issue after 3x
    → Dev fixes
    → PR approved, merged to main
    → Deploy workflow runs
    → Build → Deploy to staging/prod
    → If deploy fails: Alert. Issue created. Remediate.
```

**No manual deploy.** Merge = deploy. If deploy fails, we fix it until it works or we kill the change.

---

## 3. What Must NOT Be in Repo

| Item | Why |
|------|-----|
| `.env` | Secrets. Use `.env.example` only. |
| `*.pem`, `*.key`, `service-account.json` | Credentials. |
| `password123`, hardcoded secrets | Use env vars. |
| `node_modules/`, `dist/`, `build/` | In .gitignore. |

**Enforcement:** Security scan workflow fails if secrets detected. Block merge.

---

## 4. What MUST Be in Repo

| Item | Purpose |
|------|---------|
| `.gitignore` (with .env, keys, node_modules) | Prevent accidental commit. |
| `.env.example` | Document required env vars. No real values. |
| `docs/rollback.md` | How to rollback. Every repo. |
| `README.md` | How to run, build, deploy. |
| `package.json` scripts: `build`, `test`, `validate` | CI depends on these. |

---

## 5. Standardized Controls (Mistakes We Wouldn't Make)

| Control | How |
|---------|-----|
| No secrets in code | Gitleaks or similar in Security Scan. Fail on hit. |
| Deploy only from `main` | Deploy workflow triggers on push to main only. |
| Branch protection | Require PR for main. No force push. |
| Vuln scan before merge | npm audit / pip audit / Trivy. Block critical. |
| Bug → Issue | 3 fails → issue. Remediate or close. |

---

## 6. Visibility (Where Is the Build? When Is It Going Up?)

| Need | Solution |
|------|----------|
| Build status | GitHub Actions / Cloud Build UI. Or: webhook → Google Chat. |
| Deploy status | Same. Deploy workflow logs. |
| 48 tools at a glance | Looker Studio dashboard (BigQuery + build events). |

**Add to deploy workflow:** Webhook to Google Chat on success/fail. No one should wonder.

---

## 7. Bug / Issue Handling

| Scenario | Action |
|----------|--------|
| CI fails 3x in a row | Bug-to-Issue creates issue. Labels: `ci`, `bug`, `auto-created`. |
| CI passes 2x after issue | Auto-close issue. |
| Deploy fails | Alert. Create issue. Remediate until fixed or reverted. |
| PR stuck >3 days | Notify assignee. (Separate automation.) |

**Principle:** Deal with problems incessantly. Fix or kick out. No limbo.

---

## 8. Copy This to Every New Repo

When creating a new repo:

1. Copy `.github/workflows/` from org template (quality-gate, deploy, bug-to-issue, security-scan).
2. Copy `.gitignore`, `.env.example`, `docs/rollback.md`.
3. Ensure `build`, `test`, `validate` scripts exist.
4. Add `deploy` script or configure deploy workflow for your target (Cloud Run, Fly, etc.).
5. Wire webhook to Chat if using Google.

**Template location:** `org/repo-template` or Shared Drive.

---

## 9. Checklist: Is This Repo Compliant?

- [ ] Quality Gate workflow exists and runs on PR
- [ ] Deploy workflow exists and runs on push to main
- [ ] Bug-to-Issue workflow exists
- [ ] Security Scan workflow exists (secret + vuln)
- [ ] .env in .gitignore; .env.example present
- [ ] docs/rollback.md exists
- [ ] No secrets in code
- [ ] Merge to main triggers deploy

---

*This standard applies to all repos. $20M company. Millions of revamps. Problems before they happen.*
