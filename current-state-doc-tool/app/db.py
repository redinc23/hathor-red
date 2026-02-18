from __future__ import annotations

from contextlib import contextmanager

from sqlmodel import Session, SQLModel, create_engine

from app.settings import settings

connect_args = {}
if settings.db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(settings.db_url, echo=False, connect_args=connect_args)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


@contextmanager
def session_scope() -> Session:
    with Session(engine) as session:
        yield session
