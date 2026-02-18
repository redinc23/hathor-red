#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
OPS_GROUP="${OPS_GROUP:-}"
SERVICE="${SERVICE:-tool-admin}"
ADMIN_IMAGE="${ADMIN_IMAGE:-us-docker.pkg.dev/cloudrun/container/hello}"
RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-tool-admin-sa}"

if [[ -z "${PROJECT_ID}" || -z "${OPS_GROUP}" ]]; then
  echo "ERROR: PROJECT_ID and OPS_GROUP are required"
  echo "Usage: PROJECT_ID=<id> OPS_GROUP=tool-admins@example.com REGION=us-central1 bash scripts/deploy-admin-plane.sh"
  exit 1
fi

gcloud config set project "${PROJECT_ID}" >/dev/null

echo "==> Enabling Cloud Run + IAM APIs"
gcloud services enable run.googleapis.com iam.googleapis.com >/dev/null

SA_EMAIL="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "${SA_EMAIL}" >/dev/null 2>&1; then
  echo "==> Creating admin runtime service account ${RUNTIME_SA_NAME}"
  gcloud iam service-accounts create "${RUNTIME_SA_NAME}" \
    --display-name="Admin plane runtime"
fi

echo "==> Deploying private admin Cloud Run service ${SERVICE}"
gcloud run deploy "${SERVICE}" \
  --region="${REGION}" \
  --image="${ADMIN_IMAGE}" \
  --platform=managed \
  --no-allow-unauthenticated \
  --ingress=all \
  --service-account="${SA_EMAIL}" \
  --quiet >/dev/null

echo "==> Granting run.invoker to group:${OPS_GROUP}"
gcloud run services add-iam-policy-binding "${SERVICE}" \
  --region="${REGION}" \
  --member="group:${OPS_GROUP}" \
  --role="roles/run.invoker" >/dev/null

URL="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --format='value(status.url)')"

echo "Admin plane deployed"
echo "Service: ${SERVICE}"
echo "URL: ${URL}"
echo "Invoker group: ${OPS_GROUP}"
