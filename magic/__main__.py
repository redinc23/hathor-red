#!/usr/bin/env python3
"""Entry point for `python -m magic`."""

from __future__ import annotations

import sys

from . import core, deploy, optimize, testgen


def main() -> int:
    argv = sys.argv[1:]
    tool = "core"
    if argv and not argv[0].startswith("-"):
        candidate = argv[0].lower()
        if candidate in {"core", "test", "opt", "deploy"}:
            tool = candidate
            argv = argv[1:]

    sys.argv = [sys.argv[0]] + argv
    if tool == "core":
        return core.main()
    if tool == "test":
        return testgen.main()
    if tool == "opt":
        return optimize.main()
    if tool == "deploy":
        return deploy.main()

    print("Unknown tool. Use: core | test | opt | deploy", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
