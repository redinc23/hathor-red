# Disaster Recovery Runbook

## Objectives

- Restore service within agreed RTO/RPO
- Preserve data integrity
- Communicate status to stakeholders

## Preconditions

- Backups are enabled and tested
- Infrastructure as Code for restore
- Access to secrets manager

## Procedure

1. Declare incident and open war room channel.
2. Validate scope: region, service, database, or storage.
3. Restore database from latest verified backup.
4. Rehydrate caches and verify background jobs.
5. Smoke test critical user flows.
6. Monitor error rates and saturation.

## Validation

- API health checks return 200
- Database queries succeed
- Login, playback, and rooms work

## Post-Incident

- Write incident report
- Capture action items
- Update runbooks and automation
