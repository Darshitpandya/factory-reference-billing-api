# Billing API — Engineering Instructions

Owner: billing-domain. Language: TypeScript. Build: pnpm. Runtime: Fastify.
Canonical API contract: `openapi/openapi.yaml`. Database: Postgres.

## Commands
- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm openapi:validate`

## Boundaries
- Preserve existing `GET /v1/invoices` client behavior and its OpenAPI schema.
- Tenant identity is from validated authentication claims, never a query/header.
- Every DB query filters by authenticated tenant; cross-tenant access is forbidden.
- New export must enforce a safe output limit and CSV escaping.
- Never log raw invoice/customer data or secrets.
- Do not edit GitHub protected workflow, policy or verifier configuration.
- Do not weaken `.factory/repository-contract.yaml` in the same PR as code.

## Artifacts and acceptance
- ADRs under `docs/`; API changes in `openapi/openapi.yaml`.
- Source under `src/`; tests under `test/`; deployment under `deploy/`.
- Attach real unit, integration, isolation and API compatibility evidence.
- A completed local build does not mean the change is accepted.
- GitHub required `factory-contract/acceptance` and repository owner review apply.

## Stop conditions
If compatibility baseline, tenant policy or authorization is unknown, stop.
If the protected compatibility check rejects a change, record failure and rework.
This file gives context only; it is not an authorization policy.
