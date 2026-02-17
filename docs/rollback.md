# Rollback Procedure

**Per REPO-STANDARD:** Every repo has this. No exceptions.

## When to Rollback

- Deploy introduced a critical bug
- Production is down or severely degraded
- Security incident

## Quick Rollback (Revert Last Deploy)

1. **Identify last good commit:**
   ```bash
   git log main --oneline -5
   ```

2. **Revert the problematic merge:**
   ```bash
   git revert -m 1 <merge_commit_sha>
   git push origin main
   ```

3. **Deploy workflow will run** on push to main. Ensure it deploys the reverted state.

## Manual Rollback (If Deploy Fails)

1. **Check deploy target:** Cloud Run? Fly? Docker? See `package.json` deploy script.
2. **Redeploy previous image/tag** via your platform's UI or CLI.
3. **Create incident issue** — document what went wrong and remediation.

## Contact

- Engineering Lead: [add]
- Ops: [add]

---

*Last updated: Feb 17, 2026*
