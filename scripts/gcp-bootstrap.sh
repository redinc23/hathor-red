#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: PROJECT_ID=<gcp-project> [REGION=us-central1] $0
   or: $0 --project <gcp-project> [--region us-central1]

Bootstraps APIs + Artifact Registry repo for Cloud Build/Cloud Run deploys.
USAGE
}

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
AR_REPO="${AR_REPO:-hathor-red}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_ID="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$PROJECT_ID" ]]; then
  echo "PROJECT_ID is required." >&2
  usage
  exit 1
fi

echo "==> Using project: ${PROJECT_ID}"
echo "==> Region: ${REGION}"
echo "==> Artifact Registry repo: ${AR_REPO}"

gcloud config set project "${PROJECT_ID}" >/dev/null

echo "==> Enabling required services"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  developerconnect.googleapis.com \
  secretmanager.googleapis.com \
  monitoring.googleapis.com

if ! gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" >/dev/null 2>&1; then
  echo "==> Creating Artifact Registry repository ${AR_REPO}"
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Hathor Red container images"
else
  echo "==> Artifact Registry repository ${AR_REPO} already exists"
fi

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

for ROLE in roles/run.admin roles/artifactregistry.writer roles/iam.serviceAccountUser; do
  echo "==> Granting ${ROLE} to ${CLOUDBUILD_SA}"
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CLOUDBUILD_SA}" \
    --role="${ROLE}" \
    --condition=None >/dev/null
  done

echo "✅ Bootstrap complete. Next: link repo in Developer Connect and create Cloud Build triggers."
