#!/usr/bin/env bash
# MAGICAL CODE SYSTEM LAUNCHER (portable v2)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${MAGENTA}"
cat << "EOF"
+--------------------------------------+
|         SUPERNOVA MAGIC ENGINE       |
|         Portable Pipeline v2         |
+--------------------------------------+
EOF
echo -e "${NC}"

PROJECT_ROOT="${1:-.}"
MODE="${2:-full}"      # analyze | react | api | full
TURBO="${3:-false}"    # true | false
OUT_DIR="${4:-generated}"

cpu_count() {
  if command -v nproc >/dev/null 2>&1; then nproc; return; fi
  if [[ "$(uname -s)" == "Darwin" ]] && command -v sysctl >/dev/null 2>&1; then sysctl -n hw.ncpu; return; fi
  echo "4"
}

check_deps() {
  echo -e "${CYAN}Checking dependencies...${NC}"
  local deps=("python3")
  local missing=()
  for dep in "${deps[@]}"; do
    if ! command -v "$dep" >/dev/null 2>&1; then
      missing+=("$dep")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo -e "${RED}Missing:${NC} ${missing[*]}"
    exit 1
  fi
  echo -e "${GREEN}OK${NC}"
}

init_project_dirs() {
  echo -e "${CYAN}Ensuring output dirs...${NC}"
  mkdir -p "${PROJECT_ROOT}/.magic/cache" "${PROJECT_ROOT}/.magic/config" "${PROJECT_ROOT}/.magic/templates" || true
}

quantum_analyze() {
  echo -e "${CYAN}Analyze...${NC}"
  python3 magic-core.py --project "$PROJECT_ROOT" --mode analyze --limit 200
}

generate_magic() {
  echo -e "${CYAN}Generate...${NC}"
  local pattern="full"
  case "$MODE" in
    "react") pattern="react" ;;
    "api") pattern="api" ;;
    "full") pattern="full" ;;
    "analyze") pattern="full" ;;
    *) pattern="full" ;;
  esac

  local turbo_flag=""
  if [[ "$TURBO" == "true" ]]; then turbo_flag="--turbo"; fi

  python3 magic-core.py --project "$PROJECT_ROOT" --mode generate --pattern "$pattern" --output "$OUT_DIR" $turbo_flag
}

optimize_all() {
  echo -e "${CYAN}Optimize (safe)...${NC}"
  python3 magic-opt.py --project "$PROJECT_ROOT" --level safe
}

generate_tests() {
  echo -e "${CYAN}Generate tests...${NC}"
  python3 magic-test.py --project "$PROJECT_ROOT" --output tests_generated --limit 200
}

deploy_check() {
  echo -e "${CYAN}Deploy check...${NC}"
  python3 magic-deploy.py --project "$PROJECT_ROOT" --check --env production
}

main() {
  echo -e "${BLUE}Project:${NC} $(cd "$PROJECT_ROOT" && pwd)"
  echo -e "${BLUE}Mode:${NC} $MODE"
  echo -e "${BLUE}Turbo:${NC} $TURBO"
  echo -e "${BLUE}Output:${NC} $OUT_DIR"
  echo ""

  check_deps
  init_project_dirs

  if [[ "$MODE" == "analyze" ]]; then
    quantum_analyze
    exit 0
  fi

  quantum_analyze
  generate_magic
  optimize_all
  generate_tests
  deploy_check

  echo -e "${GREEN}MAGIC COMPLETE${NC}"
  echo -e "${CYAN}Next:${NC}"
  echo "  - Review: $OUT_DIR/"
  echo "  - Tests: tests_generated/"
}

trap 'echo -e "\n${RED}Interrupted${NC}"; exit 1' INT TERM
main "$@"
