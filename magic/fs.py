#!/usr/bin/env python3
"""
magic_fs: Safe, fast-ish filesystem helpers.

- Atomic writes using temp file + os.replace.
- Optional mmap reads.
- LRU cache with compression threshold (avoid wasting CPU on tiny files).
"""

from __future__ import annotations

import hashlib
import mmap
import os
import tempfile
import threading
import zlib
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List


@dataclass
class FsStats:
    hits: int = 0
    misses: int = 0
    compressed_bytes: int = 0


class QuantumFileSystem:
    def __init__(self, cache_size_mb: int = 256, compress_threshold_bytes: int = 2048) -> None:
        self.cache_size = int(cache_size_mb) * 1024 * 1024
        self.compress_threshold = int(compress_threshold_bytes)
        self._lock = threading.RLock()
        self._cache: "OrderedDict[str, bytes]" = OrderedDict()
        self._cache_bytes = 0
        self.stats = FsStats()

    def read_file(self, path: Path, use_mmap: bool = True) -> bytes:
        key = str(path.resolve())
        with self._lock:
            cached = self._cache.get(key)
            if cached is not None:
                self._cache.move_to_end(key, last=True)
                self.stats.hits += 1
                return self._maybe_decompress(cached)

        self.stats.misses += 1
        data = self._read_uncached(path, use_mmap=use_mmap)

        with self._lock:
            payload = self._maybe_compress(data)
            self._cache_set(key, payload)

        return data

    def write_file(self, path: Path, data: bytes, atomic: bool = True) -> None:
        path = path.resolve()
        path.parent.mkdir(parents=True, exist_ok=True)

        if atomic:
            self._atomic_write(path, data)
        else:
            path.write_bytes(data)

        key = str(path)
        with self._lock:
            payload = self._maybe_compress(data)
            self._cache_set(key, payload)

    def batch_process(self, operations: List[Dict[str, Any]]) -> List[Any]:
        out: List[Any] = []
        for op in operations:
            t = op.get("type")
            if t == "read":
                out.append(self.read_file(Path(op["path"])))
            elif t == "write":
                data = op["data"]
                b = data.encode("utf-8") if isinstance(data, str) else data
                self.write_file(Path(op["path"]), b, atomic=bool(op.get("atomic", True)))
                out.append(True)
            else:
                out.append(None)
        return out

    def _read_uncached(self, path: Path, use_mmap: bool) -> bytes:
        if not path.exists():
            raise FileNotFoundError(str(path))
        size = path.stat().st_size
        if use_mmap and size > 0:
            with open(path, "rb") as f:
                with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
                    return mm.read()
        return path.read_bytes()

    def _atomic_write(self, path: Path, data: bytes) -> None:
        # temp file in same dir to keep replace atomic on most OS/filesystems
        fd, tmp_name = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=str(path.parent))
        tmp = Path(tmp_name)
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(data)
                f.flush()
                os.fsync(f.fileno())

            written = tmp.read_bytes()
            if hashlib.sha256(written).digest() != hashlib.sha256(data).digest():
                raise OSError("Checksum verification failed")

            os.replace(str(tmp), str(path))
        finally:
            try:
                if tmp.exists():
                    tmp.unlink()
            except Exception:
                pass

    def _maybe_compress(self, data: bytes) -> bytes:
        if len(data) < self.compress_threshold:
            return data
        comp = zlib.compress(data, level=3)
        return b"Z" + comp

    def _maybe_decompress(self, payload: bytes) -> bytes:
        if payload[:1] == b"Z":
            return zlib.decompress(payload[1:])
        return payload

    def _cache_set(self, key: str, payload: bytes) -> None:
        # evict until fit
        if key in self._cache:
            self._cache_bytes -= len(self._cache[key])
            self._cache.move_to_end(key, last=True)

        self._cache[key] = payload
        self._cache_bytes += len(payload)
        self.stats.compressed_bytes = self._cache_bytes

        while self._cache_bytes > self.cache_size and self._cache:
            k, v = self._cache.popitem(last=False)
            self._cache_bytes -= len(v)
            self.stats.compressed_bytes = self._cache_bytes
