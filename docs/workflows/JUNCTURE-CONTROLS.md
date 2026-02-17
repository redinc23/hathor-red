# Juncture-by-Juncture Controls

**Purpose:** Controls at every stage. No stage without a check.  
**Principle:** You don't hound devs—the system enforces.

---

## Stage 1: Code Commit

| Control | Check | Action if Fail |
|---------|-------|----------------|
| Pre-commit hook | Lint, no secrets | Block commit |
| Tool | Husky + lint-staged, git-secrets | Show errors |

---

## Stage 2: Push to Branch

| Control | Check | Action if Fail |
|---------|-------|----------------|
| Branch protection | Can't push directly to main | Push rejected |
| Tool | GitHub Settings → Branches | Require PR |

---

## Stage 3: Pull Request Opened

| Control | Check | Action if Fail |
|---------|-------|----------------|
| CI workflow | Tests, lint, build pass | Red X on PR |
| Tool | .github/workflows/quality-gate.yml | Block merge |
| Security scan | No secrets, no critical vulns | Block merge |
| Tool | .github/workflows/security-scan.yml | Block merge |

---

## Stage 4: Code Review

| Control | Check | Action if Fail |
|---------|-------|----------------|
| Required reviewers | 1+ approval | Can't merge |
| Tool | GitHub branch protection | Block merge |
| CODEOWNERS | Right people review | Auto-assign |

---

## Stage 5: Merge to Main

| Control | Check | Action if Fail |
|---------|-------|----------------|
| All checks green | CI + security pass | Can't merge |
| Tool | GitHub | Block merge |

---

## Stage 6: Deploy Triggered

| Control | Check | Action if Fail |
|---------|-------|----------------|
| Deploy workflow | Test, build, deploy | Workflow fails |
| Tool | .github/workflows/deploy.yml | Notify |
| Deploy hook | Railway/Render receives | App stays old |

---

## Stage 7: Post-Deploy

| Control | Check | Action if Fail |
|---------|-------|----------------|
| Health check | /api/health returns 200 | Alert |
| Tool | .github/workflows/health-check.yml | Every 15 min |
| Platform | Railway/Render auto-restart | App recovers |

---

## Stage 8: Incident

| Control | Check | Action if Fail |
|---------|-------|----------------|
| Alert | Error rate > threshold | Notify |
| Tool | Webhook → Chat/Email | On-call responds |
| Rollback | docs/rollback.md | Manual revert |

---

## GitHub Checklist (Configure Once)

- [ ] Branch protection on main (require PR, 1 approval)

- [ ] Required status checks: quality-gate, security-scan

- [ ] CODEOWNERS file (optional)

- [ ] DEPLOY_HOOK secret (Railway)

- [ ] APP_URL, ALERT_WEBHOOK_URL (health check)

---

*Controls at every juncture. No stage without a check.*
