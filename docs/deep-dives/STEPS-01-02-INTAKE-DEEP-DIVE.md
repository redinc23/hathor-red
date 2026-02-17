# Deep Dive: Steps 1 & 2 — Intake (Form → Pub/Sub → Validation)

**Blueprint Reference:** [ARCHITECTURAL_BLUEPRINT.md](../ARCHITECTURAL_BLUEPRINT.md)  
**Steps Covered:** `IDEA_SUBMITTED` (1) → `INTAKE_VALIDATED` (2)  
**Purpose:** Implementation-ready checklist; gap analysis; anti-patterns; failure modes.

---

## 1. The "Open Sheet" Anti-Pattern (Why Your Trigger Didn't Fire)

**What happened:** A workflow was set up so that "opening a certain Sheets file" would trigger something. It didn't fire. Classic Apps Script gotcha.

### Root Cause

| Trigger Type | When It Fires | Requires Human Action? | Use for Critical Workflows? |
|--------------|---------------|------------------------|-----------------------------|
| **`onOpen`** (simple) | When a user opens the spreadsheet | **Yes—someone must open the file** | ❌ No |
| **`onOpen`** (installable) | Same—only when spreadsheet is opened | **Yes** | ❌ No |
| **`onEdit`** | When a user edits a cell | Yes—someone must edit | ❌ No |
| **`onFormSubmit`** | When a form response is submitted | **No—event-driven** | ✅ Yes |
| **Time-driven** | On schedule (e.g., every hour) | No | ✅ Yes (for polling) |

**The rule:** Never depend on "open" or "edit" for critical pipeline steps. If nobody opens the Sheet, nothing runs. Use **event-driven** triggers (`onFormSubmit`) or **time-driven** triggers (Cloud Scheduler + Cloud Function for polling).

### For Step 1: Use `onFormSubmit`, Not `onOpen`

- Form submission is an **event**—it happens when the user submits, regardless of who has the Sheet open.
- The trigger is bound to the **Sheet that receives form responses** (the "Response" sheet).
- No one needs to open anything. Submit form → trigger fires → Pub/Sub publish.

---

## 2. Step 1: IDEA_SUBMITTED — Full Implementation Checklist

### 2.1 Prerequisites

| Item | Status | Notes |
|------|--------|-------|
| Google Form created | ☐ | Linked to a Sheet for responses |
| Sheet exists as Form response destination | ☐ | Form → Responses → Select existing sheet or create new |
| Apps Script project | ☐ | Extensions → Apps Script (bound to the Sheet, or standalone) |
| GCP project with Pub/Sub API enabled | ☐ | `gcloud services enable pubsub.googleapis.com` |
| Pub/Sub topic `intake-ideas` | ☐ | `gcloud pubsub topics create intake-ideas` |
| Service account or OAuth for Pub/Sub publish | ☐ | Apps Script needs to call Pub/Sub REST API |

### 2.2 Apps Script Setup (Critical Details)

**Trigger type:** Installable `onFormSubmit` (not simple—simple triggers can't call external APIs with full auth).

```javascript
// In Apps Script: Create installable trigger via UI or programmatically
// Triggers → Add Trigger → Function: onFormSubmitToPubSub
// Event: From spreadsheet → On form submit
```

**Why installable?** Simple triggers cannot:
- Call `UrlFetchApp.fetch()` to external URLs with certain auth patterns
- Run longer than 30 seconds
- Access advanced services

**Pub/Sub publish from Apps Script:**

- Option A: **Service account** — Store JSON key in Script Properties (encrypted); use it to get OAuth token and call Pub/Sub.
- Option B: **OAuth for user** — Installable trigger runs as the user who created it. Use `ScriptApp.getOAuthToken()` — but that only works for Google APIs, not Pub/Sub directly. For Pub/Sub you need a **service account** or **Apps Script's built-in Google Cloud connection** (if using a linked GCP project).

**GCP + Apps Script linkage:**

- Apps Script can use **Google Cloud Platform projects** (Project Settings → Google Cloud Platform project). Link the script to the same GCP project that has Pub/Sub.
- Use **Advanced Google Services** — Enable Pub/Sub API in the script's GCP project. Then `Pubsub.Publish()` or use `UrlFetchApp` to `https://pubsub.googleapis.com/v1/projects/{project}/topics/intake-ideas:publish` with a service account token.

**Simpler alternative:** Use **Google Workflows** or a **Cloud Function** triggered by a **Webhook**. Form → Apps Script → `UrlFetchApp` to a Cloud Function HTTP endpoint that publishes to Pub/Sub. The Cloud Function can use its default service account for Pub/Sub. This avoids Apps Script needing direct Pub/Sub credentials.

### 2.3 Data Flow (Exact Sequence)

```
User submits Form
    → Form response appended to Sheet (automatic)
    → onFormSubmit trigger fires (event object contains: e.values, e.range, e.authMode)
    → Apps Script reads e.values (row of response data)
    → Build JSON payload: { projectId, ideaSummary, submittedBy, submittedAt }
    → Publish to Pub/Sub (via HTTP to Cloud Function, or direct Pub/Sub API)
    → Pub/Sub delivers to subscription
```

### 2.4 Gap: Form Response → Pub/Sub Payload Mapping

| Form Field | Sheet Column | Pub/Sub JSON Key | Required? |
|------------|--------------|------------------|------------|
| Idea summary | Col A (or B if timestamp first) | `ideaSummary` | Yes |
| Submitted by (email) | Col B | `submittedBy` | Yes |
| Timestamp (auto) | Col A | `submittedAt` | Yes |
| Project ID | — | `projectId` | **Generated** — Form doesn't have it yet |

**Gap:** The Form doesn't create `projectId`. Options:
- Generate in Apps Script: `Utilities.getUuid()` or `Session.getTemporaryActiveUserKey()` + timestamp.
- Add a hidden Form field that Apps Script populates (not possible at submit time).
- **Recommended:** Generate `projectId` in Apps Script as `"idea-" + Utilities.getUuid()`.

### 2.5 Gap: Idempotency (Double-Submit)

- User double-clicks "Submit" → two form responses → two Pub/Sub messages.
- **Mitigation:** Use `projectId` (UUID) as idempotency key. Step 2 (Cloud Function) checks Firestore/BigQuery for existing `projectId` before processing. First write wins; duplicate is no-op.

### 2.6 Gap: Apps Script Failure (Pub/Sub Unreachable)

- If `UrlFetchApp.fetch()` fails (network, quota, bad URL), the form response is already in the Sheet. The Pub/Sub message is never sent.
- **Mitigation:**
  - **Retry in script:** Try up to 3 times with exponential backoff.
  - **Fallback:** Cloud Scheduler + Cloud Function runs every 15 min, reads new rows from Sheet (via Sheets API), publishes any rows not yet in Pub/Sub. Use a "Processed" column to mark rows. This is the **safety net** — no idea is lost.

### 2.7 Gap: Trigger Authorization

- Installable trigger runs as the **user who created it**. If that user leaves the org or revokes access, the trigger fails silently.
- **Mitigation:** Use a **service account** or **Google Workspace admin** to create the trigger. Or document: "Trigger owner must be a long-lived service account or shared admin account."

### 2.8 Gap: Form Response Sheet Structure Change

- If someone adds/removes columns in the Form or reorders them, `e.values` indices change. Script breaks.
- **Mitigation:** Use **named ranges** or **header row lookup** to map columns by name, not index. Or lock the Form and Sheet structure in change control.

---

## 3. Step 2: INTAKE_VALIDATED — Full Implementation Checklist

### 3.1 Prerequisites

| Item | Status | Notes |
|------|--------|-------|
| Pub/Sub topic `intake-ideas` | ☐ | Same as Step 1 |
| Pub/Sub subscription | ☐ | Push to Cloud Function or Pull by Function |
| Cloud Function (Gen2) | ☐ | Triggered by Pub/Sub |
| Dead-letter topic `intake-ideas-dlq` | ☐ | For failed messages |
| Firestore / BigQuery for idempotency | ☐ | Check `projectId` before processing |

### 3.2 Cloud Function Trigger

- **Push subscription:** Pub/Sub pushes to Function HTTP endpoint. Function must return 200 quickly; ack in background.
- **Event-driven (recommended):** Pub/Sub triggers the Function directly. Function processes and returns. Non-200 → message retried.

### 3.3 Validation Logic

| Check | Action if Fail |
|-------|----------------|
| Valid JSON | Nack → DLQ after 5 retries |
| Required fields: `projectId`, `ideaSummary`, `submittedBy`, `submittedAt` | Nack → DLQ |
| `ideaSummary` length < 10,000 chars | Nack → DLQ |
| No PII in fields that get logged (redact email in logs) | Redact before logging |
| Idempotency: `projectId` already in Firestore | Ack and skip (no-op) |

### 3.4 Gap: Pub/Sub At-Least-Once Delivery

- Pub/Sub can deliver the same message more than once. The Function might run twice for the same idea.
- **Mitigation:** Idempotency. Before any side effect, check Firestore for `projects/{projectId}`. If exists and state ≥ INTAKE_VALIDATED, ack and return. Use a transaction to set state atomically.

### 3.5 Gap: Schema Drift

- Step 1 sends `{ projectId, ideaSummary, submittedBy, submittedAt }`. Later someone adds `priority` or changes `submittedBy` to `email`. Step 2 breaks.
- **Mitigation:** Define a **strict schema** (JSON Schema) in the Function. Reject unknown or malformed fields. Version the schema; document in the blueprint.

### 3.6 Gap: DLQ Handling

- Messages that fail validation go to DLQ. Who processes them?
- **Mitigation:** Cloud Scheduler → Cloud Function subscribes to DLQ, logs to BigQuery, posts to Google Chat. Ops triages. Document in runbook.

---

## 4. End-to-End Flow (Steps 1 & 2) — No Gaps

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ Google Form │────►│ Response     │────►│ Apps Script │────►│ Pub/Sub      │
│ (user)      │     │ Sheet        │     │ onFormSubmit │     │ intake-ideas │
└─────────────┘     └──────────────┘     └──────┬──────┘     └──────┬───────┘
       │                     │                   │                   │
       │                     │                   │  (fallback)       │
       │                     │                   │  Cloud Scheduler  │
       │                     │                   │  polls Sheet      │
       │                     │                   │  every 15 min     │
       │                     │                   │  for unprocessed  │
       │                     │                   │  rows             │
       │                     │                   │                   ▼
       │                     │                   │            ┌──────────────┐
       │                     │                   │            │ Cloud        │
       │                     │                   │            │ Function     │
       │                     │                   │            │ (validate)   │
       │                     │                   │            └──────┬───────┘
       │                     │                   │                   │
       │                     │                   │                   ├──► Valid: Publish to brief-requests
       │                     │                   │                   ├──► Invalid: Nack → DLQ
       │                     │                   │                   └──► Duplicate: Ack, skip
       │                     │                   │
       │                     │                   └──► Failure? Retry 3x; else mark row for fallback
       │                     │
       │                     └──► "Processed" column updated by Apps Script or fallback Function
       │
       └──► Confirmation: Form "Submit another response" or custom confirmation page
```

---

## 5. Checklist: Did We Think It All Through?

| Question | Answer |
|----------|--------|
| Does Step 1 require anyone to open a Sheet? | **No.** `onFormSubmit` is event-driven. |
| What if Apps Script fails to publish to Pub/Sub? | Retry 3x; fallback: Cloud Scheduler polls Sheet every 15 min. |
| What if the trigger owner leaves? | Document; use service account or shared admin. |
| What if Form/Sheet structure changes? | Use header-based column mapping; lock structure. |
| How do we prevent duplicate processing? | Idempotency key `projectId`; check Firestore before processing. |
| What if Pub/Sub delivers twice? | Idempotent Function; first write wins. |
| Where do failed messages go? | DLQ → Chat alert → ops triage. |
| Is PII redacted in logs? | Yes; redact `submittedBy` (email) in Cloud Logging. |
| Who creates `projectId`? | Apps Script at submit time (`Utilities.getUuid()`). |

---

## 6. Recommended Blueprint Updates

Add to the main blueprint:

1. **Step 1:** Explicitly state "`onFormSubmit` (installable trigger)—never `onOpen` or `onEdit` for intake."
2. **Step 1:** Add fallback: "Cloud Scheduler polls Sheet every 15 min for unprocessed rows."
3. **Step 2:** Add idempotency: "Check Firestore for existing `projectId` before processing."
4. **Anti-pattern:** Add to Design Considerations: "Never use `onOpen` or `onEdit` for critical pipeline triggers."

---

*Last updated: Feb 17, 2026*
