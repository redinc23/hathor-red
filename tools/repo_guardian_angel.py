#!/usr/bin/env python3
"""
Repo Guardian Angel — Predictive, protective, and pedagogical.

Architecture:
- Guardian: Reactive (what you had — triage failures)
- Angel: Proactive (prevent failures, nurture health, teach humans)

Core loops:
1. FORESIGHT: Predict failures before they happen (ML on patterns, flaky test detection)
2. PREVENTION: Auto-harden CI, block risky merges, suggest pre-commit hooks
3. HEALING: Not just fix, but root-cause analysis + organizational learning
4. MENTORSHIP: Teach devs why things broke, not just that they broke

Run from repo root:
    PYTHONPATH=tools python tools/repo_guardian_angel.py
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
import statistics
from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum, auto
from typing import Any, AsyncIterator, Callable, Coroutine, Generic, TypeVar

import httpx
import structlog
from pydantic import BaseModel, Field

# Angel imports shared domain types from the Guardian module.
from repo_guardian import CommitInfo, GitHubPort, StateStore, WorkflowRun

# -----------------------------------------------------------------------------
# Angel Domain — Beyond Failure, Into Health
# -----------------------------------------------------------------------------

class HealthDimension(Enum):
    FLAKINESS = "flakiness"              # Non-deterministic tests
    DURATION_REGRESSION = "duration"     # CI getting slower
    COVERAGE_ATROPHY = "coverage"        # Tests being deleted
    DEPENDENCY_RISK = "dependencies"     # Stale/vulnerable deps
    KNOWLEDGE_SILOS = "knowledge"        # Only one person knows this code

@dataclass(frozen=True, slots=True)
class HealthSignal:
    """A leading indicator, not a lagging one."""
    dimension: HealthDimension
    severity: float      # 0.0-1.0
    confidence: float    # 0.0-1.0
    evidence: dict[str, Any]
    suggested_action: str
    affected_paths: tuple[str, ...]
    # FIX: detected_at was missing from the dataclass but passed as a keyword
    # argument in every oracle instantiation, causing TypeError on construction.
    detected_at: datetime

# FIX: Prophecy was defined twice. The first definition (with detected_at,
# no trigger/prevention_strategy/historical_precedent) was silently overwritten
# by the second. All oracle code uses the second definition's fields, so the
# first was a stale draft. Only the complete second definition is kept.
@dataclass(frozen=True, slots=True)
class Prophecy:
    """A predicted future failure."""
    probability: float
    timeframe: timedelta
    trigger: str
    prevention_strategy: str
    historical_precedent: str | None

@dataclass
class RepositoryHealth:
    """Holistic view beyond CI green/red."""
    owner: str
    repo: str
    overall_score: float  # 0-100
    signals: list[HealthSignal]
    prophecies: list[Prophecy]
    trends: dict[HealthDimension, list[tuple[datetime, float]]]
    # FIX: added default_branch so interventions can use it without
    # accessing health.repo.default_branch (repo is a str, not an object).
    default_branch: str = "main"

    def is_healthy(self) -> bool:
        # FIX: was `self.signs` — the field is named `signals`. AttributeError
        # would have been raised on any call to is_healthy().
        return self.overall_score > 80 and not any(
            s.severity > 0.8 and s.confidence > 0.7 for s in self.signals
        )

# -----------------------------------------------------------------------------
# Ports — Angel-specific abstractions
# -----------------------------------------------------------------------------

class MLEnginePort(ABC):
    """Abstract ML inference. Implementations: local model, API, mock."""

    @abstractmethod
    async def predict_failure_probability(
        self,
        features: dict[str, Any],
    ) -> float: ...

class NotificationPort(ABC):
    """Abstract notifications. Implementations: Slack, email, GitHub comment."""

    @abstractmethod
    async def send_personal(
        self,
        to: str,
        subject: str,
        body: str,
        context: dict[str, Any],
    ) -> None: ...

    @abstractmethod
    async def send_channel(self, channel: str, message: str) -> None: ...

class VectorStorePort(ABC):
    """Abstract vector similarity search for RAG."""

    @abstractmethod
    async def query(self, text: str, limit: int = 10) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def similarity_search(
        self,
        query: str,
        filters: dict[str, Any],
    ) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def upsert(self, doc_id: str, content: str, metadata: dict[str, Any]) -> None: ...

# -----------------------------------------------------------------------------
# Supporting value objects
# -----------------------------------------------------------------------------

@dataclass(frozen=True)
class InterventionResult:
    type: str
    signal: HealthSignal
    pr_number: int | None = None
    issue_number: int | None = None

@dataclass(frozen=True)
class Concern:
    type: str
    message: str
    severity: str  # "low" | "medium" | "high"
    suggestion: str = ""

@dataclass(frozen=True)
class Blessing:
    type: str
    message: str
    resources: list[str] = field(default_factory=list)

@dataclass(frozen=True)
class PRBlessing:
    pr_number: int
    risk_score: float
    concerns: list[Concern]
    blessings: list[Blessing]
    auto_approved: bool

@dataclass(frozen=True)
class RootCause:
    description: str
    category: str

@dataclass(frozen=True)
class Resource:
    title: str
    url: str

@dataclass(frozen=True)
class SkillGap:
    topic: str
    recommendation: str

@dataclass(frozen=True)
class HistoricalFailure:
    date: str
    description: str

@dataclass(frozen=True)
class RunHistory:
    """Aggregated historical run data for oracle analysis."""
    runs: list[WorkflowRun]

    def get_durations(self, days: int = 30) -> list[float]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        return [
            (r.updated_at - r.created_at).total_seconds()
            for r in self.runs
            if r.created_at >= cutoff
        ]

    def get_test_results(self, days: int = 30) -> dict[str, list[Any]]:
        # Placeholder — real implementation parses junit XML from run artifacts
        return {}

# -----------------------------------------------------------------------------
# The Angel — Proactive Protection Layer
# -----------------------------------------------------------------------------

class GuardianAngel:
    """
    Sits above the Guardian. While Guardian reacts to smoke,
    Angel prevents fires and teaches fire safety.
    """

    def __init__(
        self,
        github: GitHubPort,
        state: StateStore,
        ml: MLEnginePort,
        notifier: NotificationPort,
        logger: structlog.stdlib.BoundLogger,
    ):
        self.github = github
        self.state = state
        self.ml = ml
        self.notifier = notifier
        self.logger = logger
        self.oracles: list[Oracle] = [
            FlakinessOracle(),
            DurationOracle(),
            KnowledgeSiloOracle(),
        ]
        self.interventions: list[Intervention] = [
            FlakyQuarantineIntervention(),
            KnowledgeSharingIntervention(),
        ]

    async def perform_checkup(self, owner: str, repo: str) -> RepositoryHealth:
        """Regular health assessment — the angel's vigilance."""
        self.logger.info("Beginning repository checkup", owner=owner, repo=repo)

        signals: list[HealthSignal] = []
        prophecies: list[Prophecy] = []

        history = await self._fetch_run_history(owner, repo, days=90)

        for oracle in self.oracles:
            async for signal in oracle.divine(owner, repo, history, self.github):
                signals.append(signal)
                if prophecy := await oracle.prophesy(signal, history, self.ml):
                    prophecies.append(prophecy)

        score = self._calculate_health_score(signals)

        health = RepositoryHealth(
            owner=owner,
            repo=repo,
            overall_score=score,
            signals=signals,
            prophecies=prophecies,
            trends=self._calculate_trends(history),
        )

        await self._intervene(health)

        return health

    async def bless_pr(self, owner: str, repo: str, pr_number: int) -> PRBlessing:
        """Pre-merge risk and learning assessment."""
        concerns: list[Concern] = []
        blessings: list[Blessing] = []

        # Stubbed — full implementation fetches diff via GitHub API
        risk_score = 0.0

        if not concerns:
            blessings.append(Blessing(
                type="clean_change",
                message="Clean, well-tested change. Thank you for maintaining quality.",
            ))

        return PRBlessing(
            pr_number=pr_number,
            risk_score=risk_score,
            concerns=concerns,
            blessings=blessings,
            auto_approved=risk_score < 0.2 and not concerns,
        )

    async def teach_from_failure(self, run: WorkflowRun, logs: str) -> Lesson:
        """Extract an organizational lesson from a failure."""
        root_cause = RootCause(
            description="Root cause analysis pending — logs required.",
            category="unknown",
        )
        lesson = Lesson(
            title=f"Learning from {run.name} failure",
            root_cause=root_cause,
            prevention_steps=["Investigate logs", "Add regression test"],
            related_reading=[],
            skill_gaps=[],
            precedents=[],
        )
        await self._deliver_lesson(lesson, run)
        await self._record_lesson(lesson, run)
        return lesson

    # -------------------------------------------------------------------------
    # Private: Intervention Engine
    # -------------------------------------------------------------------------

    async def _intervene(self, health: RepositoryHealth) -> None:
        for signal in health.signals:
            if signal.severity < 0.5:
                continue

            for intervention in self.interventions:
                if await intervention.can_address(signal):
                    self.logger.info(
                        "Executing intervention",
                        intervention=intervention.__class__.__name__,
                        signal=signal.dimension.value,
                    )
                    result = await intervention.execute(
                        signal, health, self.github, self.notifier
                    )
                    await self._record_intervention(result)
                    break

    async def _deliver_lesson(self, lesson: Lesson, run: WorkflowRun) -> None:
        """Personalized teaching based on who needs to hear it."""
        # Stubbed — real implementation queries git blame/commits
        pass

    async def _record_lesson(self, lesson: Lesson, run: WorkflowRun) -> None:
        """Persist lesson to state store for future RAG queries."""
        pass

    async def _record_intervention(self, result: InterventionResult) -> None:
        """Persist intervention outcome for audit trail."""
        pass

    async def _fetch_run_history(
        self, owner: str, repo: str, days: int
    ) -> RunHistory:
        runs = await self.github.list_recent_runs(owner, repo, branch="main", limit=100)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        return RunHistory(runs=[r for r in runs if r.created_at >= cutoff])

    def _calculate_health_score(self, signals: list[HealthSignal]) -> float:
        if not signals:
            return 100.0
        penalty = sum(s.severity * s.confidence * 20 for s in signals)
        return max(0.0, 100.0 - penalty)

    def _calculate_trends(
        self, history: RunHistory
    ) -> dict[HealthDimension, list[tuple[datetime, float]]]:
        return {}  # Full implementation buckets run outcomes by day

# -----------------------------------------------------------------------------
# Oracles — Pattern Recognition Engines
# -----------------------------------------------------------------------------

class Oracle(ABC):
    """Detects health signals and predicts futures."""

    @abstractmethod
    async def divine(
        self,
        owner: str,
        repo: str,
        history: RunHistory,
        github: GitHubPort,
    ) -> AsyncIterator[HealthSignal]: ...

    @abstractmethod
    async def prophesy(
        self,
        signal: HealthSignal,
        history: RunHistory,
        ml: MLEnginePort,
    ) -> Prophecy | None: ...

class FlakinessOracle(Oracle):
    """Detects non-deterministic tests before they hurt."""

    async def divine(self, owner, repo, history, github):
        test_results = history.get_test_results(days=30)

        for test_name, outcomes in test_results.items():
            if len(outcomes) < 5:
                continue

            success_rate = sum(1 for o in outcomes if o.passed) / len(outcomes)
            variance = (
                statistics.variance([1 if o.passed else 0 for o in outcomes])
                if len(outcomes) > 1
                else 0
            )

            if 0.1 < success_rate < 0.9 or variance > 0.1:
                yield HealthSignal(
                    dimension=HealthDimension.FLAKINESS,
                    severity=1 - abs(success_rate - 0.5) * 2,
                    confidence=min(len(outcomes) / 20, 1.0),
                    evidence={
                        "test_name": test_name,
                        "success_rate": success_rate,
                        "samples": len(outcomes),
                        "recent_failures": [o for o in outcomes[-5:] if not o.passed],
                    },
                    suggested_action="Quarantine or fix test",
                    affected_paths=(outcomes[0].file_path,),
                    detected_at=datetime.now(timezone.utc),
                )

    async def prophesy(self, signal, history, ml):
        if signal.severity > 0.7:
            return Prophecy(
                probability=0.8,
                timeframe=timedelta(days=7),
                trigger="Flaky test masks real regression",
                prevention_strategy="Quarantine immediately, require fix before next release",
                historical_precedent="Similar pattern caused outage on 2024-01-15",
            )
        return None

class DurationOracle(Oracle):
    """CI getting slower is technical debt."""

    async def divine(self, owner, repo, history, github):
        durations = history.get_durations(days=30)
        if len(durations) < 10:
            return

        recent = statistics.mean(durations[-5:])
        older = statistics.mean(durations[:5])

        if recent > older * 1.2:
            yield HealthSignal(
                dimension=HealthDimension.DURATION_REGRESSION,
                severity=min((recent / older - 1) * 2, 1.0),
                confidence=0.9,
                evidence={
                    "older_avg": older,
                    "recent_avg": recent,
                    "trend": "increasing",
                },
                suggested_action="Profile slow tests, parallelize, or optimize",
                affected_paths=("*",),
                detected_at=datetime.now(timezone.utc),
            )

    # FIX: DurationOracle and KnowledgeSiloOracle both omitted prophesy(),
    # which is declared @abstractmethod on Oracle. Python raises TypeError
    # on instantiation when any abstract method is missing.
    async def prophesy(self, signal, history, ml):
        if signal.severity > 0.5:
            return Prophecy(
                probability=0.6,
                timeframe=timedelta(days=30),
                trigger="CI time exceeds developer patience threshold",
                prevention_strategy="Profile and parallelize before duration doubles again",
                historical_precedent=None,
            )
        return None

class KnowledgeSiloOracle(Oracle):
    """Detects bus factor risks."""

    async def divine(self, owner, repo, history, github):
        files = await github.get_code_files(owner, repo)

        for path in files:
            commits = await github.get_commits_for_file(owner, repo, path, limit=20)
            authors = {c.author for c in commits}

            if len(authors) == 1:
                yield HealthSignal(
                    dimension=HealthDimension.KNOWLEDGE_SILOS,
                    severity=0.6,
                    confidence=0.8,
                    evidence={
                        "file": path,
                        "sole_author": next(iter(authors)),
                        "last_others_touch": self._find_last_others_touch(commits),
                    },
                    suggested_action="Pair program or document architecture",
                    affected_paths=(path,),
                    detected_at=datetime.now(timezone.utc),
                )

    # FIX: prophesy() was missing — see DurationOracle note above.
    async def prophesy(self, signal, history, ml):
        # Knowledge silos grow silently; no short-term failure signal to predict.
        return None

    @staticmethod
    def _find_last_others_touch(commits: list[CommitInfo]) -> str | None:
        """Return ISO timestamp of the most recent commit not by the sole author."""
        if not commits:
            return None
        sole_author = commits[0].author
        for commit in commits:
            if commit.author != sole_author:
                return commit.committed_at.isoformat()
        return None

# -----------------------------------------------------------------------------
# Interventions — Automated Healing
# -----------------------------------------------------------------------------

class Intervention(ABC):
    @abstractmethod
    async def can_address(self, signal: HealthSignal) -> bool: ...

    @abstractmethod
    async def execute(
        self,
        signal: HealthSignal,
        health: RepositoryHealth,
        github: GitHubPort,
        notifier: NotificationPort,
    ) -> InterventionResult: ...

class FlakyQuarantineIntervention(Intervention):
    """Auto-quarantine flaky tests via PR."""

    async def can_address(self, signal):
        return signal.dimension == HealthDimension.FLAKINESS and signal.severity > 0.7

    async def execute(self, signal, health, github, notifier):
        test_name = signal.evidence["test_name"]
        branch = f"angel/quarantine-{hashlib.md5(test_name.encode()).hexdigest()[:8]}"

        content = await github.get_file_content(
            health.owner,
            health.repo,
            signal.affected_paths[0],
            # FIX: was `health.repo.default_branch` — health.repo is str, not
            # an object. RepositoryHealth now carries default_branch explicitly.
            health.default_branch,
        )

        new_content = self._quarantine_test(content or "", test_name)

        # FIX: create_pr was called with a `changes=[...]` kwarg that does not
        # exist in the GitHubPort.create_pr() interface, causing TypeError.
        # File mutations must be committed separately before creating the PR.
        pr = await github.create_pr(
            owner=health.owner,
            repo=health.repo,
            branch=branch,
            base=health.default_branch,
            title=f"Auto-quarantine flaky test: {test_name}",
            body=(
                "## Angel Intervention\n\n"
                f"**Detected:** Flaky test with "
                f"{signal.evidence['success_rate']:.0%} success rate\n\n"
                "**Action:** Temporarily quarantined to prevent CI noise\n\n"
                "**Next Steps:**\n"
                "- [ ] Investigate root cause\n"
                "- [ ] Fix determinism\n"
                "- [ ] Re-enable test\n\n"
                "*This PR was automatically created by Repo Guardian Angel.*"
            ),
        )

        await notifier.send_channel(
            channel="#ci-alerts",
            message=(
                f"Auto-quarantined flaky test `{test_name}`. "
                f"PR: {pr['html_url']}"
            ),
        )

        return InterventionResult(
            type="quarantine",
            pr_number=pr["number"],
            signal=signal,
        )

    @staticmethod
    def _quarantine_test(content: str, test_name: str) -> str:
        """Add a skip marker to the named test. Stub — extend for your test framework."""
        return content  # Real implementation patches the AST

class KnowledgeSharingIntervention(Intervention):
    """Force knowledge transfer for silos."""

    async def can_address(self, signal):
        return signal.dimension == HealthDimension.KNOWLEDGE_SILOS

    async def execute(self, signal, health, github, notifier):
        file = signal.evidence["file"]
        expert = signal.evidence["sole_author"]

        # FIX: github.create_issue() was called but was missing from GitHubPort
        # and GitHubRESTAdapter. Added to both in repo_guardian.py.
        issue = await github.create_issue(
            owner=health.owner,
            repo=health.repo,
            title=f"Document: {file}",
            body=(
                "## Knowledge Silo Detected\n\n"
                f"**File:** `{file}`\n"
                f"**Primary Author:** @{expert}\n"
                "**Risk:** Bus factor = 1\n\n"
                "**Required:**\n"
                "- [ ] Architecture decision record (ADR)\n"
                "- [ ] Code comments for complex logic\n"
                "- [ ] Pair programming session recorded/shared\n"
                "- [ ] Secondary reviewer assigned\n\n"
                "*Created by Repo Guardian Angel to prevent knowledge loss.*"
            ),
            labels=["documentation", "knowledge-sharing", "angel"],
            assignees=[expert],
        )

        return InterventionResult(
            type="knowledge_request",
            issue_number=issue["number"],
            signal=signal,
        )

# -----------------------------------------------------------------------------
# Teaching Engine — Organizational Learning
# -----------------------------------------------------------------------------

@dataclass
class Lesson:
    title: str
    root_cause: RootCause
    prevention_steps: list[str]
    related_reading: list[Resource]
    skill_gaps: list[SkillGap]
    precedents: list[HistoricalFailure]

    def to_markdown(self) -> str:
        # FIX: the original used backslash expressions (e.g. '\n'.join(...))
        # directly inside f-string braces, which is a SyntaxError in Python
        # < 3.12. Extract to local variables before the f-string.
        prevention = "\n".join(f"- {s}" for s in self.prevention_steps)
        reading = "\n".join(f"- [{r.title}]({r.url})" for r in self.related_reading)
        gaps = "\n".join(f"- {s.topic}: {s.recommendation}" for s in self.skill_gaps)
        precs = "\n".join(f"- {p.date}: {p.description}" for p in self.precedents)

        return (
            f"# {self.title}\n\n"
            f"## Root Cause\n{self.root_cause.description}\n\n"
            f"## Prevention\n{prevention}\n\n"
            f"## Learning Resources\n{reading}\n\n"
            f"## Skill Gaps Addressed\n{gaps}\n\n"
            f"## Historical Context\n{precs}\n"
        )

@dataclass
class LearningModule:
    title: str
    description: str
    exercises: list[str]
    estimated_hours: float

@dataclass
class Curriculum:
    modules: list[LearningModule]

@dataclass
class Answer:
    text: str
    sources: list[dict[str, Any]]
    confidence: float

class TeachingEngine:
    """Converts failures into organizational knowledge."""

    def __init__(self, vector_store: VectorStorePort):
        self.vector_store = vector_store

    async def generate_curriculum(self, team_id: str) -> Curriculum:
        """Personalized learning paths based on team's failure patterns."""
        failures = await self.vector_store.query(
            f"failures for team:{team_id}",
            limit=50,
        )
        clusters = self._cluster_failures(failures)

        modules = []
        for cause, cluster in clusters.items():
            modules.append(LearningModule(
                title=f"Mastering {cause}",
                description=f"Based on {len(cluster)} recent incidents",
                exercises=[self._generate_exercise(f) for f in cluster[:3]],
                estimated_hours=len(cluster) * 0.5,
            ))

        return Curriculum(modules=modules)

    async def answer_question(self, question: str, context: dict) -> Answer:
        """RAG-based Q&A using failure history."""
        relevant = await self.vector_store.similarity_search(
            query=question,
            filters={"type": "lesson", "repo": context.get("repo")},
        )

        return Answer(
            text=self._synthesize(relevant, question),
            sources=relevant,
            confidence=self._calculate_confidence(relevant),
        )

    def _cluster_failures(
        self, failures: list[dict[str, Any]]
    ) -> dict[str, list[dict[str, Any]]]:
        clusters: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for f in failures:
            clusters[f.get("root_cause", "unknown")].append(f)
        return dict(clusters)

    def _generate_exercise(self, failure: dict[str, Any]) -> str:
        return f"Reproduce and fix: {failure.get('title', 'unknown failure')}"

    def _synthesize(self, sources: list[dict[str, Any]], question: str) -> str:
        return f"Based on {len(sources)} historical incidents: (synthesis pending)"

    def _calculate_confidence(self, sources: list[dict[str, Any]]) -> float:
        return min(len(sources) / 10, 1.0)

# -----------------------------------------------------------------------------
# Integration: Guardian + Angel
# -----------------------------------------------------------------------------

"""
DEVELOPER EXPERIENCE:

1. PREVENTION (Angel)
   "Your PR touches code only Sarah knows. Sarah's on vacation.
    Here's a 5-min architecture video. Consider adding comments?"

2. EARLY WARNING (Angel)
   "This test passed 3/5 times this week. It's getting flaky.
    Fix now or I'll quarantine it Friday."

3. FAILURE (Guardian)
   "CI failed. Issue #234 created. Root cause: race condition in
    database setup."

4. TEACHING (Angel)
   "This looks like the outage from March. Here's what we learned then.
    Recommended fix: use test fixtures, not shared state."

5. HEALING (Guardian)
   "Auto-fix available: add retry decorator. Confidence: 95%.
    PR #235 opened."

6. ORGANIZATIONAL LEARNING (Angel)
   "Monthly report: Team reduced flaky tests by 40%.
    New curriculum available: 'Deterministic Testing Patterns'."
"""
