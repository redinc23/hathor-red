#!/usr/bin/env python3
"""
magic-opt: Safe optimizer (portable v2)

Default "safe" mode:
- trims trailing whitespace
- normalizes newline endings
- optional console.log guard only if clearly a statement and outside strings/comments

Aggressive mode:
- adds a couple of regex substitutions, but only outside strings/comments.
"""

from __future__ import annotations

import argparse
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple


LOGO = logging.getLogger("magic-opt")


def _configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _discover_code_files(project: Path, limit: int = 500) -> List[Path]:
    exts = {".py", ".js", ".ts", ".jsx", ".tsx"}
    out: List[Path] = []
    for p in project.rglob("*"):
        if not p.is_file() or p.name.startswith("."):
            continue
        if p.suffix.lower() in exts:
            out.append(p)
    return out[:limit]


def _strip_trailing_ws(text: str) -> str:
    return "\n".join([line.rstrip() for line in text.splitlines()]) + ("\n" if text.endswith("\n") else "")


def _normalize_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _regions_string_comment_js(code: str) -> List[Tuple[int, int]]:
    """
    Very small JS/TS lexer to find string+comment regions.
    Returns list of (start, end) ranges to avoid touching.
    """
    n = len(code)
    i = 0
    regions: List[Tuple[int, int]] = []
    while i < n:
        ch = code[i]
        nxt = code[i + 1] if i + 1 < n else ""

        # line comment
        if ch == "/" and nxt == "/":
            start = i
            i += 2
            while i < n and code[i] != "\n":
                i += 1
            regions.append((start, i))
            continue

        # block comment
        if ch == "/" and nxt == "*":
            start = i
            i += 2
            while i + 1 < n and not (code[i] == "*" and code[i + 1] == "/"):
                i += 1
            i = min(n, i + 2)
            regions.append((start, i))
            continue

        # strings: ', ", `
        if ch in {"'", '"', "`"}:
            quote = ch
            start = i
            i += 1
            while i < n:
                if code[i] == "\\":
                    i += 2
                    continue
                if code[i] == quote:
                    i += 1
                    break
                i += 1
            regions.append((start, i))
            continue

        i += 1

    return regions


def _apply_outside_regions(code: str, regions: List[Tuple[int, int]], pattern: re.Pattern, repl: str) -> str:
    # build mask of protected spans
    protected = [False] * (len(code) + 1)
    for a, b in regions:
        for j in range(a, min(b, len(code))):
            protected[j] = True

    def _safe_sub(segment: str) -> str:
        return pattern.sub(repl, segment)

    out = []
    i = 0
    n = len(code)
    while i < n:
        if protected[i]:
            # copy protected run
            j = i + 1
            while j < n and protected[j]:
                j += 1
            out.append(code[i:j])
            i = j
        else:
            # unprotected run
            j = i + 1
            while j < n and not protected[j]:
                j += 1
            out.append(_safe_sub(code[i:j]))
            i = j
    return "".join(out)


def optimize_text(path: Path, code: str, level: str) -> str:
    code2 = _normalize_newlines(code)
    code2 = _strip_trailing_ws(code2)

    ext = path.suffix.lower()
    if ext not in {".js", ".ts", ".jsx", ".tsx"}:
        return code2

    regions = _regions_string_comment_js(code2)

    # Safe: guard console.log statements
    if level in {"safe", "aggressive"}:
        pat = re.compile(r"(^|\n)\s*console\.log\(([^)]*)\)\s*;\s*", re.MULTILINE)
        repl = r'\1if (process.env.NODE_ENV === "development") console.log(\2);'
        code2 = _apply_outside_regions(code2, regions, pat, repl)

    if level == "aggressive":
        # Example: tiny opt - replace "var " with "let " (risky; but kept outside strings/comments)
        pat2 = re.compile(r"\bvar\s+")
        code2 = _apply_outside_regions(code2, regions, pat2, "let ")

    return code2


def main() -> int:
    ap = argparse.ArgumentParser(description="magic-opt (portable v2)")
    ap.add_argument("--project", default=".", help="Project root")
    ap.add_argument("--level", choices=["safe", "aggressive"], default="safe")
    ap.add_argument("--limit", type=int, default=500)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    _configure_logging(args.verbose)

    project = Path(args.project).resolve()
    files = _discover_code_files(project, limit=args.limit)

    changed = 0
    for p in files:
        try:
            before = _read_text(p)
            after = optimize_text(p, before, level=args.level)
            if after != before:
                changed += 1
                if args.dry_run:
                    LOGO.info("[dry-run] would update: %s", p)
                else:
                    _write_text(p, after)
        except Exception as e:
            LOGO.warning("Skip %s: %s", p, e)

    LOGO.info("Optimized %d files (level=%s)", changed, args.level)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
