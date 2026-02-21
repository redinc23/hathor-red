# Cloud Run Rollback Runbook

## Scope
Use this runbook to roll back public/admin services for staging or production in GCP.

## Preconditions
- You have `roles/run.admin` (or equivalent) in project `encoded-shape-487615-b1`.
- You know the service and region (`us-central1` by default).

## 1) Identify candidate revisions
```bash
gcloud run revisions list \
  --service=hathor-red-public-prod \
  --region=us-central1
```

For admin, swap `hathor-red-public-prod` with `hathor-red-admin-prod`.

## 2) Shift traffic to the last known-good revision
```bash
gcloud run services update-traffic hathor-red-public-prod \
  --region=us-central1 \
  --to-revisions REVISION_NAME=100
```

## 3) Verify rollback
```bash
gcloud run services describe hathor-red-public-prod \
  --region=us-central1 \
  --format='value(status.url,status.traffic)'
```

Then validate health endpoint:
```bash
curl -fsS "$(gcloud run services describe hathor-red-public-prod --region=us-central1 --format='value(status.url)')/healthz"
```

## 4) Document incident timeline
- Deployment SHA and build ID
- Chosen rollback revision
- Time to mitigation
- Follow-up actions

## Notes
- Admin services should remain private (no `allUsers` invoker).
- Public and admin services should be rolled independently unless blast radius requires both.
