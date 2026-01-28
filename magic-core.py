#!/usr/bin/env python3
"""
SUPERNOVA - Practical Magical Code Architecture System (v2)

Goals:
- Runnable and portable by default (no heavy deps required).
- Works across JS/TS and Python projects with safe fallbacks.
- Bounded concurrency, real LRU cache, atomic writes.
- CLI compatible with magic.sh.

Usage:
  python3 magic-core.py --project . --mode analyze
  python3 magic-core.py --project . --mode generate --pattern full --output generated
  python3 magic-core.py --project . --mode full --pattern react --turbo
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import logging
import os
import re
import sys
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


LOG = logging.getLogger("magic-core")


def _configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def _read_text(path: Path, max_bytes: int = 512_000) -> str:
    try:
        data = path.read_bytes()
        if len(data) > max_bytes:
            data = data[:max_bytes]
        return data.decode("utf-8", errors="replace")
    except Exception:
        return ""


def _safe_mkdir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


class LRUCache:
    """Simple thread-safe-ish LRU for single-threaded asyncio usage."""

    def __init__(self, max_entries: int = 10_000) -> None:
        self.max_entries = max(1, int(max_entries))
        self._data: "OrderedDict[str, str]" = OrderedDict()

    def get(self, key: str) -> Optional[str]:
        val = self._data.get(key)
        if val is None:
            return None
        self._data.move_to_end(key, last=True)
        return val

    def set(self, key: str, val: str) -> None:
        if key in self._data:
            self._data.move_to_end(key, last=True)
        self._data[key] = val
        while len(self._data) > self.max_entries:
            self._data.popitem(last=False)

    def __len__(self) -> int:
        return len(self._data)


@dataclass(frozen=True)
class MagicConfig:
    turbo_mode: bool = False
    max_concurrency: int = 8
    variation_count: int = 4
    memory_cache_entries: int = 10_000
    fail_fast: bool = False
    overwrite: bool = False
    dry_run: bool = False

    @staticmethod
    def from_args(args: argparse.Namespace) -> "MagicConfig":
        cpu = os.cpu_count() or 2
        base = min(8, cpu)
        if args.turbo:
            base = min(16, max(4, cpu))
        return MagicConfig(
            turbo_mode=bool(args.turbo),
            max_concurrency=int(getattr(args, "max_concurrency", base) or base),
            variation_count=int(getattr(args, "variations", 4) or 4),
            memory_cache_entries=int(getattr(args, "cache_entries", 10_000) or 10_000),
            fail_fast=bool(getattr(args, "fail_fast", False)),
            overwrite=bool(getattr(args, "overwrite", False)),
            dry_run=bool(getattr(args, "dry_run", False)),
        )


@dataclass
class ProjectInfo:
    root: Path
    language: str  # "javascript" | "python" | "mixed" | "unknown"
    js_framework: Optional[str]  # "react" | "nextjs" | "node" | None
    py_framework: Optional[str]  # "fastapi" | "flask" | None
    package_json: Optional[Dict[str, Any]]
    python_deps: List[str]


class ProjectDetector:
    def __init__(self, root: Path) -> None:
        self.root = root

    def detect(self) -> ProjectInfo:
        pkg = self._read_package_json()
        js_framework = self._detect_js_framework(pkg)
        py_deps = self._detect_python_deps()
        py_framework = self._detect_py_framework(py_deps)

        has_js = any(self.root.rglob("package.json")) or any(self.root.rglob("*.js")) or any(self.root.rglob("*.ts"))
        has_py = any(self.root.rglob("pyproject.toml")) or any(self.root.rglob("requirements.txt")) or any(self.root.rglob("*.py"))

        if has_js and has_py:
            lang = "mixed"
        elif has_js:
            lang = "javascript"
        elif has_py:
            lang = "python"
        else:
            lang = "unknown"

        return ProjectInfo(
            root=self.root,
            language=lang,
            js_framework=js_framework,
            py_framework=py_framework,
            package_json=pkg,
            python_deps=py_deps,
        )

    def _read_package_json(self) -> Optional[Dict[str, Any]]:
        p = self.root / "package.json"
        if not p.exists():
            return None
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return None

    def _detect_js_framework(self, pkg: Optional[Dict[str, Any]]) -> Optional[str]:
        if not pkg:
            return None
        deps = {}
        deps.update(pkg.get("dependencies", {}) or {})
        deps.update(pkg.get("devDependencies", {}) or {})
        dep_names = set(deps.keys())

        if "next" in dep_names:
            return "nextjs"
        if "react" in dep_names:
            return "react"
        if "express" in dep_names or "fastify" in dep_names or "koa" in dep_names:
            return "node"
        return "node" if dep_names else None

    def _detect_python_deps(self) -> List[str]:
        deps: List[str] = []
        req = self.root / "requirements.txt"
        if req.exists():
            deps.extend(
                [
                    line.strip().split("==")[0].lower()
                    for line in req.read_text().splitlines()
                    if line.strip() and not line.strip().startswith("#")
                ]
            )

        pyproject = self.root / "pyproject.toml"
        if pyproject.exists():
            text = pyproject.read_text(encoding="utf-8", errors="replace").lower()
            # light heuristic; avoids depending on toml parser
            for name in ("fastapi", "flask", "django", "pytest"):
                if re.search(rf"\b{name}\b", text):
                    deps.append(name)
        return sorted(set(deps))

    def _detect_py_framework(self, deps: List[str]) -> Optional[str]:
        s = set(deps)
        if "fastapi" in s:
            return "fastapi"
        if "flask" in s:
            return "flask"
        if "django" in s:
            return "django"
        return None


class CodePattern:
    """Low-risk, file-extension aware pattern detection."""

    @staticmethod
    def detect(path: Path, content: str, project: ProjectInfo) -> Dict[str, float]:
        ext = path.suffix.lower()
        c = content

        scores = {"component": 0.0, "api": 0.0, "model": 0.0, "utility": 0.0, "test": 0.0}

        if ext in {".tsx", ".jsx"}:
            scores["component"] += 0.6
            if "useState" in c or "useEffect" in c:
                scores["component"] += 0.2
            if "export default" in c or "export const" in c:
                scores["component"] += 0.2

        if ext in {".ts", ".js"}:
            if re.search(r"\b(app|router)\.(get|post|put|delete)\b", c):
                scores["api"] += 0.7
            if "fetch(" in c or "axios" in c:
                scores["api"] += 0.2

        if ext == ".py":
            if re.search(r"\b(FastAPI|APIRouter|@app\.(get|post|put|delete))\b", c):
                scores["api"] += 0.8
            if re.search(r"\b(dataclass|pydantic|BaseModel)\b", c):
                scores["model"] += 0.7
            if re.search(r"\bdef\s+\w+\(", c):
                scores["utility"] += 0.3

        if re.search(r"\b(test_|_test\.|describe\(|it\()", c):
            scores["test"] += 0.9

        # clamp
        for k in list(scores.keys()):
            scores[k] = float(max(0.0, min(1.0, scores[k])))

        return scores


class QuantumCodeGenerator:
    """Bounded, deterministic generator with safe templates."""

    def __init__(self, config: MagicConfig, project: ProjectInfo) -> None:
        self.config = config
        self.project = project
        self.cache = LRUCache(max_entries=config.memory_cache_entries)
        self.sem = asyncio.Semaphore(config.max_concurrency)

    def _hash(self, pattern_type: str, context: Dict[str, Any]) -> str:
        payload = json.dumps(context, sort_keys=True, ensure_ascii=False)
        raw = f"{pattern_type}\n{payload}".encode("utf-8")
        return hashlib.blake2b(raw, digest_size=16).hexdigest()

    async def generate_async(self, pattern_type: str, context: Dict[str, Any]) -> str:
        key = self._hash(pattern_type, context)
        cached = self.cache.get(key)
        if cached is not None:
            return cached

        var_count = max(1, int(self.config.variation_count))
        var_count = min(var_count, 8)

        async with self.sem:
            variations = await asyncio.gather(
                *[self._generate_variation(pattern_type, context, i) for i in range(var_count)],
                return_exceptions=False,
            )

        best = self._select_best(variations, pattern_type, context)
        self.cache.set(key, best)
        return best

    async def _generate_variation(self, pattern_type: str, context: Dict[str, Any], variation: int) -> str:
        # yield to loop lightly; no fake delays
        await asyncio.sleep(0)
        if pattern_type == "react_component":
            return self._gen_react_component(context, variation)
        if pattern_type == "js_api":
            return self._gen_js_api(context, variation)
        if pattern_type == "py_api":
            return self._gen_py_api(context, variation)
        if pattern_type == "py_module":
            return self._gen_py_module(context, variation)
        if pattern_type == "js_module":
            return self._gen_js_module(context, variation)
        return self._gen_readme_stub(context, variation)

    def _select_best(self, variations: List[str], pattern_type: str, context: Dict[str, Any]) -> str:
        scored: List[Tuple[float, str]] = []
        for code in variations:
            score = 50.0
            # must be parse-ish safe: simple checks
            if "TODO" in code:
                score -= 2
            if pattern_type == "react_component" and "export" in code and "function" in code:
                score += 5
            if "Generated:" in code:
                score += 2
            # prefer shorter among similar
            score -= len(code) / 5000.0
            scored.append((score, code))
        scored.sort(key=lambda x: x[0], reverse=True)
        return scored[0][1]

    def _gen_react_component(self, context: Dict[str, Any], variation: int) -> str:
        name = context.get("name", "MagicComponent")
        use_ts = bool(context.get("typescript", True))
        props: Dict[str, str] = context.get("props", {}) or {}
        include_children = bool(context.get("children", True))

        ts_iface = ""
        props_type = "Props"
        if use_ts:
            lines = [f"export interface {props_type} {{"]
            for k, v in props.items():
                lines.append(f"  {k}: {v};")
            if include_children:
                lines.append("  children?: React.ReactNode;")
            lines.append("}")
            ts_iface = "\n".join(lines)

        prop_params = ", ".join([k for k in props.keys()] + (["children"] if include_children else []))
        destruct = f"{{ {prop_params} }}" if prop_params else "{}"
        children_block = "{children}" if include_children else ""

        return f"""// Generated: React component
// Name: {name}
// Generated: {datetime.now().isoformat()}
// Notes: Safe defaults; no project-specific imports.

import React from "react";

{ts_iface}

export function {name}({destruct}: {props_type if use_ts else "any"}) {{
  return (
    <section data-testid="{name.lower()}-container" aria-label="{name}">
      <header>
        <h2 data-testid="{name.lower()}-title">{name}</h2>
      </header>
      <div>
        {children_block}
      </div>
    </section>
  );
}}

export default {name};
"""

    def _gen_js_api(self, context: Dict[str, Any], variation: int) -> str:
        endpoint = context.get("endpoint", "/api/health")
        style = context.get("style", "generic")  # nextjs | express | generic
        method = (context.get("method", "GET") or "GET").upper()

        if style == "nextjs":
            return f"""// Generated: Next.js API Route
// Endpoint: {endpoint}
// Method: {method}
// Generated: {datetime.now().isoformat()}

export default async function handler(req, res) {{
  if (req.method !== "{method}") {{
    return res.status(405).json({{ ok: false, error: "Method Not Allowed" }});
  }}

  // TODO: add auth/validation as needed
  return res.status(200).json({{
    ok: true,
    endpoint: "{endpoint}",
    ts: new Date().toISOString(),
  }});
}}
"""

        if style == "express":
            return f"""// Generated: Express route module
// Endpoint: {endpoint}
// Method: {method}
// Generated: {datetime.now().isoformat()}

export function register(app) {{
  app.{method.lower()}("{endpoint}", async (req, res) => {{
    try {{
      // TODO: add auth/validation as needed
      return res.status(200).json({{
        ok: true,
        endpoint: "{endpoint}",
        ts: new Date().toISOString(),
      }});
    }} catch (err) {{
      return res.status(500).json({{ ok: false, error: "Internal Error" }});
    }}
  }});
}}
"""
        return f"""// Generated: Generic Node handler (framework-agnostic)
// Endpoint: {endpoint}
// Method: {method}
// Generated: {datetime.now().isoformat()}

/**
 * Framework-agnostic handler signature:
 *   (req, res) where res has status(code).json(obj)
 * Adapt for your runtime (Express/Fastify/Koa/Next/etc).
 */
export async function handler(req, res) {{
  if (req?.method && req.method !== "{method}") {{
    return res.status(405).json({{ ok: false, error: "Method Not Allowed" }});
  }}

  return res.status(200).json({{
    ok: true,
    endpoint: "{endpoint}",
    ts: new Date().toISOString(),
  }});
}}
"""

    def _gen_py_api(self, context: Dict[str, Any], variation: int) -> str:
        endpoint = context.get("endpoint", "/health")
        method = (context.get("method", "GET") or "GET").upper()
        framework = context.get("framework", "fastapi")

        if framework == "fastapi":
            return f'''"""Generated: FastAPI router
Endpoint: {endpoint}
Method: {method}
Generated: {datetime.now().isoformat()}
"""

from fastapi import APIRouter

router = APIRouter()


@router.{method.lower()}("{endpoint}")
async def handler():
    # TODO: add auth/validation as needed
    return {{
        "ok": True,
        "endpoint": "{endpoint}",
        "ts": "{datetime.now().isoformat()}",
    }}
'''
        if framework == "flask":
            return f'''"""Generated: Flask blueprint
Endpoint: {endpoint}
Method: {method}
Generated: {datetime.now().isoformat()}
"""

from flask import Blueprint, jsonify, request

bp = Blueprint("magic", __name__)


@bp.route("{endpoint}", methods=["{method}"])
def handler():
    # TODO: add auth/validation as needed
    return jsonify({{
        "ok": True,
        "endpoint": "{endpoint}",
    }}), 200
'''
        return f'''"""Generated: Python handler stub
Endpoint: {endpoint}
Method: {method}
Generated: {datetime.now().isoformat()}
"""

async def handler(request):
    """
    Framework-agnostic async handler.
    Adapt return format to your framework.
    """
    return {{
        "ok": True,
        "endpoint": "{endpoint}",
    }}
'''

    def _gen_py_module(self, context: Dict[str, Any], variation: int) -> str:
        name = context.get("name", "magic_utils")
        return f'''"""Generated: Python utility module
Module: {name}
Generated: {datetime.now().isoformat()}
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass(frozen=True)
class MagicResult:
    ok: bool
    data: Dict[str, Any]


def safe_hash(payload: Any) -> str:
    import json
    import hashlib
    raw = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def make_result(data: Dict[str, Any]) -> MagicResult:
    return MagicResult(ok=True, data=data)
'''

    def _gen_js_module(self, context: Dict[str, Any], variation: int) -> str:
        name = context.get("name", "magic-utils")
        return f"""// Generated: JS utility module
// Module: {name}
// Generated: {datetime.now().isoformat()}

export async function safeHash(payload) {{
  const crypto = await import("crypto");
  const raw = JSON.stringify(payload, Object.keys(payload || {{}}).sort());
  return crypto.createHash("sha256").update(raw).digest("hex");
}}

export function makeResult(data) {{
  return {{ ok: true, data }};
}}
"""

    def _gen_readme_stub(self, context: Dict[str, Any], variation: int) -> str:
        return f"""# Magic Output

Generated: {datetime.now().isoformat()}

This directory contains safe, framework-agnostic stubs produced by magic-core.

Next steps:
- Wire handlers into your framework/router.
- Add auth/validation as needed.
- Run tests (magic-test.py).
"""


@dataclass
class GeneratedFile:
    rel_path: Path
    content: str


class MagicArchitect:
    def __init__(self, project_root: Path, config: MagicConfig) -> None:
        self.root = project_root
        self.config = config
        self.project = ProjectDetector(self.root).detect()
        self.generator = QuantumCodeGenerator(self.config, self.project)

    async def analyze(self, limit: int = 200) -> Dict[str, Any]:
        files = self._discover_source_files()
        files = files[:limit]
        results: List[Dict[str, Any]] = []

        sem = asyncio.Semaphore(self.config.max_concurrency)

        async def _analyze_one(p: Path) -> None:
            async with sem:
                content = _read_text(p)
                patterns = CodePattern.detect(p, content, self.project)
                results.append(
                    {
                        "path": str(p.relative_to(self.root)),
                        "suffix": p.suffix.lower(),
                        "patterns": patterns,
                        "size": p.stat().st_size if p.exists() else 0,
                    }
                )

        await asyncio.gather(*[_analyze_one(p) for p in files])

        summary = {
            "project": {
                "root": str(self.root),
                "language": self.project.language,
                "js_framework": self.project.js_framework,
                "py_framework": self.project.py_framework,
            },
            "files_scanned": len(results),
            "top_patterns": self._summarize_patterns(results),
        }
        return {"summary": summary, "files": results}

    def _summarize_patterns(self, results: List[Dict[str, Any]]) -> Dict[str, int]:
        tally: Dict[str, int] = {"component": 0, "api": 0, "model": 0, "utility": 0, "test": 0}
        for r in results:
            patterns: Dict[str, float] = r["patterns"]
            best = max(patterns.items(), key=lambda kv: kv[1])[0]
            if patterns[best] >= 0.6:
                tally[best] += 1
        return tally

    def _discover_source_files(self) -> List[Path]:
        exts = {".py", ".js", ".ts", ".jsx", ".tsx"}
        files: List[Path] = []
        for p in self.root.rglob("*"):
            if not p.is_file():
                continue
            if p.name.startswith("."):
                continue
            if p.suffix.lower() in exts:
                files.append(p)
        return files

    async def generate(self, pattern: str, output_dir: Path) -> List[GeneratedFile]:
        _safe_mkdir(output_dir)

        generated: List[GeneratedFile] = []
        now = datetime.now().strftime("%Y%m%d-%H%M%S")

        # Always write a README
        readme = await self.generator.generate_async("readme", {})
        generated.append(GeneratedFile(Path("README.md"), readme))

        if self.project.language in {"javascript", "mixed"}:
            style = "generic"
            if self.project.js_framework == "nextjs":
                style = "nextjs"
            elif self.project.js_framework == "node":
                style = "express"

            if pattern in {"react", "full"} and self.project.js_framework in {"react", "nextjs"}:
                for i in range(3):
                    ctx = {
                        "name": f"MagicComponent{i}",
                        "typescript": True,
                        "props": {"data": "unknown", "onClick": "() => void"},
                        "children": True,
                    }
                    code = await self.generator.generate_async("react_component", ctx)
                    rel = Path("src") / "components" / f"MagicComponent{i}.tsx"
                    generated.append(GeneratedFile(rel, code))

            if pattern in {"api", "full"}:
                endpoints = ["/api/health", "/api/status"]
                for ep in endpoints:
                    ctx = {"endpoint": ep, "method": "GET", "style": style}
                    code = await self.generator.generate_async("js_api", ctx)
                    # Next.js wants pages/api/*.js; otherwise keep in src/api
                    if style == "nextjs":
                        rel = Path("pages") / "api" / (ep.split("/")[-1] + ".js")
                    else:
                        rel = Path("src") / "api" / (ep.split("/")[-1] + ".js")
                    generated.append(GeneratedFile(rel, code))

        if self.project.language in {"python", "mixed"}:
            if pattern in {"api", "full"}:
                framework = self.project.py_framework or "fastapi"
                endpoints = ["/health", "/status"]
                for ep in endpoints:
                    ctx = {"endpoint": ep, "method": "GET", "framework": framework}
                    code = await self.generator.generate_async("py_api", ctx)
                    rel = Path("magic_generated") / "api" / f"{ep.strip('/').replace('-', '_')}.py"
                    generated.append(GeneratedFile(rel, code))

            if pattern in {"full"}:
                code = await self.generator.generate_async("py_module", {"name": "magic_utils"})
                generated.append(GeneratedFile(Path("magic_generated") / "magic_utils.py", code))

        # Write files
        await self._write_generated(output_dir, generated)
        LOG.info("Generated %d files into %s", len(generated), output_dir)
        return generated

    async def _write_generated(self, output_dir: Path, files: List[GeneratedFile]) -> None:
        from magic_fs import QuantumFileSystem  # local import to keep core minimal

        qfs = QuantumFileSystem(cache_size_mb=64)
        for gf in files:
            dest = output_dir / gf.rel_path
            if dest.exists() and not self.config.overwrite:
                LOG.warning("Skip existing (use --overwrite): %s", dest)
                continue
            _safe_mkdir(dest.parent)
            if self.config.dry_run:
                LOG.info("[dry-run] would write: %s (%d bytes)", dest, len(gf.content.encode("utf-8")))
                continue
            qfs.write_file(dest, gf.content.encode("utf-8"), atomic=True)


async def _run(args: argparse.Namespace) -> int:
    config = MagicConfig.from_args(args)
    architect = MagicArchitect(Path(args.project).resolve(), config)

    if args.mode == "analyze":
        result = await architect.analyze(limit=args.limit)
        out = json.dumps(result["summary"], indent=2)
        print(out)
        if args.output_json:
            Path(args.output_json).write_text(json.dumps(result, indent=2), encoding="utf-8")
        return 0

    if args.mode in {"generate", "full"}:
        out_dir = Path(args.output).resolve()
        await architect.generate(pattern=args.pattern, output_dir=out_dir)
        return 0

    LOG.error("Unknown mode: %s", args.mode)
    return 2


def main() -> int:
    parser = argparse.ArgumentParser(description="SUPERNOVA magic-core (portable v2)")
    parser.add_argument("--project", default=".", help="Project root directory")
    parser.add_argument("--mode", choices=["analyze", "generate", "full"], default="full")
    parser.add_argument("--pattern", choices=["react", "api", "full"], default="full")
    parser.add_argument("--output", default="generated", help="Output directory for generated artifacts")
    parser.add_argument("--limit", type=int, default=200, help="Max files to scan in analyze mode")
    parser.add_argument("--output-json", default="", help="Write full analyze result to JSON file")

    parser.add_argument("--turbo", action="store_true", help="Enable higher concurrency (bounded)")
    parser.add_argument("--max-concurrency", type=int, default=0, help="Override max concurrency")
    parser.add_argument("--variations", type=int, default=4, help="Number of variations per generation (bounded)")
    parser.add_argument("--cache-entries", type=int, default=10_000, help="LRU cache max entries")

    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing generated files")
    parser.add_argument("--dry-run", action="store_true", help="Do not write; only print actions")
    parser.add_argument("--fail-fast", action="store_true", help="Stop on first error")
    parser.add_argument("--verbose", action="store_true", help="Verbose logging")

    args = parser.parse_args()
    _configure_logging(args.verbose)

    try:
        return asyncio.run(_run(args))
    except KeyboardInterrupt:
        LOG.error("Interrupted")
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
