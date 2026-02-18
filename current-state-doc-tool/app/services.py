from __future__ import annotations

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import BacklogItem, Component, ComponentEvidence, Evidence, Risk
from app.schemas import BacklogIn, ComponentAttachEvidenceIn, ComponentIn, EvidenceIn, RiskIn


def create_evidence(db: Session, payload: EvidenceIn) -> Evidence:
    ev = Evidence(title=payload.title, url_or_ref=payload.url_or_ref, notes=payload.notes)
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


def list_evidence(db: Session) -> list[Evidence]:
    return db.exec(select(Evidence).order_by(Evidence.created_at.desc())).all()


def create_component(db: Session, payload: ComponentIn) -> Component:
    existing = db.exec(select(Component).where(Component.name == payload.name)).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Component with name '{payload.name}' already exists",
        )
    c = Component(
        name=payload.name,
        comp_type=payload.comp_type,
        status=payload.status,
        owner=payload.owner,
        description=payload.description,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def list_components(db: Session) -> list[Component]:
    return db.exec(select(Component).order_by(Component.comp_type, Component.name)).all()


def attach_component_evidence(db: Session, component_id: int, payload: ComponentAttachEvidenceIn) -> None:
    comp = db.get(Component, component_id)
    if comp is None:
        raise ValueError("Component not found")

    existing = db.exec(select(ComponentEvidence).where(ComponentEvidence.component_id == component_id)).all()
    for row in existing:
        db.delete(row)

    unique_evidence_ids = list(set(payload.evidence_ids))
    for ev_id in unique_evidence_ids:
        if db.get(Evidence, ev_id) is None:
            raise ValueError(f"Evidence not found: {ev_id}")
        db.add(ComponentEvidence(component_id=component_id, evidence_id=ev_id))

    db.commit()


def create_backlog_item(db: Session, payload: BacklogIn) -> BacklogItem:
    b = BacklogItem(
        title=payload.title,
        item_type=payload.item_type,
        business_value=payload.business_value,
        cost_of_delay=payload.cost_of_delay,
        job_size=max(payload.job_size, 1),
        notes=payload.notes,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


def list_backlog(db: Session) -> list[BacklogItem]:
    items = db.exec(select(BacklogItem)).all()
    items.sort(key=lambda x: (x.wsjf, x.created_at.timestamp()), reverse=True)
    return items


def create_risk(db: Session, payload: RiskIn) -> Risk:
    r = Risk(
        title=payload.title,
        description=payload.description,
        likelihood=payload.likelihood,
        impact=payload.impact,
        mitigation=payload.mitigation,
        evidence_needed=payload.evidence_needed,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def list_risks(db: Session) -> list[Risk]:
    return db.exec(select(Risk).order_by(Risk.created_at.desc())).all()
