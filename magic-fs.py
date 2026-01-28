#!/usr/bin/env python3
"""
Compatibility wrapper for magic_fs module.

This keeps the on-disk filename expected by legacy references while
exposing the importable module name: magic_fs.
"""

from magic_fs import *  # noqa: F401,F403
