#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage:
  scripts/manage-prs.sh --repo owner/repo --pr 123 --approve
  scripts/manage-prs.sh --repo owner/repo --pr 123 --tag needs-review

Requirements:
  - GITHUB_TOKEN environment variable with repo access.
  - curl and jq available in PATH.
USAGE
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

REPO=""
PR_NUMBER=""
TAG=""
APPROVE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="$2"
      shift 2
      ;;
    --pr)
      PR_NUMBER="$2"
      shift 2
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    --approve)
      APPROVE="true"
      shift
      ;;
    -h|--help)
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

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN is required." >&2
  exit 1
fi

if [[ -z "$REPO" || -z "$PR_NUMBER" ]]; then
  echo "--repo and --pr are required." >&2
  usage
  exit 1
fi

if [[ "$APPROVE" != "true" && -z "$TAG" ]]; then
  echo "Specify at least one action: --approve and/or --tag <label>." >&2
  usage
  exit 1
fi

require_cmd curl
require_cmd jq

API_BASE="https://api.github.com/repos/${REPO}"
AUTH_HEADER="Authorization: Bearer ${GITHUB_TOKEN}"
ACCEPT_HEADER="Accept: application/vnd.github+json"

pr_json=$(curl -sS -H "$AUTH_HEADER" -H "$ACCEPT_HEADER" "${API_BASE}/pulls/${PR_NUMBER}")
if [[ "$(echo "$pr_json" | jq -r '.number // empty')" != "$PR_NUMBER" ]]; then
  echo "Unable to load PR #${PR_NUMBER} for ${REPO}." >&2
  echo "$pr_json" | jq -r '.message // .'
  exit 1
fi

if [[ "$APPROVE" == "true" ]]; then
  review_response=$(curl -sS -X POST \
    -H "$AUTH_HEADER" \
    -H "$ACCEPT_HEADER" \
    "${API_BASE}/pulls/${PR_NUMBER}/reviews" \
    -d '{"event":"APPROVE","body":"Approved via automation script."}')

  review_state=$(echo "$review_response" | jq -r '.state // empty')
  if [[ "$review_state" != "APPROVED" ]]; then
    echo "Failed to approve PR #${PR_NUMBER}." >&2
    echo "$review_response" | jq -r '.message // .'
    exit 1
  fi
  echo "Approved PR #${PR_NUMBER}."
fi

if [[ -n "$TAG" ]]; then
  label_response=$(curl -sS -X POST \
    -H "$AUTH_HEADER" \
    -H "$ACCEPT_HEADER" \
    "${API_BASE}/issues/${PR_NUMBER}/labels" \
    -d "{\"labels\":[\"${TAG}\"]}")

  has_label=$(echo "$label_response" | jq -r --arg TAG "$TAG" 'map(.name) | index($TAG) != null')
  if [[ "$has_label" != "true" ]]; then
    echo "Failed to add label '${TAG}' to PR #${PR_NUMBER}." >&2
    echo "$label_response" | jq -r '.message // .'
    exit 1
  fi

  echo "Added label '${TAG}' to PR #${PR_NUMBER}."
fi

echo "Done."
