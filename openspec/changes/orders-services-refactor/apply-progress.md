# Apply Progress: orders-services-refactor (MERGED — PR-1a + PR-1b + PR-2a)

## Current State
- **Change**: orders-services-refactor
- **Latest slice**: PR-2a (B1.1 + B1.2) — stacked on PR-1b (02e0b58) and artifacts (63b4ab0)
- **Status**: success
- **Mode**: Strict TDD
- **Delivery**: size:exception approved (~421 changed lines for PR-2a)
- **Chain strategy**: stacked-to-main

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

### B1.1 RED [PR-2a]
- **Test file**: `src/features/orders/services/__tests__/requestCancellationService.test.ts`
- **Tests**: 18 tests covering:
  - CANCELLABLE_STATUSES export (1 test)
  - Two-call flow: GET lookup + PUT update URLs, headers, body shape (3 tests)
  - 502 on GET non-ok / network / parse-fail (3 tests)
  - 502 on PUT non-ok / network (2 tests)
  - 404 IDOR non-owner / no user / missing order / different orderId (4 tests)
  - 400 non-cancellable status / double-click cancellation_requested (2 tests)
  - X-Trace-Id on 502 / 404 / 400 errors (3 tests)
- **RED result**: Failed as expected — `Error: Failed to resolve import "../requestCancellationService"`
- **Command**: `npx vitest run --maxWorkers=2 src/features/orders/services/__tests__/requestCancellationService.test.ts`

### B1.2 GREEN [PR-2a]
- **Service file**: `src/features/orders/services/requestCancellationService.ts` (~140 lines)
- **Barrel**: `src/features/orders/index.ts` — added `export { requestCancellationService } from './services/requestCancellationService'`
- **GREEN result**: 18/18 tests pass
- **Cancellation route untouched**: `[orderId]/request-cancellation/route.ts` NOT modified (B2.2 is next slice)
- **Full orders suite**: 189/189 tests pass (9 files) — no regressions
- **CANCELLABLE_STATUSES**: Exported from service file; route still has its own inline copy (atomic deletion in B2.2)

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| A1.1 | `services/__tests__/getOrderByIdService.test.ts` | Unit | N/A (new) | ✅ Written (file missing) | ✅ 14/14 passed | ✅ 14 cases (URL, 502×3, 404-IDOR×2, 404-notfound×2, 200×2, X-Trace×3) | ➖ None needed (service is a thin wrapper) |
| A1.2 | same test file | Unit | ✅ 19/19 route suite green | ✅ Written | ✅ 14/14 passed | ➖ Covered by A1.1 triangulation | ➖ None needed |
| A2 | `route.test.ts` + `route.ts` | Unit (refactor) | ✅ 19/19 route + 14/14 service green | N/A (pure refactor — mock target switch, not new behavior) | ✅ 19/19 route + 14/14 service + 171/171 full suite | ➖ All 19 original assertions preserved (byte-identical) | ✅ Route slimmed 98→34 lines, zero forbidden refs |
| B1.1 | `services/__tests__/requestCancellationService.test.ts` | Unit | ✅ 14/14 service + 19/19 route + 171/171 full suite green | ✅ Written (file missing) | ✅ 18/18 passed | ✅ 18 cases (CANCELLABLE×1, two-call×3, 502×5, 404×4, 400×2, X-Trace×3) | ➖ None needed (service is a thin wrapper) |
| B1.2 | same test file | Unit | ✅ 189/189 full suite green | ✅ Written | ✅ 18/18 passed | ➖ Covered by B1.1 triangulation | ➖ None needed |

## Work Unit Evidence (PR-2a)

| Evidence | Value |
|----------|-------|
| Focused test command and exact result | `npx vitest run --maxWorkers=2 src/features/orders/services/__tests__/requestCancellationService.test.ts` → 18/18 passed (38ms) |
| Full suite command and exact result | `npx vitest run --maxWorkers=2 src/app/api/orders/ src/features/orders/` → 189/189 passed (9 files, 3.54s) |
| Runtime harness command/scenario and exact result | N/A — pure unit, no runtime boundary changed |
| Rollback boundary | `git revert <commit>` removes `src/features/orders/services/requestCancellationService.ts`, `src/features/orders/services/__tests__/requestCancellationService.test.ts`, and the barrel export line. All prior work (PR-1a, PR-1b) unaffected. Cancellation route untouched. |

## Files Changed (PR-2a)

| File | Action | Lines |
|------|--------|-------|
| `src/features/orders/services/requestCancellationService.ts` | Created | ~140 lines |
| `src/features/orders/services/__tests__/requestCancellationService.test.ts` | Created | ~280 lines |
| `src/features/orders/index.ts` | Modified (barrel) | +1 line |

**Total changed lines**: ~421 (size:exception approved)

## Deviations from Design
None — implementation matches design byte-for-byte. Service follows the two-call sequence exactly. CANCELLABLE_STATUSES co-located in service file. Barrel export added. Cancellation route untouched (as specified for this slice).

## Issues Found
None.

## Remaining Tasks
- [ ] B2.1 RED — cancellation route test (GREENFIELD)
- [ ] B2.2 GREEN — cancellation route slim + 500-char cap (only external behavior change)
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
