# Tasks: follow-ups-sprint-5-stripe-upsert/F3-cors-over-ngrok

## Review Workload Forecast (GLOBAL)

| Field | Value |
|-------|-------|
| Estimated changed lines (PR1) | 267 (target 230-300) |
| Estimated changed lines (PR2) | 132 (target 120-180) |
| 400-line budget risk | Low (per PR individually) |
| Chained PRs recommended | Yes (already approved) |
| Chain strategy | stacked-to-main (already approved) |
| Decision needed before apply | No |

## PR1 — Server-side routes + tests + exports (~267 lines)

### Group A — RED Tests (write first, watch fail)

- [x] **A1 [R1, R4, R5]** RED: Unit tests for `api/products` route handler. 9 cases: envelope passthrough, allowlisted query forward, drop-unknown-keys, 500 → friendly Spanish, 404 mirror, catch-all, trace reuse, trace generation, `no-store` header. File: `src/app/api/products/__tests__/route.test.ts` (+90 lines). Acceptance: 9 tests FAIL (route does not exist yet).

- [x] **A2 [R2, R4, R5]** RED: Unit tests for `api/categories` route handler. 6 cases per design (mock fixture omits `meta`). File: `src/app/api/categories/__tests__/route.test.ts` (+60 lines). Acceptance: 6 tests FAIL.

### Group B — GREEN Implementation

- [x] **B1** GREEN: Export `mapApiError` and extract `getStrapiServerUrl()` helper from `src/lib/api.ts` (+12 lines, behavior-identical). Acceptance: existing tests pass untouched (`products-pagination`, `api-security`, `useProducts`, page tests).

- [x] **B2 [R1, R4, R5]** GREEN: Create `api/products` route handler. File: `src/app/api/products/route.ts` (+65 lines). Allowlist `pagination[`, `filters[`, `sort[`, `populate`, `locale`, `publicationState`. Use `getStrapiServerUrl()` + `getTraceId(request)` + `mapApiError`. Set `Cache-Control: no-store`. Acceptance: A1 tests green.

- [x] **B3 [R2, R4, R5]** GREEN: Create `api/categories` route handler. File: `src/app/api/categories/route.ts` (+40 lines). Same pattern, simpler allowlist (`locale`, `populate`, `filters[`). Acceptance: A2 tests green.

- [x] **B4** GREEN: Refactor `fetchApiFull` in `src/lib/api.ts` to use `getStrapiServerUrl()` helper (no behavior change). Acceptance: existing tests pass untouched (R6 must hold: `products-pagination` and `api-security` substring-only assertions survive).

### Group C — Keep-Green

- [x] **C1** Triple-gate sweep (PR1 only). Commands: `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build`. Acceptance: all 3 exit 0; 1106+ tests still pass; no regressions in `products-pagination`, `api-security`, `useProducts`, page tests, F2 unit tests.

### PR1 Commit Subjects (conventional commits, no AI attribution)

- `feat(api): add /api/products same-origin proxy with X-Trace-Id and friendly Spanish errors`
- `feat(api): add /api/categories same-origin proxy`
- `refactor(api): export mapApiError and extract getStrapiServerUrl helper for catalog BFF reuse`
- `test(api): cover /api/products and /api/categories proxy contract (handler-direct)`

## PR2 — Client-side origin-aware routing + assertion (~132 lines)

### Group D — RED Tests (PR2)

- [x] **D1 [R3, R6]** RED: Browser-relative vs server-absolute URL resolution tests. File: `src/lib/api/__tests__/api-browser-origin.test.ts` (+65 lines). 5 cases: jsdom browser returns relative URL, server-stub returns absolute URL, query encoding parity, no regression on existing call sites. Acceptance: tests FAIL (`getApiBaseUrl` does not exist yet).

- [x] **D2 [R3, R1, R2]** RED: Playwright origin assertion e2e. File: `tests/e2e/catalog-origin.spec.ts` (+35 lines). 3 assertions: `waitForRequest` for `api/products` origin, `waitForRequest` for `api/categories` origin, no `page.route` mocks used. Acceptance: tests FAIL in e2e suite (helper not yet wired).

### Group E — GREEN Implementation (PR2)

- [x] **E1 [R3]** GREEN: Add `getApiBaseUrl()` helper to `src/lib/api.ts` (+24 lines). Browser (`typeof window !== 'undefined'`): returns `''`. Server: returns `getStrapiServerUrl()`. String-concat for relative URLs, NOT `new URL(path, '')` (D5). Acceptance: D1 tests green.

- [x] **E2** GREEN: Wire `getApiBaseUrl()` into `fetchApiFull`. Replace direct env chain reference with helper call. Acceptance: D1, D2 tests green; existing `products-pagination`/`api-security` substring assertions still pass (R6 mandate).

- [x] **E3** GREEN: Update `.env.example` with comment block (+8 lines). Distinguish `NEXT_PUBLIC_STRAPI_API_URL` (build-time browser, deprecated for F3 consumers) from `STRAPI_API_URL` (server runtime, primary for F3). For local dev both can point to `http://localhost:1337`.

### Group F — Keep-Green (PR2)

- [x] **F1** Triple-gate sweep (PR2 only). Same commands as C1. Acceptance: all 3 exit 0; `products-pagination`/`api-security` substring assertions still pass (substr survival); no regression in F2 tests or catalog tests.

### PR2 Commit Subjects

- `test(api): assert browser catalog fetches stay same-origin` (be3b272 — RED, both D1 unit + D2 e2e)
- `fix(api): route browser catalog fetches through same-origin BFF` (ecabdd6 — GREEN E1+E2)
- `chore(env): document STRAPI_API_URL vs NEXT_PUBLIC_STRAPI_API_URL usage` (ccac245 — GREEN E3)

## Total Task Count

- Group A (PR1 RED): 2
- Group B (PR1 GREEN): 3
- Group C (PR1 keep-green): 1
- Group D (PR2 RED): 2
- Group E (PR2 GREEN): 3
- Group F (PR2 keep-green): 1
- **Total: 12 active tasks**

## Estimated Total Changed Lines

- PR1: 267 lines (page.tsx 65 + categories 40 + 2 tests 150 + api.ts 12)
- PR2: 132 lines (api.ts 24 + helper test 65 + e2e 35 + env 8)
- **Combined: ~399 lines across 2 PRs**

## Implementation Order

1. Apply PR1 RED → GREEN → keep-green. PR1 must be standalone-green (route tests pass at handler level without `fetchApiFull` origin-awareness).
2. User merges PR1 to main.
3. Apply PR2 RED → GREEN → keep-green. Depends on PR1's `mapApiBaseUrl` export.
4. User merges PR2 to main.

## Open Architectural Decisions

None. Design closed with `Option A`: forward raw allowlisted Strapi query keys (no envelope rebuild, no PR-sequencing coupling).
