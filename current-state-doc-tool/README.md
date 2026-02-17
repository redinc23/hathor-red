# Current-State Documentation Tool

A lightweight system to inventory a software tool's current state (features/integrations/envs/roles), classify components as Working/Degraded/Failing/Unknown with evidence links, track WSJF backlog, maintain a risk register, and generate BRD + Developer Spec Markdown reports.

This implements an evidence-first workflow.

## Quickstart

```bash
python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -e ".[dev]"

export APP_JWT_SECRET="dev-secret-change-me"
export APP_ADMIN_EMAIL="admin@example.com"
export APP_ADMIN_PASSWORD="admin123!"

# init db + create admin
python -m app.cli init-db
python -m app.cli create-admin

uvicorn app.main:app --reload
```

Open:

- UI: http://127.0.0.1:8000
- OpenAPI: http://127.0.0.1:8000/docs

## Generate reports

```bash
python -m app.cli generate-report --out ./out/current_state_report.md
```

## Env vars

- `APP_DB_URL` default `sqlite:///./app.db`
- `APP_JWT_SECRET` required
- `APP_JWT_ISSUER` default `current-state-doc-tool`
- `APP_OTEL_ENABLED` default `false`
- `APP_OTEL_SERVICE_NAME` default `current-state-doc-tool`
- `APP_ADMIN_EMAIL`, `APP_ADMIN_PASSWORD` used by `create-admin`
