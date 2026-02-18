# Crack Log

Use this ledger to capture every failed Reality Protocol check as either:
- **Fixed** with date + commit + owner, or
- **Deferred** with explicit reason, risk, owner, and due date.

## Current permanent controls

1. `scripts/golden-check.sh` treats any admin `allUsers` exposure as a release-blocking failure.
2. `cloudbuild/ci.yaml` executes `pnpm run validate` and `bash scripts/golden-check.sh` for PR CI.
3. `scripts/gcp-inventory.sh` provides an auditable one-shot inventory to establish ground truth.

## Entry template

```md
### YYYY-MM-DD — <control name>
- Status: Fixed | Deferred
- Evidence: <link to build/log/screenshot>
- Owner: <name>
- Risk notes: <what could break>
- Follow-up due: <date or N/A>
```
