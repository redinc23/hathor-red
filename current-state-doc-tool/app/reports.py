from __future__ import annotations

from datetime import datetime

from sqlmodel import Session, select

from app.models import (
    ApiSurface,
    BacklogItem,
    Component,
    ComponentEvidence,
    DataStore,
    Dependency,
    Environment,
    Evidence,
    Feature,
    Integration,
    Risk,
)


def _md_table(headers: list[str], rows: list[list[str]]) -> str:
    head = "| " + " | ".join(headers) + " |\n"
    sep = "| " + " | ".join(["---"] * len(headers)) + " |\n"
    body = ""
    for r in rows:
        body += "| " + " | ".join(r) + " |\n"
    return head + sep + body


def generate_markdown_report(db: Session) -> str:
    now = datetime.utcnow().isoformat() + "Z"
    components = db.exec(select(Component).order_by(Component.comp_type, Component.name)).all()
    evidences = {e.id: e for e in db.exec(select(Evidence)).all()}

    comp_evs = db.exec(select(ComponentEvidence)).all()
    ev_by_comp: dict[int, list[Evidence]] = {}
    for ce in comp_evs:
        ev = evidences.get(ce.evidence_id)
        if ev:
            ev_by_comp.setdefault(ce.component_id, []).append(ev)

    features = db.exec(select(Feature).order_by(Feature.name)).all()
    integrations = db.exec(select(Integration).order_by(Integration.system_name)).all()
    envs = db.exec(select(Environment).order_by(Environment.name)).all()
    apis = db.exec(select(ApiSurface).order_by(ApiSurface.name)).all()
    stores = db.exec(select(DataStore).order_by(DataStore.name)).all()
    deps = db.exec(select(Dependency).order_by(Dependency.name)).all()
    backlog = db.exec(select(BacklogItem).order_by(BacklogItem.created_at.desc())).all()
    risks = db.exec(select(Risk).order_by(Risk.created_at.desc())).all()

    comp_rows: list[list[str]] = []
    for c in components:
        evs = ev_by_comp.get(c.id or 0, [])
        ev_md = "<br/>".join([f"[{e.title}]({e.url_or_ref})" for e in evs]) or "Unspecified"
        comp_rows.append([c.name, c.comp_type, c.status.value, c.owner, ev_md])

    backlog_rows = [
        [str(b.id or ""), b.title, b.item_type.value, str(b.business_value), str(b.cost_of_delay), str(b.job_size), f"{b.wsjf:.2f}"]
        for b in backlog
    ]
    risk_rows = [
        [str(r.id or ""), r.title, r.likelihood.value, r.impact.value, r.mitigation, r.evidence_needed or "Unspecified"]
        for r in risks
    ]

    sections: list[str] = []
    sections.append("## Current-State Map (Components)\n")
    sections.append(_md_table(["Component", "Type", "Status", "Owner", "Evidence"], comp_rows or [["Unspecified", "Unspecified", "Unknown", "Unspecified", "Unspecified"]]))
    sections.append("\n## Inventory\n")
    sections.append("\n### Features\n")
    sections.append(_md_table(["Name", "Owner", "Status", "User journey", "Description"], [[f.name, f.owner, f.status.value, f.user_journey or "Unspecified", f.description or ""] for f in features] or [["Unspecified", "Unspecified", "Unknown", "Unspecified", ""]]))
    sections.append("\n### Integrations\n")
    sections.append(_md_table(["System", "Direction", "Protocol", "Auth", "SLA", "Status"], [[i.system_name, i.direction, i.protocol, i.auth, i.sla, i.status.value] for i in integrations] or [["Unspecified", "Unspecified", "Unspecified", "Unspecified", "Unspecified", "Unknown"]]))
    sections.append("\n### Environments\n")
    sections.append(_md_table(["Name", "URL", "Region", "Deploy method", "Version", "Dataset", "Status"], [[e.name, e.url, e.region, e.deploy_method, e.version, e.dataset, e.status.value] for e in envs] or [["Unspecified", "Unspecified", "Unspecified", "Unspecified", "Unspecified", "Unspecified", "Unknown"]]))
    sections.append("\n### APIs\n")
    sections.append(_md_table(["Name", "Base URL", "Versioning", "Auth", "OpenAPI", "Rate limits"], [[a.name, a.base_url, a.versioning, a.auth, a.openapi_url, a.rate_limits] for a in apis] or [["Unspecified"] * 6]))
    sections.append("\n### Data stores\n")
    sections.append(_md_table(["Name", "Type", "Schema version", "Sensitivity", "Migrations notes"], [[d.name, d.db_type, d.schema_version, d.sensitivity, d.migrations_notes] for d in stores] or [["Unspecified", "Unspecified", "Unspecified", "Unspecified", ""]]))
    sections.append("\n### Dependencies (SBOM inputs)\n")
    sections.append(_md_table(["Name", "Version", "SBOM format", "Critical CVEs", "Owner"], [[d.name, d.version, d.sbom_format, d.critical_cves, d.owner] for d in deps] or [["Unspecified"] * 5]))
    sections.append("\n## Backlog (WSJF)\n")
    sections.append(_md_table(["ID", "Title", "Type", "Business value", "Cost of delay", "Job size", "WSJF"], backlog_rows or [["", "Unspecified", "Bug", "0", "0", "1", "0.00"]]))
    sections.append("\n## Risk register\n")
    sections.append(_md_table(["ID", "Risk", "Likelihood", "Impact", "Mitigation", "Evidence needed"], risk_rows or [["", "Unspecified", "Medium", "Medium", "Unspecified", "Unspecified"]]))

    return f"""# Current-State Documentation (Generated)\n\nGenerated: {now}\n\n## Purpose\n\nEvidence-driven current-state inventory + status mapping with links, plus BRD/DevSpec-style sections.\n\n## Status definitions\n\n* Working: meets defined SLIs/SLOs (or agreed thresholds) with no critical failures.
* Degraded: partially working with sustained breaches or intermittent failures.
* Failing: reliably breaks a critical journey.
* Unknown: insufficient evidence (preferred over guessing).\n\n{''.join(sections)}\n\n## Next steps (suggested)\n\n1. Fill top 5 user journeys as Features, attach evidence, and set component statuses.
2. Define SLIs/SLOs and link dashboards as Evidence on Components.
3. Convert highest-WSJF backlog items into remediation tasks and track completion evidence.
"""
