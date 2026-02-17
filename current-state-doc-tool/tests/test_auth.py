import os

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine

os.environ.setdefault("APP_JWT_SECRET", "test-secret")
os.environ.setdefault("APP_DB_URL", "sqlite:///./test.db")

from app.main import app
from app.models import Role, User, UserRole
from sqlmodel import SQLModel
from app.security import hash_password


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "t.db"
    db_url = f"sqlite:///{db_path}"
    monkeypatch.setenv("APP_DB_URL", db_url)

    from app import db as db_module

    db_module.engine = create_engine(db_url, echo=False)
    SQLModel.metadata.create_all(db_module.engine)

    with Session(db_module.engine) as db:
        role = Role(name="admin")
        db.add(role)
        db.commit()
        db.refresh(role)

        user = User(email="a@b.com", password_hash=hash_password("pw"))
        db.add(user)
        db.commit()
        db.refresh(user)

        db.add(UserRole(user_id=user.id, role_id=role.id))
        db.commit()

    return TestClient(app)


def test_login(client: TestClient):
    r = client.post("/auth/login", json={"email": "a@b.com", "password": "pw"})
    assert r.status_code == 200
    assert "access_token" in r.json()
