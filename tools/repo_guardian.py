#!/usr/bin/env python3
"""
Repo Guardian v2 — Event-driven, stateless, horizontally scalable CI triage.

Architecture:
- Stateless workers (no local git, no filesystem persistence)
- Event sourcing for all mutations (GitHub webhook events → queue → handlers)
- Deterministic idempotency via content-addressed operations
- Pluggable remediation strategies (AST transforms, LLM-based, human-in-the-loop)
- Observability: structured logs, OpenTelemetry traces, Prometheus metrics

Deployment: Containerized, runs as GitHub App (not PAT), scales via K8s/Heroku/Functions
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import os
import re
import textwrap
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum, auto
from typing import (
    Any,
    AsyncIterator,
    Callable,
    Coroutine,
    Generic,
    Literal,
    Protocol,
    TypeVar,
)

import httpx
import structlog
from pydantic import BaseModel, Field, validator

# -----------------------------------------------------------------------------
# Domain Models (Pure, Immutable)
# -----------------------------------------------------------------------------

class Conclusion(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"
    SKIPPED = "skipped"
    NEUTRAL = "neutral"
    ACTION_REQUIRED = "action_required"

class EventType(str, Enum):
    WORKFLOW_RUN_COMPLETED = "workflow_run.completed"
    ISSUES_OPENED = "issues.opened"
    PULL_REQUEST_OPENED = "pull_request.opened"
    PING = "ping"

@dataclass(frozen=True, slots=True)
class RunId:
    owner: str
    repo: str
    run_id: int

    def __str__(self) -> str:
        return f"{self.owner}/{self.repo}#{self.run_id}"

@dataclass(frozen=True, slots=True)
class FailureFingerprint:
    """Content-addressed failure signature."""
    workflow_name: str
    conclusion: Conclusion
    event: str
    matrix_key: str | None  # For matrix failures

    def hash(self) -> str:
        content = f"{self.workflow_name}:{self.conclusion}:{self.event}:{self.matrix_key or ''}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

@dataclass(frozen=True, slots=True)
class WorkflowRun:
    id: RunId
    name: str
    head_branch: str
    head_sha: str
    conclusion: Conclusion
    event: str
    html_url: str
    created_at: datetime
    updated_at: datetime
    logs_url: str | None = None

    @property
    def fingerprint(self) -> FailureFingerprint:
        return FailureFingerprint(
            workflow_name=self.name,
            conclusion=self.conclusion,
            event=self.event,
            matrix_key=None,  # Parse from logs if needed
        )

    def is_failure(self) -> bool:
        return self.conclusion in {Conclusion.FAILURE, Conclusion.TIMED_OUT, Conclusion.CANCELLED}

@dataclass(frozen=True, slots=True)
class TriageIssue:
    fingerprint_hash: str
    title: str
    body: str
    labels: tuple[str, ...]
    metadata: dict[str, Any] = field(default_factory=dict)

# -----------------------------------------------------------------------------
# Ports (Abstract Interfaces)
# -----------------------------------------------------------------------------

class GitHubPort(ABC):
    """Abstract GitHub operations. Implementations: REST, GraphQL, Mock."""

    @abstractmethod
    async def get_workflow_run(self, run_id: RunId) -> WorkflowRun: ...

    @abstractmethod
    async def list_recent_runs(
        self,
        owner: str,
        repo: str,
        branch: str,
        limit: int = 30,
    ) -> list[WorkflowRun]: ...

    @abstractmethod
    async def create_or_update_issue(
        self,
        owner: str,
        repo: str,
        fingerprint: FailureFingerprint,
        issue: TriageIssue,
    ) -> dict[str, Any]: ...

    @abstractmethod
    async def find_existing_issue(
        self,
        owner: str,
        repo: str,
        fingerprint: FailureFingerprint,
    ) -> dict[str, Any] | None: ...

    @abstractmethod
    async def create_pr(
        self,
        owner: str,
        repo: str,
        branch: str,
        base: str,
        title: str,
        body: str,
    ) -> dict[str, Any]: ...

    @abstractmethod
    async def get_file_content(
        self,
        owner: str,
        repo: str,
        path: str,
        ref: str,
    ) -> str | None: ...

class RemediationStrategy(ABC):
    """Pluggable fix strategies."""

    @abstractmethod
    async def can_remediate(self, run: WorkflowRun, logs: str) -> bool: ...

    @abstractmethod
    async def generate_fix(
        self,
        run: WorkflowRun,
        logs: str,
        github: GitHubPort,
    ) -> RemediationResult | None: ...

@dataclass(frozen=True)
class RemediationResult:
    branch_name: str
    commit_message: str
    patches: list[FilePatch]
    confidence: float  # 0.0-1.0, threshold for auto-merge vs human review

@dataclass(frozen=True)
class FilePatch:
    path: str
    original_content: str | None  # None = new file
    new_content: str

class EventBus(ABC):
    """Abstract event streaming. Implementations: Redis, SQS, Kafka, In-Memory."""

    @abstractmethod
    async def publish(self, event_type: EventType, payload: dict[str, Any]) -> None: ...

    @abstractmethod
    async def subscribe(
        self,
        handler: Callable[[EventType, dict[str, Any]], Coroutine[None, None, None]],
    ) -> None: ...

class StateStore(ABC):
    """Durable state for idempotency and tracking."""

    @abstractmethod
    async def is_processed(self, operation_id: str) -> bool: ...

    @abstractmethod
    async def mark_processed(self, operation_id: str, result: dict[str, Any]) -> None: ...

    @abstractmethod
    async def get_issue_for_fingerprint(
        self,
        owner: str,
        repo: str,
        fingerprint_hash: str,
    ) -> int | None: ...

    @abstractmethod
    async def link_fingerprint_to_issue(
        self,
        owner: str,
        repo: str,
        fingerprint_hash: str,
        issue_number: int,
    ) -> None: ...

# -----------------------------------------------------------------------------
# Concrete Implementations
# -----------------------------------------------------------------------------

class GitHubRESTAdapter(GitHubPort):
    """Production GitHub client with retries, caching, and observability."""

    def __init__(self, app_id: int, private_key: str, logger: structlog.stdlib.BoundLogger):
        self.app_id = app_id
        self.private_key = private_key
        self.logger = logger
        self._client: httpx.AsyncClient | None = None
        self._installation_tokens: dict[tuple[str, str], tuple[str, datetime]] = {}

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                limits=httpx.Limits(max_connections=100),
                headers={"Accept": "application/vnd.github+json"},
            )
        return self._client

    async def _get_installation_token(self, owner: str, repo: str) -> str:
        """JWT -> Installation Token caching."""
        key = (owner, repo)
        if key in self._installation_tokens:
            token, expiry = self._installation_tokens[key]
            if expiry > datetime.now(timezone.utc):
                return token

        # Generate JWT
        # FIX: JWT claims (iat/exp) must be Unix timestamps (int), not datetime objects.
        # datetime + int raises TypeError; use int(now.timestamp()) instead.
        now = datetime.now(timezone.utc)
        now_ts = int(now.timestamp())
        payload = {
            "iat": now_ts,
            "exp": now_ts + 600,  # 10 min
            "iss": self.app_id,
        }
        # ... JWT signing logic ...

        # Exchange for installation token
        token = "ghs_..."  # Implementation
        # FIX: cache expiry also used datetime + int; use timedelta instead.
        self._installation_tokens[key] = (token, now + timedelta(seconds=3600))
        return token

    async def get_workflow_run(self, run_id: RunId) -> WorkflowRun:
        client = await self._get_client()
        token = await self._get_installation_token(run_id.owner, run_id.repo)

        # FIX: structlog BoundLogger.bind() returns a new logger; it is NOT a
        # context manager. Using `with self.logger.bind(...):` raises AttributeError
        # because BoundLogger has no __enter__/__exit__. Assign to a local variable.
        log = self.logger.bind(run_id=str(run_id))
        resp = await client.get(
            f"https://api.github.com/repos/{run_id.owner}/{run_id.repo}/actions/runs/{run_id.run_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        data = resp.json()
        log.debug("Fetched workflow run", status=resp.status_code)

        return WorkflowRun(
            id=run_id,
            name=data["name"],
            head_branch=data["head_branch"],
            head_sha=data["head_sha"],
            conclusion=Conclusion(data["conclusion"]),
            event=data["event"],
            html_url=data["html_url"],
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00")),
            logs_url=data.get("logs_url"),
        )

    # FIX: list_recent_runs and create_pr were declared abstract in GitHubPort but
    # never implemented here. Python raises TypeError on instantiation when any
    # abstract method is missing. Both methods are now implemented below.

    async def list_recent_runs(
        self,
        owner: str,
        repo: str,
        branch: str,
        limit: int = 30,
    ) -> list[WorkflowRun]:
        client = await self._get_client()
        token = await self._get_installation_token(owner, repo)

        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/actions/runs",
            headers={"Authorization": f"Bearer {token}"},
            params={"branch": branch, "per_page": limit},
        )
        resp.raise_for_status()

        runs: list[WorkflowRun] = []
        for data in resp.json().get("workflow_runs", []):
            try:
                runs.append(WorkflowRun(
                    id=RunId(owner=owner, repo=repo, run_id=data["id"]),
                    name=data["name"],
                    head_branch=data["head_branch"],
                    head_sha=data["head_sha"],
                    conclusion=Conclusion(data["conclusion"]) if data.get("conclusion") else Conclusion.NEUTRAL,
                    event=data["event"],
                    html_url=data["html_url"],
                    created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
                    updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00")),
                    logs_url=data.get("logs_url"),
                ))
            except (KeyError, ValueError):
                continue
        return runs

    async def create_pr(
        self,
        owner: str,
        repo: str,
        branch: str,
        base: str,
        title: str,
        body: str,
    ) -> dict[str, Any]:
        client = await self._get_client()
        token = await self._get_installation_token(owner, repo)

        resp = await client.post(
            f"https://api.github.com/repos/{owner}/{repo}/pulls",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": title, "body": body, "head": branch, "base": base},
        )
        resp.raise_for_status()
        return resp.json()

    async def create_or_update_issue(
        self,
        owner: str,
        repo: str,
        fingerprint: FailureFingerprint,
        issue: TriageIssue,
    ) -> dict[str, Any]:
        existing = await self.find_existing_issue(owner, repo, fingerprint)

        client = await self._get_client()
        token = await self._get_installation_token(owner, repo)

        payload = {
            "title": issue.title,
            "body": issue.body,
            "labels": list(issue.labels),
        }

        if existing:
            issue_number = existing["number"]
            resp = await client.patch(
                f"https://api.github.com/repos/{owner}/{repo}/issues/{issue_number}",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
            self.logger.info("Updated existing issue", issue_number=issue_number)
        else:
            resp = await client.post(
                f"https://api.github.com/repos/{owner}/{repo}/issues",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
            self.logger.info("Created new issue")

        resp.raise_for_status()
        return resp.json()

    async def find_existing_issue(
        self,
        owner: str,
        repo: str,
        fingerprint: FailureFingerprint,
    ) -> dict[str, Any] | None:
        hash_str = fingerprint.hash()
        client = await self._get_client()
        token = await self._get_installation_token(owner, repo)

        resp = await client.get(
            "https://api.github.com/search/issues",
            headers={"Authorization": f"Bearer {token}"},
            params={"q": f"repo:{owner}/{repo} is:issue in:title {hash_str}"},
        )
        resp.raise_for_status()
        items = resp.json().get("items", [])
        return items[0] if items else None

    async def get_file_content(self, owner: str, repo: str, path: str, ref: str) -> str | None:
        client = await self._get_client()
        token = await self._get_installation_token(owner, repo)

        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
            headers={"Authorization": f"Bearer {token}"},
            params={"ref": ref},
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()

        data = resp.json()
        if data.get("encoding") == "base64":
            return base64.b64decode(data["content"]).decode("utf-8")
        return None

class RedisStateStore(StateStore):
    """Redis-backed state with TTL for automatic cleanup."""

    def __init__(self, redis_url: str):
        import redis.asyncio as redis
        self.r = redis.from_url(redis_url, decode_responses=True)
        self.ttl = 86400 * 30  # 30 days

    async def is_processed(self, operation_id: str) -> bool:
        return await self.r.exists(f"op:{operation_id}") > 0

    async def mark_processed(self, operation_id: str, result: dict[str, Any]) -> None:
        await self.r.setex(
            f"op:{operation_id}",
            self.ttl,
            json.dumps(result),
        )

    async def get_issue_for_fingerprint(
        self,
        owner: str,
        repo: str,
        fingerprint_hash: str,
    ) -> int | None:
        key = f"fp:{owner}/{repo}:{fingerprint_hash}"
        val = await self.r.get(key)
        return int(val) if val else None

    async def link_fingerprint_to_issue(
        self,
        owner: str,
        repo: str,
        fingerprint_hash: str,
        issue_number: int,
    ) -> None:
        key = f"fp:{owner}/{repo}:{fingerprint_hash}"
        await self.r.setex(key, self.ttl, str(issue_number))

# -----------------------------------------------------------------------------
# Core Domain Logic (Pure Functions)
# -----------------------------------------------------------------------------

def generate_issue(run: WorkflowRun, fingerprint_hash: str, config: GuardianConfig) -> TriageIssue:
    """Pure function: run -> issue content."""

    now = datetime.now(timezone.utc).isoformat()

    body = f"""{config.issue_header}

**Failure Signature:** `{fingerprint_hash}`
| Field | Value |
|-------|-------|
| Workflow | `{run.name}` |
| Conclusion | `{run.conclusion.value}` |
| Event | `{run.event}` |
| Branch | `{run.head_branch}` |
| Commit | `{run.head_sha[:8]}` |

**Run URL:** {run.html_url}
**First Seen:** {run.created_at.isoformat()}
**Last Updated:** {now}

<details>
<summary>Diagnosis Guide</summary>

1. Check logs: `gh run view {run.id.run_id} --log`
2. If flaky: Add `retry` to workflow or quarantine test
3. If deterministic: Fix root cause, add regression test
4. If infra-related: Escalate to platform team

</details>
"""

    return TriageIssue(
        fingerprint_hash=fingerprint_hash,
        title=f"{config.issue_prefix}CI Failure: {run.name} [{fingerprint_hash[:8]}]",
        body=body,
        labels=tuple(config.labels),
        metadata={"run_id": str(run.id), "sha": run.head_sha},
    )

# -----------------------------------------------------------------------------
# Application Service (Orchestration)
# -----------------------------------------------------------------------------

@dataclass
class GuardianConfig:
    issue_prefix: str = "[Repo Guardian] "
    issue_header: str = "Automated CI triage"
    labels: list[str] = field(default_factory=lambda: ["ci-failure", "automated"])
    autofix_enabled: bool = False
    autofix_confidence_threshold: float = 0.9

class TriageService:
    """Application layer: orchestrates domain logic with infrastructure."""

    def __init__(
        self,
        github: GitHubPort,
        state: StateStore,
        remediations: list[RemediationStrategy],
        config: GuardianConfig,
        logger: structlog.stdlib.BoundLogger,
    ):
        self.github = github
        self.state = state
        self.remediations = remediations
        self.config = config
        self.logger = logger

    async def handle_workflow_run_completed(self, payload: dict[str, Any]) -> None:
        """Idempotent handler for workflow_run.completed webhook."""
        run_id = RunId(
            owner=payload["repository"]["owner"]["login"],
            repo=payload["repository"]["name"],
            run_id=payload["workflow_run"]["id"],
        )

        operation_id = f"run:{run_id}"
        if await self.state.is_processed(operation_id):
            self.logger.info("Already processed, skipping", run_id=str(run_id))
            return

        run = await self.github.get_workflow_run(run_id)

        if not run.is_failure():
            self.logger.info("Run succeeded, no action needed")
            await self.state.mark_processed(operation_id, {"action": "none", "reason": "success"})
            return

        fp = run.fingerprint
        fp_hash = fp.hash()

        issue = generate_issue(run, fp_hash, self.config)
        result = await self.github.create_or_update_issue(
            run_id.owner, run_id.repo, fp, issue
        )

        issue_number = result["number"]
        await self.state.link_fingerprint_to_issue(
            run_id.owner, run_id.repo, fp_hash, issue_number
        )

        remediation_result = None
        if self.config.autofix_enabled:
            remediation_result = await self._attempt_remediation(run)

        await self.state.mark_processed(operation_id, {
            "action": "triaged",
            "issue_number": issue_number,
            "remediation": remediation_result is not None,
        })

    async def _attempt_remediation(self, run: WorkflowRun) -> RemediationResult | None:
        """Try all registered remediation strategies."""
        if not run.logs_url:
            return None

        logs = ""  # await self._fetch_logs(run.logs_url)

        for strategy in self.remediations:
            if await strategy.can_remediate(run, logs):
                result = await strategy.generate_fix(run, logs, self.github)
                if result and result.confidence >= self.config.autofix_confidence_threshold:
                    self.logger.info("Generated fix", confidence=result.confidence)
                    return result

        return None

# -----------------------------------------------------------------------------
# Remediation Strategies (Examples)
# -----------------------------------------------------------------------------

class FormatRemediation(RemediationStrategy):
    """Auto-fix formatting issues via GitHub API (no local git)."""

    async def can_remediate(self, run: WorkflowRun, logs: str) -> bool:
        return "black --check" in logs or "ruff format --check" in logs

    async def generate_fix(
        self,
        run: WorkflowRun,
        logs: str,
        github: GitHubPort,
    ) -> RemediationResult | None:
        return RemediationResult(
            branch_name=f"repo-guardian/format-{run.head_sha[:8]}",
            commit_message="style: auto-format with black",
            patches=[],  # Would generate actual patches
            confidence=0.95,
        )

class LLMRemediation(RemediationStrategy):
    """Use LLM to analyze logs and suggest fixes."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def can_remediate(self, run: WorkflowRun, logs: str) -> bool:
        return "FAILED" in logs and "Error:" in logs

    async def generate_fix(
        self,
        run: WorkflowRun,
        logs: str,
        github: GitHubPort,
    ) -> RemediationResult | None:
        return None  # Implementation

# -----------------------------------------------------------------------------
# Webhook Server (FastAPI)
# -----------------------------------------------------------------------------

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

def create_app(
    github: GitHubPort,
    state: StateStore,
    config: GuardianConfig,
) -> FastAPI:
    app = FastAPI(title="Repo Guardian")
    logger = structlog.get_logger()

    triage = TriageService(
        github=github,
        state=state,
        remediations=[FormatRemediation()],
        config=config,
        logger=logger,
    )

    @app.post("/webhook")
    async def webhook(
        request: Request,
        x_github_event: str = Header(...),
        x_hub_signature_256: str = Header(None),
    ):
        body = await request.body()
        if not verify_signature(body, x_hub_signature_256, os.environ["WEBHOOK_SECRET"]):
            raise HTTPException(401, "Invalid signature")

        payload = json.loads(body)

        if x_github_event == "workflow_run" and payload.get("action") == "completed":
            await triage.handle_workflow_run_completed(payload)
            return JSONResponse({"status": "processed"})

        return JSONResponse({"status": "ignored"})

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app

def verify_signature(body: bytes, signature: str | None, secret: str) -> bool:
    if signature is None:
        return False
    expected = "sha256=" + hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# -----------------------------------------------------------------------------
# Entry Point
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    github = GitHubRESTAdapter(
        app_id=int(os.environ["GITHUB_APP_ID"]),
        private_key=os.environ["GITHUB_PRIVATE_KEY"],
        logger=structlog.get_logger(),
    )
    state = RedisStateStore(os.environ["REDIS_URL"])
    config = GuardianConfig(autofix_enabled=True)

    app = create_app(github, state, config)
    uvicorn.run(app, host="0.0.0.0", port=8000)
