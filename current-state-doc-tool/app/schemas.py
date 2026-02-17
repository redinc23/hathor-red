from __future__ import annotations

from pydantic import BaseModel, Field

from app.models import BacklogType, ComponentStatus, RiskImpact, RiskLikelihood


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EvidenceIn(BaseModel):
    title: str
    url_or_ref: str
    notes: str = ""


class EvidenceOut(EvidenceIn):
    id: int


class ComponentIn(BaseModel):
    name: str
    comp_type: str = "Unknown"
    status: ComponentStatus = ComponentStatus.unknown
    owner: str = "Unspecified"
    description: str = ""


class ComponentOut(ComponentIn):
    id: int


class ComponentAttachEvidenceIn(BaseModel):
    evidence_ids: list[int] = Field(default_factory=list)


class BacklogIn(BaseModel):
    title: str
    item_type: BacklogType = BacklogType.bug
    business_value: int = 0
    cost_of_delay: int = 0
    job_size: int = 1
    notes: str = ""


class BacklogOut(BacklogIn):
    id: int
    wsjf: float


class RiskIn(BaseModel):
    title: str
    description: str
    likelihood: RiskLikelihood = RiskLikelihood.medium
    impact: RiskImpact = RiskImpact.medium
    mitigation: str
    evidence_needed: str = ""


class RiskOut(RiskIn):
    id: int
