from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class ComponentStatus(str, Enum):
    working = "Working"
    degraded = "Degraded"
    failing = "Failing"
    unknown = "Unknown"


class BacklogType(str, Enum):
    bug = "Bug"
    tech_debt = "TechDebt"
    feature = "Feature"


class RiskImpact(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"


class RiskLikelihood(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Role(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)


class Permission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)


class UserRole(SQLModel, table=True):
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    role_id: int = Field(primary_key=True, foreign_key="role.id")


class RolePermission(SQLModel, table=True):
    role_id: int = Field(primary_key=True, foreign_key="role.id")
    permission_id: int = Field(primary_key=True, foreign_key="permission.id")


class Evidence(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    url_or_ref: str
    notes: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Component(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    comp_type: str = "Unknown"
    status: ComponentStatus = ComponentStatus.unknown
    owner: str = "Unspecified"
    description: str = ""
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ComponentEvidence(SQLModel, table=True):
    component_id: int = Field(primary_key=True, foreign_key="component.id")
    evidence_id: int = Field(primary_key=True, foreign_key="evidence.id")


class Feature(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    owner: str = "Unspecified"
    status: ComponentStatus = ComponentStatus.unknown
    description: str = ""
    user_journey: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Integration(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    system_name: str = Field(index=True, unique=True)
    direction: str = "Unspecified"
    protocol: str = "Unspecified"
    auth: str = "Unspecified"
    sla: str = "Unspecified"
    status: ComponentStatus = ComponentStatus.unknown
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Environment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    url: str = "Unspecified"
    region: str = "Unspecified"
    deploy_method: str = "Unspecified"
    version: str = "Unspecified"
    dataset: str = "Unspecified"
    status: ComponentStatus = ComponentStatus.unknown


class ApiSurface(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    base_url: str = "Unspecified"
    versioning: str = "Unspecified"
    auth: str = "Unspecified"
    openapi_url: str = "Unspecified"
    rate_limits: str = "Unspecified"


class DataStore(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    db_type: str = "Unspecified"
    schema_version: str = "Unspecified"
    sensitivity: str = "Unspecified"
    migrations_notes: str = ""


class Dependency(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    version: str = "Unspecified"
    critical_cves: str = ""
    sbom_format: str = "Unspecified"
    owner: str = "Unspecified"


class BacklogItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    item_type: BacklogType = BacklogType.bug
    business_value: int = 0
    cost_of_delay: int = 0
    job_size: int = 1
    notes: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def wsjf(self) -> float:
        if self.job_size <= 0:
            return 0.0
        return float(self.cost_of_delay) / float(self.job_size)


class Risk(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    likelihood: RiskLikelihood = RiskLikelihood.medium
    impact: RiskImpact = RiskImpact.medium
    mitigation: str
    evidence_needed: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
