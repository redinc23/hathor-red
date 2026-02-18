# ADR-0002: Enforce admin-plane access with Cloud Run IAM, not trusted headers

## Status
Accepted

## Context
The platform now has a public plane and an operator/admin plane. We previously used request headers such as `x-goog-authenticated-user-email` for operator context and debugging.

These headers are useful for observability, but are not sufficient as a primary authorization control because front-door behavior can vary and header assumptions can drift.

## Decision
- The admin plane must be deployed as non-public Cloud Run services.
- Only approved operator principals (preferably a Workspace group) get `roles/run.invoker`.
- `x-goog-authenticated-user-email` is advisory only and must not be treated as an authorization source.
- If route-level user identity is required in-app, verify signed ID tokens/JWTs server-side.

## Consequences
### Positive
- Security boundary is enforced at the platform layer (Cloud Run IAM) before request handling.
- Fewer app-layer bypass risks due to misconfigured proxies/headers.

### Tradeoffs
- Requires IAM lifecycle management for operator principals.
- Private admin services are not directly compatible with unauthenticated uptime checks.

## Implementation Notes
- Staging/prod Cloud Build deploys separate public/admin services.
- Admin deploy commands intentionally omit `--allow-unauthenticated`.
- Runtime service accounts remain least-privilege and include Firestore access as needed.
