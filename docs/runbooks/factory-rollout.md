# Factory Rollout Runbook

Use this runbook after merging the factory bootstrap changes to verify that automation is live in GCP and not only present in-repo.

## 1) Live inventory (Cloud Shell)

```bash
PROJECT_ID="encoded-shape-487615-b1" REGION="us-central1" ./scripts/gcp-inventory.sh
```

Expected output sections:
- Cloud Run service inventory for the selected region.
- Cloud Build trigger inventory (GA first, beta fallback).

## 2) Trigger baseline per repo

Create and verify three triggers per repo:
- PR against `main` -> `cloudbuild.ci.yaml`
- `develop` push -> `cloudbuild.cd.stg.yaml`
- `main` push -> `cloudbuild.cd.prod.yaml`

## 3) Admin-plane IAM (non-negotiable)

- Never grant `allUsers` invoker on `*-admin-*` services.
- Prefer group-based invoker assignment:
  - `group:tool-admins@mangu-publishers.com`
- Keep admin staging private.

## 4) Smoke proof

- Push a tiny change to `develop` and confirm staging deploy.
- Merge to `main` and confirm production deploy.
- Record build links and live URLs in release notes.
