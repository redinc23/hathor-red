# Quality Gates

## PR Checklist (CI Enforced)

- All tests pass (unit, integration, e2e)
- TypeScript strict mode compliance
- No new ESLint warnings or errors
- Bundle size increase < 5% or justified
- Lighthouse score > 90 (performance, accessibility)
- Accessibility audit passes (axe-core)
- Security scan passes (Snyk, Trivy)
- No secrets in code (detect-secrets)
- Database migrations are backwards compatible
- Feature flagged if risky

## Team Health Metrics

- Lead Time for Changes: < 1 day
- Deployment Frequency: > 1/day
- Mean Time to Recovery: < 1 hour
- Change Failure Rate: < 5%
- Developer Satisfaction: > 4/5
- Build Time: < 10 minutes
- Test Coverage: > 80%
