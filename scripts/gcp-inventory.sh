#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-encoded-shape-487615-b1}"
REGION="${REGION:-us-central1}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "error: gcloud CLI is required but was not found in PATH" >&2
  exit 127
fi

gcloud config set project "$PROJECT_ID" >/dev/null

echo "== Cloud Run services (${PROJECT_ID}/${REGION}) =="
gcloud run services list --region="$REGION"

echo
echo "== Cloud Build triggers (GA, then beta fallback) =="
if ! gcloud builds triggers list --region="$REGION" --format="table(name,eventType,filename)"; then
  gcloud beta builds triggers list --region="$REGION" --format="table(name,eventType,filename)"
fi
