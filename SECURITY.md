# Security Policy — Factory Reference Billing API

## Reporting a vulnerability

**Do not open a public issue.**

Report privately via GitHub Security Advisories or contact the maintainer directly (see GitHub profile).

## Tenant isolation

Every database query in `src/db/queries.ts` must include `WHERE tenant_id = $1` where `$1` is the authenticated tenant ID from the validated JWT. Cross-tenant data access is a critical security failure.

If you find a code path that can return data belonging to a different tenant than the one authenticated:
1. Report immediately via Security Advisories
2. Do not open a public issue or PR demonstrating the bypass

## JWT handling

Tenant identity is established by `src/auth/verify-jwt.ts`. The `tenantId` claim must come from the verified token payload only. It must never be accepted from:
- A query parameter (e.g., `?tenant_id=...`)
- A request header (e.g., `X-Tenant-ID: ...`)
- The request body

## CSV injection

`src/services/invoice-export.ts` applies formula injection protection. Cells beginning with `=`, `+`, `-`, or `@` receive a tab prefix. If you find a bypass (a cell that opens a formula in a spreadsheet application), report it.

## Credential handling

- `JWT_SECRET` and `DATABASE_URL` must be injected as environment variables; never committed
- Raw invoice data must not appear in logs, error messages, or stack traces
- Do not add any credential or token to `AGENTS.md`, `openapi/`, or `.factory/`

## Supported versions

The `main` branch receives security patches. Older tagged releases are not actively maintained.
