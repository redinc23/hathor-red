# Mangu Golden Repo Checklist

## Locked defaults
- Admin group: `group:admins@mangu-platforms.com`
- Canonical Cloud Build trigger paths:
  - `cloudbuild/ci.yaml`
  - `cloudbuild/cd.stg.yaml`
  - `cloudbuild/cd.prod.yaml`

## Must exist in-repo
- `cloudbuild/ci.yaml` for pull request validation.
- `cloudbuild/cd.stg.yaml` for `develop` branch staging deployments.
- `cloudbuild/cd.prod.yaml` for `main` branch production deployments.
- `infra/live/hathor-red/terraform.tfvars` with:
  - `admin_invoker_members = ["group:admins@mangu-platforms.com"]`

## Must be true in GCP
Run in Cloud Shell:

```bash
PROJECT_ID="encoded-shape-487615-b1"
REGION="us-central1"
ADMIN_MEMBER="group:admins@mangu-platforms.com"

for svc in hathor-red-admin-stg hathor-red-admin-prod; do
  gcloud run services remove-iam-policy-binding "$svc" \
    --region="$REGION" \
    --member="allUsers" \
    --role="roles/run.invoker" >/dev/null 2>&1 || true

  gcloud run services add-iam-policy-binding "$svc" \
    --region="$REGION" \
    --member="$ADMIN_MEMBER" \
    --role="roles/run.invoker"
done
```

## Verification commands

```bash
# Repo checks
rg -n "admins@mangu-platforms.com|admin_invoker_members|cloudbuild/(ci|cd\.stg|cd\.prod)\.yaml" -S \
  cloudbuild infra/live/hathor-red docs/standards/golden-checklist.md

# Live IAM checks
REGION="us-central1"
for svc in hathor-red-admin-stg hathor-red-admin-prod; do
  echo "---- $svc invokers"
  gcloud run services get-iam-policy "$svc" --region="$REGION" \
    --format='table(bindings.role,bindings.members)' | rg 'run.invoker|admins@mangu-platforms.com|allUsers' || true
done
```

Expected outcome:
- ✅ `group:admins@mangu-platforms.com` present.
- ❌ `allUsers` absent.
