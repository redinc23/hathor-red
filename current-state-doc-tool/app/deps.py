from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.db import session_scope
from app.models import Permission, Role, RolePermission, User, UserRole
from app.rbac import AuthzContext, has_permission, union_perms
from app.security import decode_token

bearer = HTTPBearer(auto_error=False)


def get_db() -> Session:
    with session_scope() as s:
        yield s


def get_authz(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> AuthzContext:
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    try:
        payload = decode_token(creds.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = int(payload.get("uid", 0))
    email = str(payload.get("email", ""))

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")

    role_rows = db.exec(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    ).all()
    perms = union_perms([r for r in role_rows])

    perm_rows = db.exec(
        select(Permission.name)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, RolePermission.role_id == Role.id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    ).all()
    perms |= set(perm_rows)

    return AuthzContext(user_id=user_id, email=email, permissions=perms)


def require(perm: str):
    def _guard(ctx: AuthzContext = Depends(get_authz)) -> AuthzContext:
        if not has_permission(ctx, perm):
            raise HTTPException(status_code=403, detail=f"Missing permission: {perm}")
        return ctx

    return _guard


def allow_anonymous_ui(request: Request) -> None:
    _ = request
    return
