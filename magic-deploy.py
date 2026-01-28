#!/usr/bin/env python3
"""
magic-deploy: Deployment orchestrator (portable v2)

- Implements all helper methods.
- Supports --check, --dry-run, retries.
- Deploy command is configurable via --deploy-cmd; otherwise best-effort detection.

Usage:
  python3 magic-deploy.py --project . --check --env production
  python3 magic-deploy.py --project . --env production --deploy-cmd "npm run deploy"
"""

from __future__ import annotations

import argparse
import logging
import shlex
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Optional, Sequence, Tuple


LOGD = logging.getLogger("magic-deploy")


def _configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")


def _which(cmd: str) -> bool:
    from shutil import which
    return which(cmd) is not None


@dataclass
class Step:
    name: str
    command: List[str]
    critical: bool = True
    retry: int = 0
    condition: Optional[Callable[[], bool]] = None


class MagicDeployer:
    def __init__(self, project: Path, env: str, deploy_cmd: str = "", health_url: str = "") -> None:
        self.project = project
        self.env = env
        self.deploy_cmd = deploy_cmd.strip()
        self.health_url = health_url.strip() or "https://app.com/health"
        self.steps = self._get_deployment_steps()

    def deploy(self, dry_run: bool = False, check_only: bool = False) -> bool:
        LOGD.info("Starting deployment env=%s project=%s", self.env, self.project)

        if check_only:
            return self._preflight_check()

        if not self._preflight_check():
            return False

        for step in self.steps:
            LOGD.info("Step: %s", step.name)

            if step.condition and not step.condition():
                LOGD.info("Skipped (condition not met)")
                continue

            ok = self._run_step(step, dry_run=dry_run)
            if not ok and step.critical:
                LOGD.error("Failed critical step: %s", step.name)
                self._rollback(dry_run=dry_run)
                return False

        LOGD.info("Deployment completed.")
        return True

    def _preflight_check(self) -> bool:
        ok = True
        if (self.project / "package.json").exists():
            for cmd in ("node", "npm"):
                if not _which(cmd):
                    LOGD.error("Missing dependency: %s", cmd)
                    ok = False
        if self._has_dockerfile() and not _which("docker"):
            LOGD.error("Dockerfile found but docker is missing.")
            ok = False
        if self._has_prisma() and not (_which("npx") or _which("pnpm")):
            LOGD.error("Prisma detected but npx/pnpm not found.")
            ok = False
        if self.health_url and not _which("curl"):
            LOGD.warning("curl not found; health check will fail unless disabled or replaced.")
        return ok

    def _get_deployment_steps(self) -> List[Step]:
        steps: List[Step] = []

        if (self.project / "package.json").exists():
            steps.append(Step(name="Pre-flight tests", command=["npm", "test"], critical=True))

            if self._has_build_script():
                steps.append(Step(name="Build", command=["npm", "run", "build"], critical=True))

        if self._has_dockerfile():
            steps.append(Step(name="Docker build", command=["docker", "build", "-t", "app:latest", "."], critical=False))

        if self._has_prisma():
            steps.append(Step(name="DB migrations", command=["npx", "prisma", "migrate", "deploy"], critical=True))

        deploy_cmd = self._get_deploy_command()
        if deploy_cmd:
            steps.append(Step(name="Deploy", command=deploy_cmd, critical=True))
        else:
            steps.append(Step(name="Deploy (skipped - no deploy command)", command=["true"], critical=False))

        # Health check with retry
        if self.health_url and _which("curl"):
            steps.append(Step(name="Health check", command=["curl", "-fsS", self.health_url], critical=True, retry=3))

        # Cache invalidation (optional)
        inv = self._get_cache_invalidation_command()
        if inv:
            steps.append(Step(name="Cache invalidation", command=inv, critical=False))

        return steps

    def _has_build_script(self) -> bool:
        pkg = self.project / "package.json"
        if not pkg.exists():
            return False
        try:
            import json
            data = json.loads(pkg.read_text(encoding="utf-8"))
            scripts = data.get("scripts", {}) or {}
            return "build" in scripts
        except Exception:
            return False

    def _has_dockerfile(self) -> bool:
        return (self.project / "Dockerfile").exists()

    def _has_prisma(self) -> bool:
        return (
            (self.project / "prisma").exists()
            or (self.project / "prisma.schema").exists()
            or (self.project / "schema.prisma").exists()
        )

    def _get_deploy_command(self) -> List[str]:
        if self.deploy_cmd:
            return shlex.split(self.deploy_cmd)

        # best-effort: Vercel / Fly.io / generic npm script
        if (self.project / "vercel.json").exists() and _which("vercel"):
            return ["vercel", "--prod"]
        if (self.project / "fly.toml").exists() and _which("flyctl"):
            return ["flyctl", "deploy"]
        if (self.project / "package.json").exists():
            # if "deploy" script exists, use it
            try:
                import json
                data = json.loads((self.project / "package.json").read_text(encoding="utf-8"))
                scripts = data.get("scripts", {}) or {}
                if "deploy" in scripts:
                    return ["npm", "run", "deploy"]
            except Exception:
                pass
        return []

    def _get_cache_invalidation_command(self) -> List[str]:
        # optional: user can provide their own invalidation; default none
        return []

    def _run_step(self, step: Step, dry_run: bool) -> bool:
        attempts = 1 + max(0, int(step.retry))
        for attempt in range(1, attempts + 1):
            if dry_run:
                LOGD.info("[dry-run] %s", " ".join(step.command))
                return True

            try:
                proc = subprocess.run(
                    step.command,
                    cwd=str(self.project),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    check=False,
                )
                if proc.returncode == 0:
                    return True

                LOGD.error("Command failed (attempt %d/%d): %s", attempt, attempts, " ".join(step.command))
                LOGD.error("Output:\n%s", (proc.stdout or "").strip())

            except FileNotFoundError:
                LOGD.error("Command not found: %s", step.command[0])
                return False
            except Exception as e:
                LOGD.error("Error running step: %s", e)

            if attempt < attempts:
                time.sleep(2 * attempt)

        return False

    def _rollback(self, dry_run: bool) -> None:
        # Default rollback is a no-op; user should customize.
        if dry_run:
            LOGD.info("[dry-run] rollback no-op")
        else:
            LOGD.warning("Rollback not configured; no-op.")


def main() -> int:
    ap = argparse.ArgumentParser(description="magic-deploy (portable v2)")
    ap.add_argument("--project", default=".", help="Project root")
    ap.add_argument("--env", default="production")
    ap.add_argument("--check", action="store_true", help="Only run preflight checks")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--deploy-cmd", default="", help='Override deploy command, e.g. "npm run deploy"')
    ap.add_argument("--health-url", default="https://app.com/health")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    _configure_logging(args.verbose)

    d = MagicDeployer(
        project=Path(args.project).resolve(),
        env=args.env,
        deploy_cmd=args.deploy_cmd,
        health_url=args.health_url,
    )
    ok = d.deploy(dry_run=args.dry_run, check_only=args.check)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
