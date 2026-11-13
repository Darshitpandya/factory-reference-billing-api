# Factory Reference Billing API

[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/badge/CI%2016%20tests-passing-brightgreen?style=flat-square&logo=githubactions&logoColor=white)](https://github.com/Darshitpandya/factory-reference-billing-api/actions)
[![GitHub Stars](https://img.shields.io/github/stars/Darshitpandya/factory-reference-billing-api?style=flat-square&logo=github)](https://github.com/Darshitpandya/factory-reference-billing-api/stargazers)
[![Factory Release](https://img.shields.io/badge/Factory%20Release-1.4.0-brightgreen?style=flat-square)](.factory/repository-contract.yaml)
[![TypeScript](https://img.shields.io/badge/TypeScript-Fastify-3178C6?style=flat-square&logo=typescript&logoColor=white)](src/server.ts)
[![Tenant Isolated](https://img.shields.io/badge/tenant-isolated-orange?style=flat-square)](src/db/queries.ts)
[![check](https://img.shields.io/badge/required%20check-factory--contract%2Facceptance-blue?style=flat-square&logo=github)](.factory/repository-contract.yaml)

**TypeScript reference consumer for the AI Software Factory Contract.**

A real Fastify API demonstrating the factory's core promise: an engineering stage that passes its local tests can still be **blocked from merging** by an independently owned acceptance check. This repository is where the breaking-change rejection happens.

Works with **Claude Code** · **GitHub Actions** · **Port** · **Fastify** · **PostgreSQL**

[The demo](#the-demo) · [Quick start](#quick-start) · [API reference](#api-reference) · [Tests](#tests) · [Factory contract](#factory-contract-integration) · [Contributing](CONTRIBUTING.md)

---

## Related repositories

| Repo | Role |
|---|---|
| [`ai-software-factory-contract`](https://github.com/Darshitpandya/ai-software-factory-contract) | Factory engine — runs WorkOrders through 5 stages |
| [`ai-factory-trusted-verifier`](https://github.com/Darshitpandya/ai-factory-trusted-verifier) | Posts `factory-contract/acceptance` check — not the factory, not CI |
| **This repo** | TypeScript billing API — the factory's primary reference consumer |
| [`factory-reference-notification-api`](https://github.com/Darshitpandya/factory-reference-notification-api) | Python notification API — same factory release, different domain |

---

## The demo

The reference WorkOrder adds `GET /v1/invoices/export` — a tenant-scoped CSV export.

**The compatibility constraint:** `GET /v1/invoices` already exists and has clients. Any PR that changes its parameters is a breaking change.

**What fails:** A PR that adds `tenant_id` as a required query parameter to the existing `GET /v1/invoices` endpoint.

```
oasdiff breaking baseline.yaml proposed.yaml
→ 1 breaking change: required request parameter added: 'tenant_id' in query
```

The trusted verifier posts `factory-contract/acceptance: failure` on that commit. Branch protection requires the check from the verifier App. The PR cannot merge.

**What passes:** The corrected PR adds only the new `GET /v1/invoices/export` route. No changes to the existing endpoint.

```
oasdiff breaking baseline.yaml proposed.yaml
→ 0 breaking changes
```

The verifier posts `factory-contract/acceptance: success`. The PR merges.

---

## Quick Start

**Prerequisites:** Node.js ≥ 22, pnpm ≥ 9, Docker (for the database)

### 1. Clone and install

```bash
git clone https://github.com/Darshitpandya/factory-reference-billing-api.git
cd factory-reference-billing-api
pnpm install
```

### 2. Start the database

```bash
docker compose -f deploy/docker-compose.yaml up -d billing-db
# PostgreSQL on :5432; schema + test fixtures loaded automatically
```

### 3. Configure

```bash
# No .env needed for unit tests
# For integration tests and running the server:
export DATABASE_URL=postgresql://billing:billing@localhost:5432/billing
export JWT_SECRET=local-dev-secret-min-256-bits
```

### 4. Run the tests

```bash
pnpm test
# 16 tests: invoices route, CSV export, tenant isolation
```

### 5. Run the server

```bash
pnpm start
# Fastify on :3000
```

---

## API Reference

All endpoints require a valid JWT with `tenantId` and `sub` claims. Tenant identity is derived from JWT claims only — never from query parameters.

### `GET /v1/invoices`

Returns paginated invoices for the authenticated tenant.

**This endpoint is the compatibility baseline.** Do not add required parameters.

```
GET /v1/invoices
GET /v1/invoices?page=2&pageSize=10
GET /v1/invoices?status=paid
```

| Parameter | Type | Required | Default |
|---|---|---|---|
| `page` | integer | No | 1 |
| `pageSize` | integer (max 100) | No | 20 |
| `status` | enum | No | — |

Response:
```json
{
  "invoices": [...],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

### `GET /v1/invoices/export`

Returns tenant-scoped invoices as a CSV file. Max 10,000 rows per request.

```
GET /v1/invoices/export
GET /v1/invoices/export?limit=500&status=paid&fromDate=2026-01-01&toDate=2026-06-30
```

| Parameter | Type | Required | Default |
|---|---|---|---|
| `limit` | integer (max 10000) | No | 10000 |
| `status` | enum | No | — |
| `fromDate` | date string | No | — |
| `toDate` | date string | No | — |

Response: `text/csv` with headers `invoice_id, invoice_number, customer_id, amount_cents, currency, status, issued_at, due_date`

CSV cells starting with `=`, `+`, `-`, or `@` are prefixed with a tab (formula injection prevention).

### `GET /health`

No authentication required.

```json
{"status": "ok", "db": "ok", "version": "1.0.0"}
```

---

## Tests

```bash
pnpm test          # unit tests (no live database needed)
pnpm test:e2e      # integration tests (requires running PostgreSQL)
pnpm typecheck
pnpm openapi:validate
```

| File | What it covers |
|---|---|
| `test/invoices.test.ts` | 401 without JWT, pagination params, invalid status |
| `test/export.test.ts` | CSV headers, formula injection prevention, empty list, row count |
| `test/tenant-isolation.test.ts` | SQL always includes `WHERE tenant_id = $1`; export limit enforced at `EXPORT_MAX_ROWS` |

**Tenant isolation is a hard requirement.** `test/tenant-isolation.test.ts` captures queries and asserts the SQL never issues a `SELECT` without a tenant filter. Any PR that weakens this will fail in CI.

---

## Factory Contract Integration

This repository consumes factory release `1.4.0` and declares its acceptance requirements in `.factory/repository-contract.yaml`:

```yaml
consumedRelease: "1.4.0"
acceptance:
  requiredChecks:
    - factory-contract/acceptance   # from trusted verifier App — not from GitHub Actions
  compatibilityBaselinePath: openapi/openapi.yaml
  tenantIsolationRequired: true
```

The OpenAPI baseline (`openapi/openapi.yaml`) is used by the verifier at the base SHA to detect breaking changes. It is **not** the same as `openapi/compatibility-baseline.yaml` (which is a local reference fixture only).

### Submitting a WorkOrder for this repo

The reference WorkOrder is in `.factory/work-orders/invoice-export.yaml`. To submit it via Port:

1. Go to `app.getport.io` → Catalog → Work Orders → Create
2. Set `targetService` to `factory-reference-billing-api`
3. Set `releaseVersion` to `1.4.0`
4. Set `scope` to the invoice export description

---

## Security

- Tenant identity comes exclusively from validated JWT claims
- Cross-tenant queries are forbidden; every database query filters by `tenant_id = $1`
- Raw invoice data is never logged
- Do not modify `.factory/repository-contract.yaml` or the OpenAPI baseline in the same PR as code changes
- See [SECURITY.md](SECURITY.md)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).
