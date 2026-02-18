#!/usr/bin/env python3
"""
magic-test: Test generator (portable v2)

- Python -> pytest skeleton
- JS/TS  -> jest skeleton (React Testing Library only if detected)
"""

from __future__ import annotations

import argparse
import json
import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

from .fs import QuantumFileSystem


LOGT = logging.getLogger("magic-test")


def _configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")


@dataclass
class DetectedTestContext:
    language: str  # python | javascript | mixed | unknown
    react: bool
    jest: bool
    pytest: bool


def _detect_test_context(project: Path) -> DetectedTestContext:
    pkg = project / "package.json"
    react = False
    jest = False
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text(encoding="utf-8"))
            deps = {}
            deps.update(data.get("dependencies", {}) or {})
            deps.update(data.get("devDependencies", {}) or {})
            names = set(deps.keys())
            react = "react" in names
            jest = "jest" in names or "@jest/globals" in names
        except Exception:
            pass

    pytest = False
    if (project / "requirements.txt").exists():
        txt = (project / "requirements.txt").read_text(encoding="utf-8", errors="replace").lower()
        pytest = "pytest" in txt
    if (project / "pyproject.toml").exists():
        txt = (project / "pyproject.toml").read_text(encoding="utf-8", errors="replace").lower()
        pytest = pytest or ("pytest" in txt)

    # language guess
    has_js = (
        any(project.rglob("*.js"))
        or any(project.rglob("*.ts"))
        or any(project.rglob("*.jsx"))
        or any(project.rglob("*.tsx"))
    )
    has_py = any(project.rglob("*.py"))
    if has_py and not has_js:
        lang = "python"
    elif has_js and not has_py:
        lang = "javascript"
    elif has_js and has_py:
        lang = "mixed"
    else:
        lang = "unknown"

    return DetectedTestContext(language=lang, react=react, jest=jest, pytest=pytest)


def _discover_files(project: Path, limit: int = 200) -> List[Path]:
    exts = {".py", ".js", ".ts", ".jsx", ".tsx"}
    files: List[Path] = []
    for p in project.rglob("*"):
        if not p.is_file():
            continue
        if p.name.startswith("."):
            continue
        if p.suffix.lower() in exts:
            files.append(p)
    return files[:limit]


def _python_pytest_test_for(module_path: Path, project: Path) -> Tuple[Path, str]:
    rel = module_path.relative_to(project)
    name = rel.stem
    test_name = f"test_{name}.py"
    out_rel = Path("python") / test_name

    return out_rel, f'''"""Generated pytest tests
Target: {rel.as_posix()}
Generated: {datetime.now().isoformat()}
"""

import importlib
import pytest


def test_import_module():
    mod_name = "{rel.as_posix().replace("/", ".")[:-3]}"
    mod = importlib.import_module(mod_name)
    assert mod is not None


@pytest.mark.parametrize("payload", [{{}}, {{"x": 1}}, {{"nested": {{"y": 2}}}}])
def test_safe_hash_exists(payload):
    mod_name = "{rel.as_posix().replace("/", ".")[:-3]}"
    mod = importlib.import_module(mod_name)
    if hasattr(mod, "safe_hash"):
        h = mod.safe_hash(payload)
        assert isinstance(h, str) and len(h) >= 16
    else:
        pytest.skip("safe_hash not found; skeleton test")
'''


def _js_jest_test_for(src_path: Path, project: Path, react: bool) -> Tuple[Path, str]:
    rel = src_path.relative_to(project)
    base = rel.stem
    out_rel = Path("javascript") / f"{base}.test.js"

    if react and rel.suffix.lower() in {".jsx", ".tsx"}:
        return out_rel, f"""// Generated Jest + RTL test
// Target: {rel.as_posix()}
// Generated: {datetime.now().isoformat()}

import React from "react";
import {{ render, screen }} from "@testing-library/react";
import Component from "../{rel.as_posix().replace("src/", "src/")}";

describe("{base}", () => {{
  test("renders", () => {{
    render(<Component />);
    expect(screen.getByTestId("{base.lower()}-container")).toBeTruthy();
  }});
}});
"""
    return out_rel, f"""// Generated Jest test (framework-agnostic)
// Target: {rel.as_posix()}
// Generated: {datetime.now().isoformat()}

describe("{base}", () => {{
  test("module loads", async () => {{
    // Adjust import path based on your test runner config.
    expect(true).toBe(true);
  }});
}});
"""


def main() -> int:
    ap = argparse.ArgumentParser(description="magic-test (portable v2)")
    ap.add_argument("--project", default=".", help="Project root")
    ap.add_argument("--output", default="tests_generated", help="Output dir for generated tests")
    ap.add_argument("--limit", type=int, default=200, help="Max files to inspect")
    ap.add_argument("--dry-run", action="store_true", help="Do not write files")
    ap.add_argument("--overwrite", action="store_true", help="Overwrite existing generated tests")
    ap.add_argument("--verbose", action="store_true", help="Verbose logs")
    ap.add_argument("--coverage", type=int, default=0, help="(Informational) coverage target")
    args = ap.parse_args()

    _configure_logging(args.verbose)

    project = Path(args.project).resolve()
    out_dir = Path(args.output).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    ctx = _detect_test_context(project)
    files = _discover_files(project, limit=args.limit)

    qfs = QuantumFileSystem(cache_size_mb=64)

    written = 0
    for f in files:
        if f.suffix.lower() == ".py" and ctx.language in {"python", "mixed"}:
            rel_out, content = _python_pytest_test_for(f, project)
        elif f.suffix.lower() in {".js", ".ts", ".jsx", ".tsx"} and ctx.language in {"javascript", "mixed"}:
            rel_out, content = _js_jest_test_for(f, project, react=ctx.react)
        else:
            continue

        dest = out_dir / rel_out
        if dest.exists() and not args.overwrite:
            LOGT.info("Skip existing (use --overwrite): %s", dest)
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        if args.dry_run:
            LOGT.info("[dry-run] would write: %s", dest)
            continue

        qfs.write_file(dest, content.encode("utf-8"), atomic=True)
        written += 1

    LOGT.info("Generated %d test files into %s", written, out_dir)
    if ctx.react and not (project / "node_modules").exists():
        LOGT.info("React detected. Ensure dev deps: jest + @testing-library/react installed.")
    if ctx.pytest and not any(project.rglob(".venv")):
        LOGT.info("Pytest detected. Ensure pytest is installed in your Python environment.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
