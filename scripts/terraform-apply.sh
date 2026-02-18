#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/common-env.sh"

if ! require_cmd terraform "Run this from Cloud Shell or via 'make toolbox-shell', then rerun 'make terraform-apply'."; then
  exit 0
fi

TF_DIR="${TF_DIR:-infra}"

if [[ ! -d "$TF_DIR" ]]; then
  echo "[info] Terraform directory '$TF_DIR' was not found."
  echo "[info] Set TF_DIR to your terraform root, e.g. TF_DIR=deploy/terraform make terraform-apply"
  exit 0
fi

echo "[run] terraform -chdir=${TF_DIR} init"
terraform -chdir="$TF_DIR" init

echo "[run] terraform -chdir=${TF_DIR} apply"
terraform -chdir="$TF_DIR" apply
