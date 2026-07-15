# Apply Progress: orders-services-refactor (MERGED — PR-1a + PR-1b + PR-2a + PR-2b)

## Current State
- **Change**: orders-services-refactor
- **Latest slice**: PR-2b (B2.1 + B2.2) — stacked on PR-2a (3de8145)
- **Status**: success
- **Mode**: Strict TDD
- **Delivery**: size:exception approved (PR-2a ~421 lines, PR-2b ~335 lines)
- **Chain strategy**: stacked-to-main
- **All implementation tasks complete**: A1.1, A1.2, A2, B1.1, B1.2, B2.1, B2.2

## Completed Tasks

### A1.1 RED + A1.2 GREEN [PR-1a, commit 8e0250f]
- Created `getOrderByIdService` (~95 lines) + 14-test suite (~210 lines) + barrel export
- Service contract: `({user, jwtToken, traceId, orderId}) => Promise<{data}|{error: NextResponse}>`
- 14/14 service tests pass. 19/19 existing route tests still green.
- ~306 changed lines (under 400 budget)

### A2 REFACTOR [PR-1b, commit 02e0b58]
- Slimmed `src/app/api/orders/[orderId]/route.ts` from 98 → 34 lines (transport-only)
- Route: getTraceId → requireUser → await params → delegate → error passthrough → success + X-Trace-Id → 500 catch
- ZERO references to: fetch, normalizeStrapiOrder, API_URL, OrderLookupResponse, ownership checks
- Re-anchored 878-line test suite: mock `getOrderByIdService` (vi.mock @/features/orders) instead of global.fetch for order data
- global.fetch mocks retained ONLY for requireUser (/api/users/me)
- All 19 original assertions preserved byte-identically (status codes, Spanish strings, shapes, X-Trace-Id, requireUser/401)
- Fetch-level assertions (URL, headers, 502 mapping) already owned by service test suite from PR-1a — no migration needed
- 19/19 route tests + 14/14 service tests + 171/171 full orders suite pass
- ~226 changed lines (80+ / 146-)

### B1.1 RED + B1.2 GREEN [PR-2a, commit 3de8145]
- **Test file**: `src/features/orders/services/__tests__/requestCancellationService.test.ts`
- **Service file**: `src/features/orders/services/requestCancellationService.ts` (~140 lines)
- **Tests**: 18 tests covering CANCELLABLE_STATUSES export, two-call flow (URL/headers/body), 502 (5 scenarios), 404 IDOR (4 scenarios), 400 non-cancellable + double-click (2 scenarios), X-Trace-Id on errors (3 scenarios)
- **GREEN result**: 18/18 tests pass
- **Full orders suite**: 189/189 tests pass (9 files) — no regressions
- **CANCELLABLE_STATUSES**: Exported from service file; route still had inline copy (atomic deletion in B2.2)
- **Barrel**: added `export { requestCancellationService }` to `src/features/orders/index.ts`
- ~421 changed lines (size:exception approved)

### B2.1 RED + B2.2 GREEN [PR-2b, commit TBD]
- **Test file**: `src/app/api/orders/[orderId]/request-cancellation/__tests__/route.test.ts` (GREENFIELD)
- **Tests**: 24 tests covering:
  - Authentication: 401 no cookie, 401 invalid session (2 tests)
  - Invalid body: 400 JSON parse fail (1 test)
  - Missing reason: 400 missing/empty/whitespace/non-string (4 tests)
  - Reason too long (NEW 500-char cap): 400 at 501 chars, 400 at 1000 chars, 200 at exactly 500 chars boundary (3 tests)
  - Service-delegated errors: 404 IDOR, 400 non-cancellable, 400 double-click cancellation_requested, 502 (4 tests)
  - Success: 200 with correct body, correct params passed to service (2 tests)
  - Top-level 500 catch (1 test)
  - X-Trace-Id on every response: 200, 400 missing reason, 400 reason-too-long, 404, 502, 500 (6 tests)
  - Zero global.fetch for service calls: only requireUser uses fetch (1 test)
- **RED result**: 10/24 tests failed as expected (route had inline logic, no 500-char validation, no service delegation)
- **Route file**: `src/app/api/orders/[orderId]/request-cancellation/route.ts` slimmed from 157 → 66 lines
- **Route changes**:
  - Removed inline `CANCELLABLE_STATUSES` (now from service)
  - Removed inline fetch, normalizeStrapiOrder, URL construction, ownership checks
  - Added 500-char reason validation BEFORE calling service (NEW behavior)
  - Delegates to `requestCancellationService` from `@/features/orders`
  - Byte-identical Spanish strings: 200, 400 missing reason, 400 invalid body, 400 non-cancellable, 404, 502, 500
  - NEW Spanish 2-sentence message for 500-char cap (byte-identical to design verbatim)
- **GREEN result**: 24/24 tests pass
- **Full orders suite**: 213/213 tests pass (10 files) — no regressions (up from 189/189)
- **Only externally-observable behavior change**: 500-char reason cap replaces silent substring(0,1000) truncation
- ~335 changed lines (size:exception approved if over 400)

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| A1.1 | `services/__tests__/getOrderByIdService.test.ts` | Unit | N/A (new) | ✅ Written (file missing) | ✅ 14/14 passed | ✅ 14 cases (URL, 502×3, 404-IDOR×2, 404-notfound×2, 200×2, X-Trace×3) | ➖ None needed (service is a thin wrapper) |
| A1.2 | same test file | Unit | ✅ 19/19 route suite green | ✅ Written | ✅ 14/14 passed | ➖ Covered by A1.1 triangulation | ➖ None needed |
| A2 | `route.test.ts` + `route.ts` | Unit (refactor) | ✅ 19/19 route + 14/14 service green | N/A (pure refactor — mock target switch, not new behavior) | ✅ 19/19 route + 14/14 service + 171/171 full suite | ➖ All 19 original assertions preserved (byte-identical) | ✅ Route slimmed 98→34 lines, zero forbidden refs |
| B1.1 | `services/__tests__/requestCancellationService.test.ts` | Unit | ✅ 14/14 service + 19/19 route + 171/171 full suite green | ✅ Written (file missing) | ✅ 18/18 passed | ✅ 18 cases (CANCELLABLE×1, two-call×3, 502×5, 404×4, 400×2, X-Trace×3) | ➖ None needed (service is a thin wrapper) |
| B1.2 | same test file | Unit | ✅ 189/189 full suite green | ✅ Written | ✅ 18/18 passed | ➖ Covered by B1.1 triangulation | ➖ None needed |
| B2.1 | `request-cancellation/__tests__/route.test.ts` | Unit | ✅ 189/189 full suite green | ✅ Written (GREENFIELD — file missing) | ✅ 24/24 passed | ✅ 24 cases (auth×2, invalid-body×1, missing-reason×4, reason-cap×3, service-errors×4, success×2, 500-catch×1, X-Trace×6, no-fetch×1) | ➖ None needed (route is transport-only) |
| B2.2 | same test file | Unit (refactor) | ✅ 24/24 route test green | N/A (route slim + NEW 500-char validation) | ✅ 24/24 route + 213/213 full suite | ➖ All 24 assertions preserved (byte-identical except NEW 500-char cap) | ✅ Route slimmed 157→66 lines, zero forbidden refs, CANCELLABLE_STATUSES deleted atomically |

## Work Unit Evidence (PR-2b)

| Evidence | Value |
|----------|-------|
| Focused test command and exact result | `npx vitest run --maxWorkers=2 src/app/api/orders/[orderId]/request-cancellation/__tests__/route.test.ts` → 24/24 passed (23ms) |
| Full suite command and exact result | `npx vitest run --maxWorkers=2 src/app/api/orders/ src/features/orders/` → 213/213 passed (10 files, 3.72s) |
| Runtime harness command/scenario and exact result | N/A — pure unit, no runtime boundary changed (only validation logic added) |
| Rollback boundary | `git revert <commit>` removes `src/app/api/orders/[orderId]/request-cancellation/__tests__/route.test.ts` and reverts `src/app/api/orders/[orderId]/request-cancellation/route.ts` to pre-slim state (157 lines with inline logic). All prior work (PR-1a, PR-1b, PR-2a) unaffected. |

## Files Changed (PR-2b)

| File | Action | Lines |
|------|--------|-------|
| `src/app/api/orders/[orderId]/request-cancellation/__tests__/route.test.ts` | Created | ~310 lines |
| `src/app/api/orders/[orderId]/request-cancellation/route.ts` | Modified (slimmed) | 157 → 66 lines (91- lines) |

**Total changed lines**: ~335 (size:exception approved if over 400)

## Deviations from Design
None — implementation matches design byte-for-byte. Route follows the transport-only pattern exactly. 500-char validation lives in route BEFORE calling service (per design). CANCELLABLE_STATUSES deleted atomically from route. All Spanish strings byte-identical except the NEW 500-char cap message (which matches the design verbatim).

## Issues Found
None.

## Remaining Tasks
- [x] B2.1 RED — cancellation route test (GREENFIELD) ✅ done
- [x] B2.2 GREEN — cancellation route slim + 500-char cap (only external behavior change) ✅ done
- [ ] V1 — `npx vitest run --maxWorkers=2` full suite green; grep route files assert ZERO references to `fetch`, `normalizeStrapiOrder`, `CANCELLABLE_STATUSES` (cancellation route); routes contain only transport + validation (cancellation).
- [ ] V2 — confirm byte-identity of 200/401/404/502 statuses + all Spanish strings + response shapes for BOTH routes match pre-refactor EXCEPT the NEW 500-char reason cap.

## W-01 Fix: X-Trace-Id Test Coverage Gap [TEST-ONLY]

**What**: Added 14 X-Trace-Id response header assertions to `src/app/api/orders/[orderId]/__tests__/route.test.ts` to close the test coverage gap flagged in verify-report W-01.

**Why**: The verify phase found that the [orderId] route test had only 1 X-Trace-Id assertion (on requireUser fetch at line 455) and ZERO `response.headers.get('X-Trace-Id')` assertions on the 200/404/500/502 responses. The cancellation route test has 30 such assertions. The CODE was correct (route sets X-Trace-Id on every response), but the test coverage gap meant a regression removing X-Trace-Id from success/error responses wouldn't be caught.

**Where**: 
- Modified: `src/app/api/orders/[orderId]/__tests__/route.test.ts` (test-only, no application code changes)
- Updated service error mocks to include `headers: { 'X-Trace-Id': 'test-trace-id' }` to match the real service behavior

**Changes**:
- Added `expect(response.headers.get('X-Trace-Id')).toBeTruthy()` to 14 test cases:
  - 2 × 200 success responses (lines 219, 285)
  - 7 × 404 responses (lines 126, 162, 428, 513, 552, 674, 723)
  - 3 × 502 responses (lines 311, 343, 358)
  - 2 × 401 responses (lines 876, 886)
- Updated 9 service error mocks to include X-Trace-Id header (matching cancellation test pattern)

**Test Results**:
- Focused test: `npx vitest run --maxWorkers=2 src/app/api/orders/[orderId]/__tests__/route.test.ts` → 19/19 passed
- Full suite: `npx vitest run --maxWorkers=2 src/app/api/orders/ src/features/orders/` → 213/213 passed (10 files)

**Rollback Boundary**: `git revert <commit>` removes the 14 X-Trace-Id assertions and restores the 9 service mocks to their pre-fix state. All application code (route.ts, service files) unchanged.

**Assertions Added**: 14 response header assertions + 9 mock header updates = 23 total changes

**Status**: ✅ Complete. Test coverage gap closed. No behavior changes.
