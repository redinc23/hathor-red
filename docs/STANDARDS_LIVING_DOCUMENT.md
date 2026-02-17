# Engineering Standards — Living Document

**Purpose:** Rock-hard, repeatable standards. Used again and again. The assembly line that holds.  
**Audience:** Devs, consultants, AI agents, anyone building tools.  
**Status:** Living — update as we refine. Others can follow.

---

## Quick Navigation

| Section | What It Covers |
|---------|----------------|
| [REPO STANDARD](REPO-STANDARD.md) | Mandatory workflows, what must/mustn't be in every repo |
| [Juncture Controls](workflows/JUNCTURE-CONTROLS.md) | Controls at every stage (commit → deploy → monitor) |
| [AI Agent Prompts](prompts/AI-AGENT-PROMPTS.md) | Copy-paste prompts for audits, validation, generation |
| [Architectural Blueprint](ARCHITECTURAL_BLUEPRINT.md) | Full 25-step lifecycle (Google Cloud–native vision) |
| [Gap Analysis](deep-dives/GAP-ANALYSIS-WHAT-CAN-GO-WRONG.md) | What can go wrong, how we prevent it |
| [Deploy Guide](../DEPLOY.md) | Get a tool live (Railway/Render) in 15 min |
| [Blueprint Complete](../ARCHITECTURAL_BLUEPRINT_COMPLETE.md) | Consolidated blueprint (save to PC) |

---

## The Two Paths (Reality Check)

### Path A: Single Tool (hathor-red, music app)

**Stack:** Node.js, React, PostgreSQL, Redis, Docker  
**Deploy:** Railway / Render / Fly.io  
**CI/CD:** GitHub Actions (quality-gate, deploy, health-check)  
**Goal:** Push to main → live. Stay live.

**Use:** [DEPLOY.md](../DEPLOY.md), [REPO-STANDARD.md](REPO-STANDARD.md)

### Path B: Product Lifecycle Engine (48 tools, meta-platform)

**Stack:** Google Workspace + GCP (Forms, Sheets, Pub/Sub, Cloud Build, Firestore, Vertex AI)  
**Deploy:** Cloud Run, Cloud Build, Cloud Source Repos  
**Goal:** Idea → Form → Brief → Research → POC → Provision → Code → Deploy. All automated.

**Use:** [ARCHITECTURAL_BLUEPRINT.md](ARCHITECTURAL_BLUEPRINT.md), [ARCHITECTURAL_BLUEPRINT_COMPLETE.md](../ARCHITECTURAL_BLUEPRINT_COMPLETE.md)

**Reality:** hathor-red is Path A. The blueprint describes Path B. Both are valid. Use the right doc for the right system.

---

## Workflow: What's Automated vs Manual

| Step | Automated? | Human Role |
|------|------------|------------|
| Form → Sheet | ✅ Yes | Submit idea |
| Notification (Chat) | ✅ Yes | None |
| Approval | ❌ No | Approve/reject |
| Research folder creation | ✅ Yes | None |
| Research work | ❌ No | Do research |
| POC setup | ✅ Yes | None |
| POC coding | ❌ No | Code POC |
| GCP provisioning | ✅ Yes | None |
| Starter deploy | ✅ Yes | None |
| Business logic | ❌ No | Code features |
| Push to main | ❌ No | Push commit |
| CI/CD (test, build, deploy) | ✅ Yes | None |
| Monitoring | ✅ Yes | None |

**Principle:** Automation handles infrastructure and deployment. Humans do creative work.

---

## Juncture-by-Juncture Controls

Every stage has a control. See [workflows/JUNCTURE-CONTROLS.md](workflows/JUNCTURE-CONTROLS.md) for full detail.

| Stage | Control | If Fail |
|-------|---------|---------|
| Commit | Pre-commit (lint, secrets) | Block commit |
| Push | Branch protection | Block push to main |
| PR | CI (test, lint, build) | Block merge |
| Merge | CD (deploy) | Deploy fails, alert |
| Post-deploy | Health check | Alert if down |

---

## AI Agent Workflow (Bulk Coding)

1. **Audit:** AI agent runs [Prompt 1: Repository Health Audit](prompts/AI-AGENT-PROMPTS.md#prompt-1-repository-health-audit) → produces gap analysis.
2. **Requirements:** AI generates dev requirements doc → you assign to consultants.
3. **Bulk code:** Devs produce PR with 500+ lines.
4. **Validate:** AI runs [Prompt 5: Post-Development Validation](prompts/AI-AGENT-PROMPTS.md#prompt-5-post-development-validation-checklist) → checks compliance.
5. **Fix:** Devs address issues.
6. **Merge:** Auto-deploy.

---

## How to Use This Document

- **New repo:** Start from [REPO-STANDARD.md](REPO-STANDARD.md). Copy workflows, add deploy config.
- **Audit existing repo:** Use [AI Agent Prompts](prompts/AI-AGENT-PROMPTS.md) → Prompt 1.
- **Validate a PR:** Use Prompt 5.
- **Build the meta-platform:** Follow [ARCHITECTURAL_BLUEPRINT.md](ARCHITECTURAL_BLUEPRINT.md).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-17 | Initial living document. Consolidated from standards, prompts, juncture controls. |

---

*This document is permanent and live. Update it as standards evolve. Others follow it.*
