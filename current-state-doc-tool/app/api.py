from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.deps import get_db, require
from app.reports import generate_markdown_report
from app.schemas import (
    BacklogIn,
    BacklogOut,
    ComponentAttachEvidenceIn,
    ComponentIn,
    ComponentOut,
    EvidenceIn,
    EvidenceOut,
    RiskIn,
    RiskOut,
)
from app.services import (
    attach_component_evidence,
    create_backlog_item,
    create_component,
    create_evidence,
    create_risk,
    list_backlog,
    list_components,
    list_evidence,
    list_risks,
)

router = APIRouter(prefix="/api")


@router.post("/evidence", response_model=EvidenceOut, dependencies=[Depends(require("evidence:write"))])
def api_create_evidence(payload: EvidenceIn, db: Session = Depends(get_db)) -> EvidenceOut:
    ev = create_evidence(db, payload)
    return EvidenceOut(id=ev.id, title=ev.title, url_or_ref=ev.url_or_ref, notes=ev.notes)  # type: ignore[arg-type]


@router.get("/evidence", response_model=list[EvidenceOut], dependencies=[Depends(require("evidence:read"))])
def api_list_evidence(db: Session = Depends(get_db)) -> list[EvidenceOut]:
    return [EvidenceOut(id=ev.id, title=ev.title, url_or_ref=ev.url_or_ref, notes=ev.notes) for ev in list_evidence(db)]  # type: ignore[arg-type]


@router.post("/components", response_model=ComponentOut, dependencies=[Depends(require("component:write"))])
def api_create_component(payload: ComponentIn, db: Session = Depends(get_db)) -> ComponentOut:
    c = create_component(db, payload)
    return ComponentOut(id=c.id, name=c.name, comp_type=c.comp_type, status=c.status, owner=c.owner, description=c.description)  # type: ignore[arg-type]


@router.get("/components", response_model=list[ComponentOut], dependencies=[Depends(require("component:read"))])
def api_list_components(db: Session = Depends(get_db)) -> list[ComponentOut]:
    return [ComponentOut(id=c.id, name=c.name, comp_type=c.comp_type, status=c.status, owner=c.owner, description=c.description) for c in list_components(db)]  # type: ignore[arg-type]


@router.put("/components/{component_id}/evidence", dependencies=[Depends(require("component:write"))])
def api_attach_component_evidence(component_id: int, payload: ComponentAttachEvidenceIn, db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        attach_component_evidence(db, component_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"status": "ok"}


@router.post("/backlog", response_model=BacklogOut, dependencies=[Depends(require("backlog:write"))])
def api_create_backlog(payload: BacklogIn, db: Session = Depends(get_db)) -> BacklogOut:
    b = create_backlog_item(db, payload)
    return BacklogOut(id=b.id, wsjf=b.wsjf, **payload.model_dump())  # type: ignore[arg-type]


@router.get("/backlog", response_model=list[BacklogOut], dependencies=[Depends(require("backlog:read"))])
def api_list_backlog(db: Session = Depends(get_db)) -> list[BacklogOut]:
    return [BacklogOut(id=b.id, wsjf=b.wsjf, title=b.title, item_type=b.item_type, business_value=b.business_value, cost_of_delay=b.cost_of_delay, job_size=b.job_size, notes=b.notes) for b in list_backlog(db)]  # type: ignore[arg-type]


@router.post("/risks", response_model=RiskOut, dependencies=[Depends(require("risk:write"))])
def api_create_risk(payload: RiskIn, db: Session = Depends(get_db)) -> RiskOut:
    r = create_risk(db, payload)
    return RiskOut(id=r.id, **payload.model_dump())  # type: ignore[arg-type]


@router.get("/risks", response_model=list[RiskOut], dependencies=[Depends(require("risk:read"))])
def api_list_risks(db: Session = Depends(get_db)) -> list[RiskOut]:
    return [RiskOut(id=r.id, title=r.title, description=r.description, likelihood=r.likelihood, impact=r.impact, mitigation=r.mitigation, evidence_needed=r.evidence_needed) for r in list_risks(db)]  # type: ignore[arg-type]


@router.get("/report.md", dependencies=[Depends(require("report:generate"))])
def api_report_markdown(db: Session = Depends(get_db)) -> dict[str, str]:
    return {"markdown": generate_markdown_report(db)}
