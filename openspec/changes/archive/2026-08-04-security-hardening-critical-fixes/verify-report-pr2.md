# Verification Report — PR 2 of security-hardening-critical-fixes

## Change

`security-hardening-critical-fixes` — **PR 2 of 4 (Phase 2: Route Authorization)**
**Mode**: Standard (no Strict TDD runner active)
**Branch**: `frontend/security-hardening-critical-fixes-pr-2-route-authz`
**Commits verified**: `94014b3` (feat: thin /api/orders route), `bbf02f4` (style: GGA minor polish)

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total (Phase 2) | 5 |
| Tasks complete | 4 |
| Tasks incomplete (out of scope) | 1 (task 2.3 — deferred to PR 3b by user decision) |

Phase 2 tasks:

- [x] 2.1 `src/lib/auth/validate-request.ts` — `requireUser(request)` returns `{ user, jwtToken }`, validates via Strapi `/api/users/me` with `X-Trace-Id` on outbound fetch and on all error responses.
- [x] 2.2 `src/features/orders/` — IDOR check + Strapi query + fetch + unwrap extracted to `getOrdersService`; route is a thin adapter.
- [x] 2.3 **DEFERRED to PR 3b** — `/api/create-payment-intent` route not modified in PR 2 (user decision: keep security scope tight; extract checkout service together with cookie migration in PR 3b).
- [x] 2.4 Unit tests for `requireUser` (6 tests) with `X-Trace-Id` assertions on outbound calls and error responses.
- [x] 2.5 `src/lib/trace.ts` — `getTraceId(request)` helper; `X-Trace-Id` propagation in `/api/orders` route and service.

## Build & Tests Execution

**Build**: ✅ Passed — `npx next build` succeeded, all routes compile, hardened CSP preserved from PR 1.

**PR 2 target tests**: ✅ **25/25 passed**
- `src/lib/auth/__tests__/validate-request.test.ts` — 6 tests
- `src/lib/__tests__/trace.test.ts` — 3 tests
- `src/app/api/orders/__tests__/route.test.ts` — 16 tests

**Full unit suite**: 661 passed / 34 failed — **all pre-existing, out of PR 2 scope**.
- CheckoutForm.test.tsx: 24 failures (`localStorage.getItem is not a function` under jsdom) — pre-existing; deferred to PR 3 (tasks 3.7/3.8).
- CartContext/CookieBanner tests: 4 failures (localStorage/jsdom isolation) — pre-existing.
- orders.integration.test.ts: 6 failures (real-backend test caught by unit glob) — pre-existing; deferred to PR 3 (task 3.7).
- PR 2 touched none of these files, nor `vitest.setup.ts` or `vitest.config.ts`.

**Type-check**: ✅ Passed (build runs tsc).

## Spec Compliance Matrix

### `secure-route-authorization` (PR 2 in scope: Orders route only)

| Scenario | Status | Evidence |
|----------|--------|----------|
| Valid owner request | ✅ COMPLIANT | `orders/route.test.ts:257-318` — valid JWT → 200, orders returned |
| Missing JWT | ✅ COMPLIANT | `orders/route.test.ts:51-58` — 401 `Unauthorized - JWT token required` |
| Tampered JWT | ✅ COMPLIANT | `orders/route.test.ts:61-78` — malformed header → 401 `Unauthorized - Invalid token format`; `validate-request.test.ts:58-86` — expired/Strapi 401 → 401 `Sesión expirada` |
| IDOR attempt | ✅ COMPLIANT | `orders/route.test.ts` IDOR suite — `?user=` mismatch → 403 `No tenés permiso` |
| Payment-intent (deferred) | ⏸️ OUT OF SCOPE | task 2.3 deferred to PR 3b by user decision |
| Consistent authorization errors | ✅ COMPLIANT | All error responses use friendly Spanish strings; no JWT/secret/stack-trace leakage |

### `api-traceability` (PR 2 in scope: Orders route + requireUser + helper)

| Scenario | Status | Evidence |
|----------|--------|----------|
| Catalog fetch | ✅ COMPLIANT | PR 1 covered (`src/lib/api.ts` + `api-security.test.ts`) |
| Multi-step checkout | ⏸️ PARTIAL | `src/lib/api.ts` generates a fresh trace id per fetch call (not propagated across calls from the same action). PR 2 doesn't worsen; concern noted as SUGGESTION. |
| Trace Id in Route Handlers — Orders route | ✅ COMPLIANT | `orders/route.test.ts:313-319` — `X-Trace-Id` on outbound Strapi call; echo on success + error responses |
| Trace Id in Route Handlers — Payment intent route | ⏸️ OUT OF SCOPE | deferred to PR 3b |
| Trace Id on Errors | ✅ COMPLIANT | All `NextResponse.json` calls in `orders/route.ts`, `getOrdersService.ts`, and `requireUser` carry `X-Trace-Id` header; `validate-request.test.ts` asserts header on error responses |

### `session-management` (not PR 2 scope — no tasks in Phase 2)

⏸️ All scenarios deferred to PR 3a/3b.

## Correctness (source inspection)

- ✅ `validate-request.ts:73-91` — `X-Trace-Id` on outbound Strapi `/users/me` fetch; on all 4 error responses (missing header, malformed, expired, Strapi error).
- ✅ `validate-request.ts:91` — `getTraceId(request)` derived once at the top of `requireUser`.
- ✅ `validate-request.ts:28-91` — returns `{ user, jwtToken }` so callers don't re-parse the header (eliminates `!` non-null assertion).
- ✅ `orders/route.ts:33-57` — thin adapter: auth → delegate to service → return.
- ✅ `getOrdersService.ts:33-37` — IDOR check (403 if `userIdParam !== user.id`).
- ✅ `getOrdersService.ts:42-69` — Strapi query with `sort[0]=createdAt:desc`, `pagination[page]`, `pagination[pageSize]`, optional `filters[user][id][$eq]`.
- ✅ `getOrdersService.ts:54-58` — outbound fetch carries `Authorization` + `X-Trace-Id`.
- ✅ `getOrdersService.ts:62-69` — 502 friendly error normalization (no Strapi status passthrough).
- ✅ `getOrdersService.ts:73-78` — Strapi v4 attributes unwrap; result typed as `Order[]`.
- ✅ `getOrdersService.ts` — `NextResponse` import only (no dead `NextRequest`).
- ✅ `getOrdersService.ts:35` — voseo consistent (`No tenés permiso`).
- ✅ `orders/route.test.ts:319` — sort query param assertion added (`sort[0]=createdAt:desc` regex).
- ✅ `orders/route.test.ts:37-39` — `afterEach(vi.unstubAllGlobals)` prevents mock leakage.
- ✅ `trace.ts` — `getTraceId(request)` reads existing or generates UUID.

## Coherence (Design)

PR 2 implements Phase 2 of the design (`requireUser` helper, IDOR enforcement in orders, trace-id propagation) without cookie migration (that's PR 3a) and without `requireUser` in payment-intent (deferred to PR 3b along with checkout service extraction). All PR 2 design decisions honored.

## Issues Found

**CRITICAL**: None.

**WARNING**:

- **W1** — Full unit suite not green (34 pre-existing failures: localStorage jsdom mocking in CheckoutForm/CartContext/CookieBanner, real-backend `orders.integration.test.ts` caught by unit glob). Deferred to PR 3 (tasks 3.7/3.8). Whole-change success criterion "unit suite passes" depends on PR 3 delivery.

**SUGGESTION**:

- **S1** — `src/lib/api.ts` generates a fresh `X-Trace-Id` per fetch call (not propagated across calls from the same user action). The api-traceability spec scenario "Multi-step checkout" expects the same trace id for all calls from one action. This is a PR 1 concern carried forward; not worsened by PR 2. Could be addressed by passing a per-request trace id through fetcher call sites in a future cleanup.
- **S2** — `getOrdersService` returns 502 on any non-OK Strapi response, including 4xx that are clearly client errors (e.g., 400 from Strapi for malformed filter). Mapping 400-class to 502 may over-state "gateway error". Consider splitting: 502 for 5xx Strapi, 404 for not-found cases, 400 for client-correctable filter errors.
- **S3** — `Order` type in `src/features/orders/types.ts` is locally defined from the test mock shape. For stronger SSOT alignment with the backend, consider importing or mirroring the real backend `Order` model from the API SSOT (out of scope for this PR — flagged for future alignment).
- **S4** — `vi.mock('@/lib/constants', ...)` in `orders/route.test.ts` and `validate-request.test.ts` use the same pattern but no shared setup file. Minor; readability could improve with a `test/setup-mocks.ts`.

## Verdict

**PASS WITH WARNINGS** — PR 2 is fully complete within its scope (4/4 in-scope tasks; 1 deferred to PR 3b by explicit user decision), all PR 2 tests pass (25/25), `next build` passes with hardened CSP preserved, and the security guarantees of `requireUser` + IDOR + `X-Trace-Id` are evidenced by passing tests and source inspection. Warning W1 (full unit suite) is a deferred PR 3 item, not a PR 2 regression. PR 2 is **archive-ready** once W1 is acknowledged as deferred to PR 3.

## Next Step

PR 2 is verified and ready to merge into the feature tracker. Continue with PR 3a (Session Infrastructure: cookie helpers, auth routes, `AuthContext` rewrite) per the `feature-branch-chain` strategy. Address W1 in PR 3 (tasks 3.7/3.8: reclassify `*.integration.test.ts` out of unit glob; fix jsdom localStorage mocks).