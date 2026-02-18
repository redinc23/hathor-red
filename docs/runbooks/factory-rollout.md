# Factory Rollout Runbook

This runbook standardizes onboarding and rollout for tools using the Mangu factory pattern.

## Preconditions

- Cloud Shell access to target GCP project.
- `gcloud` authenticated and project billing enabled.
- Repository contains:
  - `scripts/gcp-inventory.sh`
  - `infra/modules/tool`
  - `infra/live/<tool-name>` stack

## Step 1: Capture live inventory (ground truth)

Run from Cloud Shell:

```bash
cd /path/to/<repo>
PROJECT_ID="encoded-shape-487615-b1" REGION="us-central1" ./scripts/gcp-inventory.sh
```

Save output in the crack log for this tool.

## Step 2: Baseline Terraform state

```bash
cd infra/live/hathor-red
terraform init
terraform plan
terraform apply
```

If resources already exist and are managed by CI/CD, import before apply:

```bash
terraform import 'module.hathor_red.google_artifact_registry_repository.containers' "projects/${PROJECT_ID}/locations/${REGION}/repositories/containers"
terraform import 'module.hathor_red.google_service_account.public["stg"]' "projects/${PROJECT_ID}/serviceAccounts/hathor-red-public-stg-sa@${PROJECT_ID}.iam.gserviceaccount.com"
terraform import 'module.hathor_red.google_service_account.public["prod"]' "projects/${PROJECT_ID}/serviceAccounts/hathor-red-public-prod-sa@${PROJECT_ID}.iam.gserviceaccount.com"
terraform import 'module.hathor_red.google_service_account.admin["stg"]' "projects/${PROJECT_ID}/serviceAccounts/hathor-red-admin-stg-sa@${PROJECT_ID}.iam.gserviceaccount.com"
terraform import 'module.hathor_red.google_service_account.admin["prod"]' "projects/${PROJECT_ID}/serviceAccounts/hathor-red-admin-prod-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

## Step 3: Validate doctrine

- Triggers exist for PR, `develop`, and `main`.
- Service accounts are environment-specific and least privilege.
- Admin plane has no `allUsers` invoker.
- Public plane unauthenticated policy only where explicitly allowed.

## Step 4: Rollout to next repos

- Copy `infra/live/hathor-red` to `infra/live/<next-tool>`.
- Update `tool_name` and any admin invoker members.
- Repeat inventory + terraform apply.

## Security baseline for admin invokers

Group-based invoker is preferred:

```bash
gcloud run services add-iam-policy-binding <tool>-admin-prod \
  --region us-central1 \
  --member "group:tool-admins@mangu-publishers.com" \
  --role roles/run.invoker
```

If group unavailable, temporarily use user fallback and track in crack log.
