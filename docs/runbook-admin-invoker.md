# Admin Invoker Runbook (IAM-first)

## Grant admin invoker

```bash
PROJECT_ID="encoded-shape-487615-b1"
REGION="us-central1"
SERVICE="hathor-red-admin-prod"
PRINCIPAL="user:renee@mangu-publishers.com" # later: group:tool-admins@mangu-publishers.com

gcloud config set project "$PROJECT_ID"
gcloud run services add-iam-policy-binding "$SERVICE" \
  --region "$REGION" \
  --member "$PRINCIPAL" \
  --role "roles/run.invoker"
```

## Revoke admin invoker

```bash
PROJECT_ID="encoded-shape-487615-b1"
REGION="us-central1"
SERVICE="hathor-red-admin-prod"
PRINCIPAL="user:renee@mangu-publishers.com"

gcloud config set project "$PROJECT_ID"
gcloud run services remove-iam-policy-binding "$SERVICE" \
  --region "$REGION" \
  --member "$PRINCIPAL" \
  --role "roles/run.invoker"
```

## Ensure admin is not public

```bash
PROJECT_ID="encoded-shape-487615-b1"
REGION="us-central1"
SERVICE="hathor-red-admin-prod"

gcloud config set project "$PROJECT_ID"
gcloud run services remove-iam-policy-binding "$SERVICE" \
  --region "$REGION" \
  --member "allUsers" \
  --role "roles/run.invoker" || true
```
