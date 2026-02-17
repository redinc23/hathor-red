from __future__ import annotations

import argparse
from pathlib import Path

from sqlmodel import Session, select

from app.db import create_db_and_tables, session_scope
from app.models import Role, User, UserRole
from app.reports import generate_markdown_report
from app.security import hash_password
from app.settings import settings


def cmd_init_db(_: argparse.Namespace) -> None:
    create_db_and_tables()
    with session_scope() as db:
        for role_name in ("admin", "viewer"):
            role = db.exec(select(Role).where(Role.name == role_name)).first()
            if role is None:
                db.add(Role(name=role_name))
        db.commit()
    print("DB initialized.")


def _get_role(db: Session, name: str) -> Role:
    role = db.exec(select(Role).where(Role.name == name)).first()
    if role is None:
        role = Role(name=name)
        db.add(role)
        db.commit()
        db.refresh(role)
    return role


def cmd_create_admin(_: argparse.Namespace) -> None:
    if not settings.admin_email or not settings.admin_password:
        raise SystemExit("Set APP_ADMIN_EMAIL and APP_ADMIN_PASSWORD")
    with session_scope() as db:
        user = db.exec(select(User).where(User.email == settings.admin_email)).first()
        if user is None:
            user = User(email=settings.admin_email, password_hash=hash_password(settings.admin_password))
            db.add(user)
            db.commit()
            db.refresh(user)

        admin_role = _get_role(db, "admin")
        link = db.exec(
            select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == admin_role.id)
        ).first()
        if link is None:
            db.add(UserRole(user_id=user.id, role_id=admin_role.id))
            db.commit()
    print(f"Admin ready: {settings.admin_email}")


def cmd_generate_report(args: argparse.Namespace) -> None:
    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with session_scope() as db:
        md = generate_markdown_report(db)
    out_path.write_text(md, encoding="utf-8")
    print(f"Wrote: {out_path}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="current-state-doc-tool")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub_init = sub.add_parser("init-db", help="Initialize database and baseline roles.")
    sub_init.set_defaults(func=cmd_init_db)

    sub_admin = sub.add_parser("create-admin", help="Create admin user from env.")
    sub_admin.set_defaults(func=cmd_create_admin)

    sub_rep = sub.add_parser("generate-report", help="Generate Markdown report.")
    sub_rep.add_argument("--out", required=True, help="Output markdown file path.")
    sub_rep.set_defaults(func=cmd_generate_report)

    return p


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
