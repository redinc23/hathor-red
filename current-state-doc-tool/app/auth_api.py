from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.deps import get_db
from app.models import Role, User, UserRole
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(payload: LoginIn, db: Session = Depends(get_db)) -> dict[str, str]:
    user = db.exec(select(User).where(User.email == payload.email)).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    roles = db.exec(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
    ).all()

    token = create_access_token(
        subject=user.email,
        claims={"uid": user.id, "email": user.email, "roles": roles},
    )
    return {"access_token": token, "token_type": "bearer"}
