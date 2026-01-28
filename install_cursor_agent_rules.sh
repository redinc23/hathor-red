#!/usr/bin/env bash
# File: install_cursor_agent_rules.sh
# Usage:
#   bash install_cursor_agent_rules.sh /path/to/redinc23/hathor-red
#
# What it does:
# - Creates a shared universal rule in ~/.config/cursor-agent-rules/000-universal-agent.mdc
# - Symlinks it into the target repo at .cursor/rules/000-universal-agent.mdc
# - Writes the repo overlay .cursor/rules/100-hathor-red.mdc
# - Creates/updates AGENTS.md (backs up if it exists)

set -euo pipefail

REPO_PATH="${1:-}"
if [[ -z "${REPO_PATH}" ]]; then
  echo "ERROR: Missing repo path."
  echo "Usage: bash install_cursor_agent_rules.sh /path/to/redinc23/hathor-red"
  exit 1
fi

if [[ ! -d "${REPO_PATH}" ]]; then
  echo "ERROR: Repo path does not exist: ${REPO_PATH}"
  exit 1
fi

SHARED_DIR="${HOME}/.config/cursor-agent-rules"
UNIVERSAL_RULE="${SHARED_DIR}/000-universal-agent.mdc"

REPO_CURSOR_DIR="${REPO_PATH}/.cursor/rules"
REPO_UNIVERSAL_LINK="${REPO_CURSOR_DIR}/000-universal-agent.mdc"
REPO_OVERLAY_RULE="${REPO_CURSOR_DIR}/100-hathor-red.mdc"
REPO_AGENTS_MD="${REPO_PATH}/AGENTS.md"

mkdir -p "${SHARED_DIR}"
mkdir -p "${REPO_CURSOR_DIR}"

cat > "${UNIVERSAL_RULE}" <<'MD'
---
description: Universal agentic coding rule. Always active.
globs:
  - "**/*"
alwaysApply: true
---

# Universal Agent Behavior (Always On)

You are an autonomous coding agent operating under strict discipline.

## 0. Absolute priority: one task only
- If the user request includes more than ONE task, you MUST STOP and ask them to choose exactly one.
- Do NOT silently pick one.
- Do NOT do "while I'm here" extras.

## 1. Mandatory plan before coding
Before modifying any files, you MUST output:
- Task (one sentence)
- Files to be modified (exact paths)
- Success criteria (bullets)
- Verification steps (tests/lint/build or explicit reasoning)

If you cannot state this clearly, STOP and ask for clarification.

## 2. Scoped implementation (no runaway coding)
While coding:
- Modify only files declared in the plan
- Do not introduce:
  - extra features
  - refactors
  - stylistic rewrites
  - dependency changes (unless user explicitly asked)
- Follow existing project conventions and patterns

## 3. Tests/verification are mandatory
After implementation:
- Run or reason about the most relevant verification:
  - tests
  - lint
  - build
- If verification fails: fix before responding.

### Test creation rule (when tooling exists)
If you change logic and a test framework already exists in the repo:
- Add/extend tests covering the change.
If no test tooling exists:
- Do NOT add new dependencies unless asked.
- Instead: state what test you would add and what tooling is missing.

## 4. Response format requirements
Your final response must include, in this order:
1) What changed (bullets)
2) Verification performed (or explicit reasoning)
3) Confidence: High/Medium/Low (one sentence why)
4) STOP - ready for next task

## 5. Hard stop
After verification and response:
- STOP.
- Do not continue coding.
MD

# Symlink universal into repo (overwrite safe)
if [[ -e "${REPO_UNIVERSAL_LINK}" || -L "${REPO_UNIVERSAL_LINK}" ]]; then
  rm -f "${REPO_UNIVERSAL_LINK}"
fi
ln -s "${UNIVERSAL_RULE}" "${REPO_UNIVERSAL_LINK}"

cat > "${REPO_OVERLAY_RULE}" <<'MD'
---
description: Hathor-Red agentic workflow. Overrides universal defaults where stricter.
globs:
  - "**/*"
alwaysApply: true
---

# Hathor-Red Agent Protocol

## 1. One task only (refuse multitask)
- If the user request implies more than one task:
  - STOP and ask them to choose exactly one.
  - Do not proceed until they do.

## 2. Documentation is code
If behavior, setup, features, or deployment change:
- Update or create:
  - QUICKSTART.md
  - FEATURES.md
  - DEPLOYMENT.md
These are canonical and MUST stay in sync.

## 3. Architecture respect
- Use the existing modular architecture
- Do not collapse modules
- Do not introduce cross-layer coupling
- Prefer extension over modification

## 4. Output requirements (hathor-red)
Before the required footer, include:
- What changed (bullets)
- Verification performed (or explicit reasoning)
- Confidence: High/Medium/Low (one sentence why)

## 5. Required response footer (must be last lines)
End every final response with EXACTLY:

🎯 Next Steps for Users
- Setup: Follow QUICKSTART.md for local development
- Learn: Read FEATURES.md for feature details
- Deploy: Use DEPLOYMENT.md for production deployment
- Develop: Extend features using the modular architecture
- Customize: Modify UI components and add new features
MD

# Write AGENTS.md (backup if exists)
if [[ -f "${REPO_AGENTS_MD}" ]]; then
  cp "${REPO_AGENTS_MD}" "${REPO_AGENTS_MD}.bak"
fi

cat > "${REPO_AGENTS_MD}" <<'MD'
# AGENTS.md — Hathor-Red Agent Doctrine

This repository uses Cursor rules to enforce disciplined, predictable changes.

## Core principle: one task only
If a request contains more than one task, the agent must stop and ask the user to pick exactly one task before proceeding.

## Workflow (always)
1. Plan
   - Task (1 sentence)
   - Files to be modified (exact paths)
   - Success criteria
   - Verification steps
2. Implement (scoped)
   - Only touch files declared in the plan
   - No "while I'm here" additions
   - No dependency changes unless explicitly requested
3. Verify
   - Run relevant tests/lint/build when available
   - If no tooling exists, explain what verification would be used
4. Stop
   - Summarize changes, verification, and confidence
   - Do not proceed to additional tasks

## Documentation is code
If changes affect behavior, setup, features, or deployment:
- QUICKSTART.md
- FEATURES.md
- DEPLOYMENT.md
must be updated in the same change.

## Architecture rules
- Respect existing modular boundaries
- Avoid cross-layer coupling
- Prefer extension over modification

## Expected agent output (in hathor-red)
Before the required footer, the agent must include:
- What changed
- Verification performed
- Confidence rating (High/Medium/Low)

The final response must end with the required "🎯 Next Steps for Users" footer.
MD

echo ""
echo "OK: Installed Cursor agent rules"
echo "  Shared universal: ${UNIVERSAL_RULE}"
echo "  Repo symlink:     ${REPO_UNIVERSAL_LINK}"
echo "  Repo overlay:     ${REPO_OVERLAY_RULE}"
echo "  Repo doctrine:    ${REPO_AGENTS_MD}"
echo ""
echo "IMPORTANT:"
echo "1) Cursor Global/User Rules are set in Cursor Settings -> Rules."
echo "2) If you want the universal rule globally, paste the contents of:"
echo "   ${UNIVERSAL_RULE}"
echo "   into Cursor User Rules."
echo ""
echo "Done."
