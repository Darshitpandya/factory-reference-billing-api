# Factory Reference Billing API

TypeScript/Fastify reference consumer for the [AI Software Factory Contract](https://github.com/Darshitpandya/ai-software-factory-contract).

## Related Repositories

| Repository | Role |
|---|---|
| [ai-software-factory-contract](https://github.com/Darshitpandya/ai-software-factory-contract) | Factory engine — runs WorkOrders through 5 stages |
| [ai-factory-trusted-verifier](https://github.com/Darshitpandya/ai-factory-trusted-verifier) | Independent verifier — posts `factory-contract/acceptance` check |
| **This repo** | TypeScript billing API — factory consumer, compatibility demo |
| [factory-reference-notification-api](https://github.com/Darshitpandya/factory-reference-notification-api) | Python notification API — same factory, different domain |

## The Demo

This repository demonstrates the **breaking-change rejection** at the heart of the factory:

- `GET /v1/invoices` — existing stable endpoint (OpenAPI baseline protected)
- `GET /v1/invoices/export` — new tenant-scoped CSV export (factory-produced)

A PR that makes `GET /v1/invoices` break (e.g., adds a required `tenant_id` query param) will be **rejected** by the trusted verifier with `factory-contract/acceptance: failure`. The same verifier **accepts** the corrected PR that only adds the new `/export` route.

## Commands

```bash
pnpm install
pnpm typecheck
pnpm test          # 16 tests: invoices, export, tenant isolation
pnpm test:e2e      # requires running database
pnpm openapi:validate
```

## Consumes Factory Release

```yaml
# .factory/repository-contract.yaml
consumedRelease: "1.4.0"
acceptance:
  requiredChecks:
    - factory-contract/acceptance   # from trusted verifier App — not from CI
  compatibilityBaselinePath: openapi/openapi.yaml
  tenantIsolationRequired: true
```

## Tests

- `test/invoices.test.ts` — route auth, pagination, validation
- `test/export.test.ts` — CSV format, formula injection prevention
- `test/tenant-isolation.test.ts` — SQL always filters by tenantId
