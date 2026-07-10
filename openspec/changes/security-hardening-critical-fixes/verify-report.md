# Verification Report: Security Hardening Critical Fixes — PR 1

**Change**: security-hardening-critical-fixes
**Slice**: PR 1 of 4 — Phase 1 (Tracing, Error Handling, Catalog, CSP)
**Version**: N/A (delta specs)
**Mode**: Standard (no Strict TDD runner active)
**Branch**: `frontend/security-hardening-critical-fixes-pr-1-tracing-csp`
**Artifact store**: hybrid (OpenSpec + Engram)
**Date**: 2026-06-23

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total (Phase 1) | 8 |
| Tasks complete | 8 |
| Tasks incomplete | 0 |

All 8 Phase 1 tasks are checked `[x]` in `tasks.md` and confirmed against source.

## Build & Tests Execution

**Build**: Passed
```text
$ npx next build
✓ Generating static pages (20/20)
Route (app) table printed (/, /tienda, /checkout, /api/*, etc.)
Middleware 34.2 kB
Exit: success — .next/BUILD_ID present
Production CSP applied (NODE_ENV=production): no 'unsafe-eval', no localhost origins.
```

**Tests (PR 1 target file)**: 13 passed / 0 failed / 0 skipped
```text
$ npx vitest run --project=unit --maxWorkers=2 src/lib/api/__tests__/api-security.test.ts
✓ |unit| src/lib/api/__tests__/api-security.test.ts (13 tests) 11ms
Test Files  1 passed (1)
     Tests  13 passed (13)
```

**Tests (full unit suite)**: 657 passed / 34 failed / 0 skipped
```text
$ npx vitest run --project=unit --maxWorkers=2
Test Files  4 failed | 37 passed (41)
     Tests  34 failed | 657 passed (691)
```
Failing files (all pre-existing, out of PR 1 scope):
- `src/__tests__/context/CartContext.test.tsx` (17) — `localStorage.clear/getItem is not a function` (jsdom env)
- `src/app/components/ui/__tests__/CookieBanner.test.tsx` (4) — localStorage env
- `src/features/checkout/components/__tests__/CheckoutForm.test.tsx` (+ retry) — localStorage env
- `src/lib/api/__tests__/orders.integration.test.ts` (2) — real-backend integration test caught by unit glob (PR 3 task 3.7 reclassifies)

Evidence these are pre-existing: `git diff --name-only main...HEAD` shows PR 1 did NOT touch any failing test file, `vitest.setup.ts`, or `vitest.config.ts`. Root cause is localStorage mocking, independent of PR 1 source changes.

**Coverage**: ➖ Not available (coverage not run)

**Type-check**: Passed (next build runs tsc; build succeeded with no type errors)

## Spec Compliance Matrix

### api-traceability spec

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Trace Id Generation | New user request | (inbound request handling — not in PR 1 tasks) | ⏸️ DEFERRED (out of PR 1 scope) |
| Trace Id Generation | Existing trace id preserved | (api.ts always generates new; no inbound preserve) | ⏸️ DEFERRED (out of PR 1 scope) |
| Trace Id on Outgoing API Calls | Catalog fetch | `api-security.test.ts > X-Trace-Id injection` (paginated + backward-compat) | ✅ COMPLIANT |
| Trace Id on Outgoing API Calls | Multi-step checkout | (checkout flow via route handlers — PR 2/3) | ⏸️ DEFERRED (out of PR 1 scope) |
| Trace Id in Route Handlers | Payment intent route | (route handler trace-id not in PR 1) | ⏸️ DEFERRED (out of PR 1 scope) |
| Trace Id in Route Handlers | Orders route | (route handler trace-id not in PR 1) | ⏸️ DEFERRED (out of PR 1 scope) |
| Trace Id on Errors | Failed backend call | (route error response trace-id not in PR 1) | ⏸️ DEFERRED (out of PR 1 scope) |

### catalog-load-more spec (MODIFIED)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Paginated Product Fetching | Initial catalog load | `api-security.test.ts > single-fetch getProducts` (count+pageSize) | ⚠️ PARTIAL — single-fetch tested; default `sort[0]=id:asc` not asserted |
| Paginated Product Fetching | Load more products | `api-security.test.ts > single-fetch getProducts` | ⚠️ PARTIAL — single-fetch tested; UI append is component-level (out of PR 1 scope) |
| Paginated Product Fetching | Explicit sort | `api-security.test.ts > includes sort params in the single fetch URL` | ✅ COMPLIANT |
| Paginated Product Fetching | Backward-compatible un-paginated call | `api-security.test.ts > backward-compatible request` (single fetch) | ✅ COMPLIANT |
| Paginated Product Fetching | Network failure surfaces friendly message | `api-security.test.ts > friendly error mapping` (500/404) | ✅ COMPLIANT |
| Paginated Product Fetching | Strapi error response surfaces friendly message | `api-security.test.ts > friendly error mapping` (401/403/429/400) | ✅ COMPLIANT |

**Compliance summary (PR 1 in-scope scenarios)**: 5 COMPLIANT, 2 PARTIAL, 0 FAILING/UNTESTED. 5 scenarios DEFERRED to later PRs (out of PR 1 scope, not counted as PR 1 failures).

## Correctness (Static Evidence)

| Task | Status | Notes |
|------|--------|-------|
| 1.1 X-Trace-Id gen + header in api.ts | ✅ Implemented | `generateTraceId()` + `fetchApiFull` sets `X-Trace-Id` header on all fetches (`src/lib/api.ts:27,81`) |
| 1.2 Friendly error mapping | ✅ Implemented | `mapApiError()` replaces raw HTTP text; attaches `status`+`traceId` to thrown Error (`api.ts:34-51,92-96`) |
| 1.3 Single-fetch getProducts w/ sort[0]/sort[1] | ✅ Implemented | params branch uses single `fetchApiFull`; sets `sort[0]`+`sort[1]=id:asc` (`api.ts:162-176`) |
| 1.4 Remove console.log from api.ts | ✅ Implemented | grep: NONE |
| 1.5 Remove auth/JWT console.log from Navbar | ✅ Implemented | diff removed 2 `console.log` lines; grep: NONE |
| 1.6 Remove console.log from orders + payment-intent routes | ✅ Implemented | `console.log` removed; orders/route.ts grep NONE. payment-intent retains `console.warn`/`console.error` (not `console.log`) — see S4 |
| 1.7 Harden CSP | ✅ Implemented | env-conditional: prod removes `unsafe-eval` + localhost, keeps `unsafe-inline` for style-src (and script-src per accepted deferral) (`next.config.ts:5-7`) |
| 1.8 Unit tests for api.ts | ✅ Implemented | 13 tests, all pass |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| CSP hardening (env-conditional, prod removes unsafe-eval+localhost, keeps unsafe-inline for style-src) | ✅ Yes | Matches design Decision:CSP exactly. Nonce-based script-src (drop unsafe-inline for scripts) explicitly deferred (Open Question) |
| Centralize X-Trace-Id + error mapping in api.ts | ✅ Yes | `generateTraceId`/`mapApiError`/`fetchApiFull` in api.ts |
| Single-fetch getProducts | ✅ Yes | `fetchApiFull` returns data+meta in one call |
| Route handlers propagate trace id to Strapi/Stripe + echo in response | ⏸️ N/A for PR 1 | PR 1 slice explicitly excludes route-handler trace-id (migration plan: PR 1 = api.ts only) |

## Issues Found

**CRITICAL**: None within PR 1 scope.

**WARNING**:
- **W1 — Full unit suite not green (34 pre-existing failures)**: `npx vitest run --project=unit --maxWorkers=2` reports 34 failures in CartContext/CookieBanner/CheckoutForm/CheckoutForm.retry/orders.integration. Root cause is `localStorage` jsdom mocking + a real-backend integration test caught by the unit glob. PR 1 did not touch any of these files or the test setup. Stabilization is explicitly PR 3 scope (tasks 3.7 reclassify integration tests, 3.8 fix localStorage-based tests). The whole-change success criterion "unit suite passes" is NOT yet met; deferred to PR 3 — not a PR 1 regression.
- **W2 — api-traceability spec partially un-tasked across the change**: The spec requirements "Trace Id in Route Handlers" (payment-intent, orders scenarios), "Trace Id on Errors" (failed backend call), and inbound "Trace Id Generation" (new request, existing-id-preserved) have NO owning task in any PR phase (1–4). PR 1 implements only the api.ts outgoing-call portion. The change's tasks under-implement the api-traceability spec. Orchestrator should either add tasks to PR 2/3 or record an accepted spec deviation. (Out of PR 1 scope but a cross-change coverage gap surfaced during PR 1 verification.)

**SUGGESTION**:
- **S1 — Add default-sort assertion**: No test asserts that `getProducts({page,pageSize})` (no explicit `sort`) produces `sort[0]=id:asc`. The "Initial catalog load" scenario names this explicitly; closing it would move that scenario from PARTIAL to COMPLIANT.
- **S2 — Trace-id propagation across calls**: `fetchApiFull` generates a fresh trace id per call; it does not accept/propagate an incoming trace id. No current api.ts action triggers multiple calls, so practical impact is nil today, but the api-traceability "same trace id for all calls triggered by the same user action" requirement will not hold if a future action issues multiple api.ts calls. Consider accepting an optional incoming trace id.
- **S3 — 400 error body surfacing**: `mapApiError` returns Strapi's raw `error.message` verbatim for 400 responses, a mild tension with "does not expose internal details". Consider whitelisting/sanitizing 400 messages.
- **S4 — Residual console.warn/error in create-payment-intent**: `src/app/api/create-payment-intent/route.ts` retains `console.warn` (lines 126, 141) and `console.error` (line 170). Task 1.6 scoped only `console.log` (removed — compliant), but consider structured server-side logging and ensure logged error objects contain no PII. These are server-side logs (not client-exposed).

## Verdict

**PASS WITH WARNINGS**

PR 1 scope is fully complete (8/8 Phase 1 tasks), its own unit tests pass (13/13), and `next build` passes with the hardened production CSP. No CRITICAL issues within PR 1 scope. Warnings are a deferred-to-PR-3 test-stabilization item (W1) and a cross-change api-traceability spec/task coverage gap (W2) for the orchestrator to resolve — neither is a PR 1 regression.
