# Agent Governance — Universal Approach

A stack-agnostic framework for running AI agents safely in any backend repository.
Share this before any agent session that will touch a PR.

---

## The core problem this solves

AI agents are fast but stateless. Every session starts from zero. Without deliberate controls,
agents repeat the same classes of mistake across sessions, and no one owns the outcome.
The goal is to make the system enforce correctness rather than relying on any individual
agent or human to remember.

---

## 1. The four files every repo needs

These are not optional enhancements. They are the minimum infrastructure for
agent-assisted development.

**`CLAUDE.md` (root)** — Persistent agent memory. Read automatically on every session start.
Contains architecture rules, known bug patterns, ownership boundaries, and the exact commands
to run before committing. Without this, every agent session rediscovers the same problems.

**`.github/CODEOWNERS`** — Declares which humans must approve which paths before merge.
Splits the repo into paths agents can merge autonomously (controllers, tests, docs) and paths
that require a human (schema, auth, routes, CI config). GitHub enforces this when branch
protection is active.

**`.github/PULL_REQUEST_TEMPLATE/`** — Structures every PR the same way regardless of who
or what created it. Forces the author to declare: what changed, what was tested, does it touch
the schema, does it touch security. Catches gaps before review.

**`.github/workflows/quality-gate.yml`** — Runs lint, tests, and build on every PR
automatically. The gate that makes the other three files meaningful, because a CODEOWNERS
file with no passing CI is just text.

---

## 2. Split ownership into two tiers — not one

Most repos either give agents full access or no access. Both are wrong.

**Tier 1 — Human required:** Schema, auth middleware, validation rules, socket handlers,
route definitions, CI/CD config, deployment files. These have wide blast radius. One bad
change here breaks everything. Require explicit approval.

**Tier 2 — Agent autonomous:** Controllers, services, client components, tests, documentation.
These have narrow blast radius. Tests catch regressions. Agents can iterate here without
blocking a human every time.

The CODEOWNERS file is the mechanism. Write it to reflect this split explicitly.

---

## 3. The six bug classes that appear in every backend codebase

These are not project-specific. They recur across codebases. Check for all six during any investigation.

| Class | Pattern | Example |
|-------|---------|---------|
| **Schema-code mismatch** | SQL references a column that doesn't exist in the table definition | `updated_at` in UPDATE query, column not in CREATE TABLE |
| **Broadcast scope** | Real-time event sent to all connections instead of the intended target | `socket.broadcast.emit` leaking private state to all users |
| **Shared error boundary** | Cache/auxiliary service failure inside a single try/catch that also wraps the primary operation | Redis failure returning 500 when the DB is healthy |
| **Type coercion assumption** | Implicit JS type coercion masking a type mismatch that fails under edge conditions | `pg` returning `COUNT(*)` as string, compared with `>=` to an integer |
| **Variable shadowing** | Inner `let` re-declares an outer variable name in a nested scope | `paramIndex` declared twice at different scopes in the same function |
| **Missing validation** | A mutating route accepts unvalidated user input and passes it to a DB query | POST route with no validation middleware before the controller |

---

## 4. The Redis fallback rule (and why it matters)

Any service used as a cache in front of a primary store must be independently wrapped.

```js
// Correct pattern — Redis and DB are in separate try/catch blocks
let cached
try { cached = await redis.get(key) } catch { /* log, continue */ }
if (cached) return cached

const result = await db.query(...)

try { await redis.setEx(key, ttl, result) } catch { /* log, continue */ }
return result
```

If the Redis call and the DB query share one try/catch, a Redis outage returns HTTP 500
to the user even though the data is perfectly accessible in the database. This class of bug
is invisible until Redis goes down in production.

---

## 5. Write CLAUDE.md as a bug registry, not just a style guide

Most CLAUDE.md files list preferences. That is not enough.

The high-value content is a **fixed bugs table**: commit hash, file, what was wrong, what was fixed.
When an agent reads this at session start it knows not to re-introduce those patterns.
When a new agent runs an investigation it can skip what has already been resolved.
When you review a PR you have a checklist of known regressions to look for.

Recommended structure, top to bottom:

1. Rules
2. Architecture invariants
3. Fixed bugs registry
4. Ownership map
5. Workflow checklist (exact commands to run)

The rules come first because agents read top to bottom and may be cut off by context limits.

---

## 6. Branch protection is the lock on the door

CODEOWNERS, quality gates, and PR templates do nothing if someone can push directly to main.
Branch protection must be enabled with:

- Require pull request before merging
- Require approvals (minimum 1)
- Require review from Code Owners
- Require status checks to pass (name the quality-gate job explicitly)

This converts the governance files from documentation into enforcement. Without it, all four
files are advisory.

---

## 7. The agent workflow contract

Every agent session, regardless of task, follows the same sequence:

```
1. Read CLAUDE.md before writing any code
2. Create a branch: claude/<task-slug>
3. Make changes
4. Run tests — must pass
5. Run lint — zero warnings
6. Commit specific files by name (never git add -A)
7. Push and open PR against the protected branch
8. Never self-merge paths listed in CODEOWNERS
```

This sequence is the agent's equivalent of a human developer's code review culture.
It does not require humans to supervise every step — it requires the agent to follow the
contract, and the CI gate to verify it.

---

## 8. The investigation methodology

When investigating errors, the order of operations matters:

1. **Explore structure first** — understand what the project is before reading individual files
2. **Read the files that matter most** — entry point, schema, auth, socket handlers, config
3. **Run the actual toolchain** — install deps, run tests, run lint; reported errors are real errors
4. **Cross-reference code against schema** — the most common source of runtime failures is SQL
   referencing columns that don't exist
5. **Trace data types across the stack** — from DB driver output through comparison operators;
   type coercion silences many bugs until it doesn't
6. **Check every security boundary** — broadcast scope, auth middleware on every route,
   validation before every DB write
7. **Fix in order of blast radius** — schema and security first, then reliability, then type
   safety, then code quality

---

## Quick reference — what each file does

| File | Role | Enforced by |
|------|------|-------------|
| `CLAUDE.md` | Agent memory and rules | Agent reads it at session start |
| `.github/CODEOWNERS` | Approval requirements per path | GitHub branch protection |
| `.github/PULL_REQUEST_TEMPLATE/` | PR structure | GitHub UI |
| `.github/workflows/quality-gate.yml` | Lint + test + build on every PR | GitHub Actions |
| Branch protection rules | Prevents direct push to main | GitHub settings |

All five pieces must be in place. Any one missing reduces the others to suggestions.
