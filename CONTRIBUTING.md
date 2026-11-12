# Contributing to Factory Reference Billing API

This is a reference consumer for the AI Software Factory Contract. Contributions that make the reference more correct, more instructive, or better tested are welcome.

## Running the full check suite

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm openapi:validate
```

All 16 tests must pass. `pnpm typecheck` must exit 0. Open a PR only when both pass.

## Rules for this repository

1. **Never add a required parameter to `GET /v1/invoices`.** This endpoint is the compatibility baseline. Adding a required parameter is exactly the breaking change the factory is designed to detect and block. It is a valuable negative test, but it cannot be the state of `main`.

2. **Tenant identity from JWT only.** No PR may add `tenantId` to query parameters, headers, or request body. `test/tenant-isolation.test.ts` will catch violations.

3. **Do not modify `.factory/repository-contract.yaml` and source code in the same PR.** These files have different governance requirements.

4. **Do not weaken or delete `test/tenant-isolation.test.ts`.** This test is the main automated guarantee of the security boundary.

5. **CSV formula injection protection must stay.** `test/export.test.ts` asserts that cells starting with `=`, `+`, `-`, `@` are prefixed with a tab. Do not remove this.

## Adding new routes

1. Add the route handler in `src/routes/`
2. Update `openapi/openapi.yaml` with the new path, parameters, and responses
3. Run `pnpm openapi:validate`
4. Add tests in `test/`
5. Confirm the new route does not change existing route behavior

## Updating the OpenAPI spec

`openapi/openapi.yaml` is the source of truth consumed by the trusted verifier. Changes must:
- Not modify existing endpoint parameters or response shapes (this is a breaking change)
- Pass `pnpm openapi:validate`
- If you need to compare against the existing spec: `oasdiff breaking openapi/compatibility-baseline.yaml openapi/openapi.yaml`

`openapi/compatibility-baseline.yaml` is a local snapshot. The verifier uses the base SHA from GitHub, not this file.

## Questions

Open a GitHub Discussion or an issue tagged `question`.
