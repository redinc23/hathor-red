# Current Repo Audit — Hathor Music Platform

**Date:** Feb 17, 2026  
**Standard:** [REPO-STANDARD.md](../REPO-STANDARD.md)  
**Purpose:** What shouldn't be here. What's missing. What we fix.

---

## 1. What Shouldn't Be There (Or Needs Fixing)

| Item | Location | Issue | Fix |
|------|----------|-------|-----|
| **Plain text passwords in seed** | `database/seed.js` | `password123` for demo users. Dev-only, hashed before insert—acceptable. | Add comment: "DEV ONLY. Never run in prod." Consider env var for seed password. |
| **Default password in docker-compose** | `docker-compose.yml` | `POSTGRES_PASSWORD: ${DB_PASSWORD:-password}` | Weak default. Require `DB_PASSWORD` in prod. Document. |
| **Snyk (3rd party, paid)** | `security-scan.yml` | Requires `SNYK_TOKEN`. Paid tool. | Per blueprint: prefer Google. Use Trivy only, or OSV. Drop Snyk or make optional. |
| **Huge agent file** | `.github/agents/my-agent.agent.md` | 1700+ lines of Python (magic-core, magic-deploy, etc.). | Is this Cursor agent config? If not, move to `tools/` or separate repo. If yes, trim. |

---

## 2. What's Missing (Critical Gaps)

| Gap | Impact | Fix |
|-----|--------|-----|
| **No deploy workflow** | Merge to main does nothing. No deployment. | Add `.github/workflows/deploy.yml`. Trigger on push to main. Build → Deploy. |
| **No deploy script** | `package.json` has no `deploy` script. | Add `"deploy": "..."` or document deploy target (Cloud Run, Fly, Docker). |
| **No build-on-PR** | Quality Gate runs `validate` (lint, test) but not full `build`. | Add build step to Quality Gate or separate job. Ensure build works before merge. |
| **No secret scan** | Security scan has Snyk + Trivy. Trivy does vuln. No explicit secret scan. | Add gitleaks or Trivy secret scan. Block merge if secrets in code. |
| **No Chat/webhook on failure** | Build fails, nobody notified. | Add step: on failure, POST to webhook (Google Chat, Slack). |
| **No PR staleness automation** | PRs can die. | Add scheduled workflow or external automation. |
| **No branch protection doc** | Repo Standard says require PR, no force push. | Document in README. Enable in GitHub settings. |

---

## 3. Current Workflows (What Exists)

| Workflow | Trigger | What It Does |
|----------|---------|---------------|
| **quality-gate.yml** | PR, push (all branches) | pnpm install, `pnpm run validate` (type-check, lint, test) |
| **bug-to-issue.yml** | After Quality Gate completes | 3 fails → create issue. 2 successes → close. |
| **security-scan.yml** | PR, push | Snyk (needs SNYK_TOKEN) + Trivy filesystem scan |

**Missing:** Deploy. Build in CI (validate runs tests, not full client build). Secret scan. Notifications.

---

## 4. Agent / Workflow Gaps

**Blueprint says:** "Agents triggered when there's a build request, PR—see it through to deployment. If bugs, deal incessantly until remediated or kicked out."

| Expected | Current |
|----------|---------|
| PR → validate → build → merge → deploy | PR → validate only. No deploy. |
| Build fail → notify | No notification. |
| Deploy fail → alert, remediate | No deploy. |
| Bug 3x → issue, remediate | ✅ Bug-to-issue exists. |
| PR staleness → notify | ❌ Missing. |

---

## 5. Organization

| Aspect | Status |
|--------|--------|
| .gitignore | ✅ Has .env, node_modules, etc. |
| .env.example | ✅ Exists. |
| docs/rollback.md | ❌ Missing. |
| README | ✅ Exists. |
| build script | ✅ `npm run build` |
| test script | ✅ `npm run test` |
| validate script | ✅ `npm run validate` |
| deploy script | ❌ Missing. |

---

## 6. Action Items

1. **Add deploy workflow** — `.github/workflows/deploy.yml` on push to main.
2. **Add deploy script** — Or document deploy target. Cloud Run? Fly? Docker push?
3. **Add build to CI** — Quality Gate or deploy: run `pnpm run build` to catch build failures before merge.
4. **Add secret scan** — Gitleaks or Trivy `--scanners secret`. Fail on hit.
5. **Add docs/rollback.md** — Per Repo Standard.
6. **Add failure webhook** — On build/deploy fail, POST to Chat.
7. **Review Snyk** — Drop or make optional if going Google-first.
8. **Review agent file** — Trim or relocate.

---

*Audit complete. Fix gaps. Apply Repo Standard across all 48.*
