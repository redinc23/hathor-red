from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

DEFAULT_PERMISSIONS = {
    "admin": [
        "evidence:write",
        "evidence:read",
        "component:write",
        "component:read",
        "inventory:write",
        "inventory:read",
        "backlog:write",
        "backlog:read",
        "risk:write",
        "risk:read",
        "report:generate",
        "user:manage",
    ],
    "viewer": [
        "evidence:read",
        "component:read",
        "inventory:read",
        "backlog:read",
        "risk:read",
        "report:generate",
    ],
}


@dataclass(frozen=True)
class AuthzContext:
    user_id: int
    email: str
    permissions: set[str]


def has_permission(ctx: AuthzContext, perm: str) -> bool:
    return perm in ctx.permissions


def union_perms(roles: Iterable[str]) -> set[str]:
    perms: set[str] = set()
    for r in roles:
        perms |= set(DEFAULT_PERMISSIONS.get(r, []))
    return perms
