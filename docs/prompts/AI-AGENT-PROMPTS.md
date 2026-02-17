# AI Agent Prompts — Copy-Paste Ready

**Purpose:** Give these prompts to Claude, GPT-4, or any coding agent. Get consistent, actionable output.  
**Use:** Audit repos, validate PRs, generate requirements, break down tasks.

---

## Prompt 1: Repository Health Audit

```
You are a senior engineering auditor. Analyze this repository and produce a comprehensive GAP ANALYSIS document.

Repository: [PASTE REPO URL or ATTACH FILES]

Audit these categories:

1. DEPLOYMENT READINESS
   - Does a Dockerfile exist?
   - Does cloudbuild.yaml exist (for GCP) or .github/workflows/deploy.yml (for GitHub Actions)?
   - Are environment variables documented in .env.example?
   - Is there a health check endpoint (/api/health or equivalent)?
   - Can this app deploy to production RIGHT NOW? If not, what's missing?

2. CI/CD PIPELINE
   - Does CI run on every PR (tests, lint, build)?
   - Does CD deploy automatically on merge to main?
   - Are there any manual deployment steps? (Flag these as GAPS)
   - Is there a rollback procedure documented?

3. CODE QUALITY GATES
   - Are there pre-commit hooks (linting, secret scanning)?
   - Do tests run in CI? What's the coverage %?
   - Is there a security scan (dependency vulnerabilities)?
   - Are merge protections enabled (require PR approval)?

4. OBSERVABILITY
   - Is structured logging implemented (not console.log)?
   - Are there health/readiness probes?
   - Is error tracking configured?
   - Are there any metrics/monitoring endpoints?

5. DOCUMENTATION
   - Does README explain what this tool does?
   - Is there a DEPLOYMENT.md with step-by-step deploy instructions?
   - Is there a ROLLBACK.md with recovery procedures?
   - Is there API documentation?

6. SECURITY
   - Are secrets stored securely (not hardcoded)?
   - Is .gitignore configured correctly (no .env, keys, credentials)?
   - Is there rate limiting on API endpoints?
   - Is there input validation on all user-facing endpoints?

7. ENVIRONMENTS
   - Is there evidence of multiple environments (dev, staging, prod)?
   - Are environment-specific configs documented?
   - Is there a separate branch strategy?

OUTPUT FORMAT:
For each category, produce:
- ✅ PASSING: What's already in place
- ❌ GAPS: What's missing (be specific, actionable)
- 🔧 FIXES: Exact steps to close each gap (file to create/modify, code snippets)

Prioritize gaps as:
- 🔴 CRITICAL (blocks production deployment)
- 🟡 HIGH (major risk or inefficiency)
- 🟢 MEDIUM (nice-to-have, future improvement)

End with a DEPLOYMENT READINESS SCORE: X/100
```

---

## Prompt 2: Development Requirements Document Generator

```
You are a technical product manager. Analyze this codebase and generate a DEVELOPMENT REQUIREMENTS DOCUMENT that identifies all gaps and missing features.

Repository: [PASTE REPO URL or ATTACH FILES]

Analyze:
1. INCOMPLETE FEATURES
   - Which API endpoints are stubbed out (return TODO or mock data)?
   - Which frontend components are placeholders?
   - Which database tables are unused?
   - Which error handlers just throw generic errors?

2. MISSING FUNCTIONALITY
   - Based on README/docs, what features are described but not implemented?
   - What API endpoints are documented but return 404?
   - What configuration options exist but don't work?

3. TECHNICAL DEBT
   - What code has TODO/FIXME comments?
   - What functions exceed 50 lines (refactor candidates)?
   - What files have no tests?
   - What dependencies are outdated or deprecated?

4. PRODUCTION READINESS
   - What environment variables are missing defaults?
   - What error scenarios aren't handled (network failures, timeouts)?
   - What validation is missing on user inputs?
   - What rate limiting isn't implemented?

OUTPUT FORMAT:
For each gap, produce a DEV REQUIREMENT:

---
**REQ-001: [Title]**
**Priority:** 🔴 CRITICAL / 🟡 HIGH / 🟢 MEDIUM
**Current State:** [What exists now]
**Expected State:** [What should exist]
**Acceptance Criteria:**
  - [ ] Criterion 1
  - [ ] Criterion 2
**Estimated Effort:** X hours
**Files to modify:** [list]
---

Group requirements by priority. Estimate total hours to close all gaps.
```

---

## Prompt 3: Bulk Coding Task Breakdown

```
You are a technical lead. Break down this high-level requirement into specific, actionable coding tasks suitable for junior developers.

Requirement: [PASTE YOUR REQUIREMENT]

For example: "Add user authentication with JWT tokens, Google OAuth, and password reset functionality"

Break this into:
1. TASK-001: [Title]
   - File: [path]
   - [Specific details]
   - Edge cases: [list]
   - Test cases: [list]
   - Estimated time: X hours

2. TASK-002: [Title]
   ...

For each task provide:
- Task ID
- Description
- File(s) to create/modify
- Specific function signatures or API contracts
- Edge cases to handle
- Test cases to write
- Estimated time (hours)

Order tasks by dependency (what must be done first).
```

---

## Prompt 4: Post-Development Validation Checklist

```
You are a QA engineer. Validate that this pull request meets production standards.

PR Details: [PASTE PR URL or DIFF]

Checklist:

1. CODE QUALITY
   - [ ] No console.log statements (use logger)
   - [ ] No hardcoded secrets or API keys
   - [ ] No commented-out code (clean it up)
   - [ ] Functions are under 50 lines
   - [ ] Variable names are descriptive

2. ERROR HANDLING
   - [ ] All async functions have try/catch
   - [ ] All database queries handle connection errors
   - [ ] All API calls have timeout handling
   - [ ] User-facing errors have helpful messages

3. SECURITY
   - [ ] User inputs are validated (type, length, format)
   - [ ] SQL queries use parameterized statements
   - [ ] Passwords are hashed (never stored plain text)
   - [ ] Auth tokens are verified on protected routes

4. TESTING
   - [ ] Unit tests exist for new functions
   - [ ] Tests cover happy path and error cases
   - [ ] Tests pass locally (npm test)
   - [ ] Code coverage increased or stayed same

5. DOCUMENTATION
   - [ ] README updated if new features added
   - [ ] API endpoints documented
   - [ ] Environment variables added to .env.example
   - [ ] Complex logic has explanatory comments

6. DEPLOYMENT
   - [ ] Changes are backward compatible
   - [ ] Database migrations are included (if schema changed)
   - [ ] New dependencies are documented
   - [ ] Dockerfile builds successfully

For each failing item, provide:
- Specific line numbers or files
- What needs to change
- Example fix (code snippet)

Rate this PR: APPROVE / REQUEST CHANGES / REJECT
If REQUEST CHANGES, list specific blockers.
```

---

## Prompt 5: Validate PR Against Requirements

```
You are a code reviewer. This PR claims to implement the following requirements:

[PASTE REQUIREMENTS DOC]

PR Diff:
[PASTE PR DIFF or attach files]

For each requirement, verify:
1. Is the requirement fully implemented?
2. Does the code match the acceptance criteria?
3. Are edge cases handled?
4. Are tests included?
5. Is documentation updated?

For each requirement, respond:

---
**REQ-001: [Title]**
**Status:** ✅ COMPLETE / ⚠️ PARTIAL / ❌ MISSING

**What was implemented:** [describe]

**What's missing:** [list]

**Recommended changes:** [list]

**Code snippet for fix:** [if applicable]
---

OVERALL PR ASSESSMENT:
Requirements met: X / Y
Code quality: A+ / A / B / C / F
Test coverage: X%
RECOMMENDATION: APPROVE / REQUEST CHANGES / REJECT
```

---

## Prompt 6: Live Environment Verification

```
You are a site reliability engineer. Verify that this application is actually running in production and healthy.

Application URL: [PASTE URL]

Check:

1. ACCESSIBILITY
   - Does the URL respond? (HTTP status)
   - Is HTTPS enabled with valid certificate?
   - What's the response time? (should be <500ms)

2. HEALTH CHECKS
   - Does /health or /api/health exist?
   - What does it return? (JSON with status)
   - Does it check database connectivity?
   - Does it check dependent services?

3. API FUNCTIONALITY
   - Test key endpoints (list 3-5 critical APIs)
   - Do they return expected responses?
   - Are error codes appropriate?

4. DEPLOYMENT HISTORY
   - When was the last deployment?
   - What version is running?
   - Is this the latest code from main branch?

If application is NOT live or has issues, provide:
- Diagnosis (why it's down/broken)
- Recovery steps
- How to prevent this in the future

VERDICT: 
- 🟢 HEALTHY: Everything working as expected
- 🟡 DEGRADED: Running but has issues
- 🔴 DOWN: Not accessible or critically broken
```

---

## How to Use

1. **Audit a repo:** Use Prompt 1. Paste repo URL or attach files.
2. **Get requirements:** Use Prompt 2. Generate dev requirements doc.
3. **Break down work:** Use Prompt 3. Assign to consultants.
4. **Validate PR:** Use Prompt 4 or 5. Check compliance.
5. **Verify live:** Use Prompt 6. Check if app is live and healthy.

---

*Copy-paste. Refine. Reuse. The assembly line that holds.*
