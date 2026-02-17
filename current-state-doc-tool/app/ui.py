from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select

from app.deps import allow_anonymous_ui, get_db
from app.models import Component, ComponentEvidence, Evidence
from app.reports import generate_markdown_report

templates = Jinja2Templates(directory="app/templates")
router = APIRouter(tags=["ui"])


@router.get("/", response_class=HTMLResponse, dependencies=[Depends(allow_anonymous_ui)])
def ui_home(request: Request, db: Session = Depends(get_db)) -> HTMLResponse:
    comps = db.exec(select(Component).order_by(Component.comp_type, Component.name)).all()
    evs = {e.id: e for e in db.exec(select(Evidence)).all()}
    links = db.exec(select(ComponentEvidence)).all()

    ev_by_comp: dict[int, list[Evidence]] = {}
    for l in links:
        ev = evs.get(l.evidence_id)
        if ev:
            ev_by_comp.setdefault(l.component_id, []).append(ev)

    counts = {"Working": 0, "Degraded": 0, "Failing": 0, "Unknown": 0}
    for c in comps:
        counts[c.status.value] = counts.get(c.status.value, 0) + 1

    return templates.TemplateResponse(
        "home.html",
        {
            "request": request,
            "components": comps,
            "counts": counts,
            "evidence_by_component": ev_by_comp,
        },
    )


@router.get("/report.md", response_class=PlainTextResponse, dependencies=[Depends(allow_anonymous_ui)])
def ui_report(db: Session = Depends(get_db)) -> str:
    return generate_markdown_report(db)


@router.post("/seed", dependencies=[Depends(allow_anonymous_ui)])
def ui_seed(db: Session = Depends(get_db)) -> RedirectResponse:
    if db.exec(select(Component)).first() is None:
        db.add(Component(name="Authentication & session management", comp_type="Core"))
        db.add(Component(name="Authorization (RBAC/ABAC)", comp_type="Core"))
        db.add(Component(name="API gateway / edge routing", comp_type="Platform"))
        db.add(Component(name="Core domain service(s)", comp_type="Service"))
        db.add(Component(name="Database read/write", comp_type="Data"))
        db.add(Component(name="Observability pipeline", comp_type="Platform"))
        db.commit()
    return RedirectResponse(url="/", status_code=303)
