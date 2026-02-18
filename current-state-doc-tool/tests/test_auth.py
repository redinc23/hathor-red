import uuid

from fastapi.testclient import TestClient
from sqlmodel import select

from app.db import create_db_and_tables, session_scope
from app.main import app
from app.models import Role, User, UserRole
from app.security import hash_password


def test_login() -> None:
    create_db_and_tables()
    email = f"{uuid.uuid4().hex}@example.com"

    with session_scope() as db:
        role = db.exec(select(Role).where(Role.name == "admin")).first()
        if role is None:
            role = Role(name="admin")
            db.add(role)
            db.commit()
            db.refresh(role)

        user = User(email=email, password_hash=hash_password("pw"))
        db.add(user)
        db.commit()
        db.refresh(user)

        db.add(UserRole(user_id=user.id, role_id=role.id))
        db.commit()

    client = TestClient(app)
    r = client.post("/auth/login", json={"email": email, "password": "pw"})
    assert r.status_code == 200
    assert "access_token" in r.json()
