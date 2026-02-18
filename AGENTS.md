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
