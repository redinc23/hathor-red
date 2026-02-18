#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
REPOSITORY="${REPOSITORY:-hathor-red}"
STAGING_SERVICE="${STAGING_SERVICE:-hathor-red-staging}"
PROD_SERVICE="${PROD_SERVICE:-hathor-red}"
STAGING_SA_NAME="${STAGING_SA_NAME:-tool-stg-sa}"
PROD_SA_NAME="${PROD_SA_NAME:-tool-prod-sa}"
CB_SA="${CB_SA:-${PROJECT_NUMBER:-}@cloudbuild.gserviceaccount.com}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: PROJECT_ID is required"
  echo "Usage: PROJECT_ID=<your-project-id> REGION=us-central1 bash scripts/gcp-bootstrap.sh"
  exit 1
fi

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

echo "==> Configuring project ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}" >/dev/null

echo "==> Enabling required APIs"
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com >/dev/null

echo "==> Ensuring Artifact Registry repository ${REPOSITORY} exists"
if ! gcloud artifacts repositories describe "${REPOSITORY}" --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${REPOSITORY}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Docker images for ${PROJECT_ID}"
fi

echo "==> Ensuring runtime service accounts exist"
for sa_name in "${STAGING_SA_NAME}" "${PROD_SA_NAME}"; do
  sa_email="${sa_name}@${PROJECT_ID}.iam.gserviceaccount.com"
  if ! gcloud iam service-accounts describe "${sa_email}" >/dev/null 2>&1; then
    gcloud iam service-accounts create "${sa_name}" \
      --display-name="${sa_name} runtime"
  fi
done

echo "==> Granting Artifact Registry read permissions to runtime service accounts"
for sa_name in "${STAGING_SA_NAME}" "${PROD_SA_NAME}"; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${sa_name}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.reader" >/dev/null
done

echo "==> Granting Cloud Build deploy permissions"
for role in roles/run.admin roles/iam.serviceAccountUser roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CB_SA}" \
    --role="${role}" >/dev/null
done

echo "==> Ensuring baseline Cloud Run services exist"
if ! gcloud run services describe "${STAGING_SERVICE}" --region="${REGION}" >/dev/null 2>&1; then
  gcloud run deploy "${STAGING_SERVICE}" \
    --region="${REGION}" \
    --image="us-docker.pkg.dev/cloudrun/container/hello" \
    --allow-unauthenticated \
    --service-account="${STAGING_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --quiet >/dev/null
fi

if ! gcloud run services describe "${PROD_SERVICE}" --region="${REGION}" >/dev/null 2>&1; then
  gcloud run deploy "${PROD_SERVICE}" \
    --region="${REGION}" \
    --image="us-docker.pkg.dev/cloudrun/container/hello" \
    --no-allow-unauthenticated \
    --service-account="${PROD_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --quiet >/dev/null
fi

echo "Bootstrap complete."
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Artifact Registry: ${REPOSITORY}"
echo "Runtime service accounts: ${STAGING_SA_NAME}, ${PROD_SA_NAME}"
