# Apply Progress: orders-services-refactor

## Current State
- **Change**: orders-services-refactor
- **Slice**: PR-1b (A2) — stacked on PR-1a (8e0250f)
- **Status**: success
- **Mode**: Strict TDD
- **Commit**: `02e0b58`
- **Delivery**: size:exception approved (~226 changed lines)
- **Chain strategy**: stacked-to-main

## Completed Tasks

### A1.1 RED — Service test written (file missing) [PR-1a]
- **Test file**: `src/features/orders/services/__tests__/getOrderByIdService.test.ts`
- **Tests**: 14 tests covering URL/headers, 502 (3 scenarios), 404 IDOR (2 scenarios), 404 not-found (2 scenarios), 200 success (2 scenarios), X-Trace-Id (3 scenarios)
- **RED result**: Failed as expected — `Error: Failed to resolve import "../getOrderByIdService"`
- **Command**: `npx vitest run --maxWorkers=2 src/features/orders/services/__tests__/getOrderByIdService.test.ts`

### A1.2 GREEN — Service implemented + barrel export [PR-1a]
- **Service file**: `src/features/orders/services/getOrderByIdService.ts`
- **Barrel**: `src/features/orders/index.ts` — added `export { getOrderByIdService } from './services/getOrderByIdService'`
- **GREEN result**: 14/14 tests pass
- **Route untouched**: `[orderId]/route.ts` NOT modified (A2 is next slice)
- **Existing route suite**: 19/19 tests still pass (no regression)
- **Commit**: `8e0250f`

### A2 REFACTOR — Route slimmed + 878-line suite re-anchored [PR-1b]
- **Route file**: `src/app/api/orders/[orderId]/route.ts` — slimmed from 98 to 34 lines
- **Route now**: getTraceId → requireUser → await params → delegate to getOrderByIdService → error passthrough → success with X-Trace-Id → 500 catch
- **Route has ZERO references to**: `fetch`, `normalizeStrapiOrder`, `API_URL`, `OrderLookupResponse`, ownership checks, URL construction
- **Test file**: `src/app/api/orders/[orderId]/__tests__/route.test.ts` — re-anchored from global.fetch to getOrderByIdService mock
- **Mock structure**: `vi.mock('@/features/orders', ...)` with `getOrderByIdService: vi.fn()`; `global.fetch` mocks retained ONLY for `requireUser` (/api/users/me)
- **All 19 original assertions preserved**:
  - 401 (no cookie): "No tienes una sesión activa. Inicia sesión."
  - 401 (invalid token): "Sesión expirada. Inicia sesión de nuevo."
  - 404 (not found): "Pedido no encontrado"
  - 404 (other user): "Pedido no encontrado" (no information disclosure)
  - 404 (non-existent): "Pedido no encontrado"
  - 502 (users/me fail): "No pudimos verificar tu sesión. Inténtalo de nuevo."
  - 502 (orders fail): "No pudimos cargar tu pedido. Inténtalo de nuevo."
  - 502 (network failure): "No pudimos verificar tu sesión. Inténtalo de nuevo."
  - 200 (success): order details with correct shape
  - 200 (complete data): items, subtotal, total verified
  - X-Trace-Id on fetch to /api/users/me (assertion preserved)
  - 404 no information disclosure (response body checked)
  - Malicious patterns: 7 patterns all return 404
  - Brute force: 5 attempts all return 404
  - Deleted user: 502 with generic message
  - Response structure: hasProperty checks for orderId, items, total, orderStatus, createdAt
  - Consistent error structure: 401 and 404 both have {error: string}
- **Fetch-level assertions**: Already owned by service test suite (14 tests from PR-1a) — no migration needed, they were already there
- **GREEN result**: 19/19 route tests pass, 14/14 service tests pass, 171/171 full orders suite pass
- **Commit**: `02e0b58`

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| A1.1 | `services/__tests__/getOrderByIdService.test.ts` | Unit | N/A (new) | ✅ Written (file missing) | ✅ 14/14 passed | ✅ 14 cases (URL, 502×3, 404-IDOR×2, 404-notfound×2, 200×2, X-Trace×3) | ➖ None needed (service is a thin wrapper) |
| A1.2 | same test file | Unit | ✅ 19/19 route suite green | ✅ Written | ✅ 14/14 passed | ➖ Covered by A1.1 triangulation | ➖ None needed |
| A2 | `route.test.ts` + `route.ts` | Unit (refactor) | ✅ 19/19 route + 14/14 service green | N/A (pure refactor — mock target switch, not new behavior) | ✅ 19/19 route + 14/14 service + 171/171 full suite | ➖ All 19 original assertions preserved (byte-identical) | ✅ Route slimmed 98→34 lines, zero forbidden refs |

## Work Unit Evidence

| Evidence | Value |
|----------|-------|
| Focused test command and exact result | `npx vitest run --maxWorkers=2 src/app/api/orders/[orderId]/__tests__/route.test.ts` → 19/19 passed (23ms) |
| Runtime harness command/scenario and exact result | N/A — pure refactor, byte-identical behavior, no runtime boundary changed |
| Rollback boundary | `git revert 02e0b58` restores `src/app/api/orders/[orderId]/route.ts` (98-line inline version) and `src/app/api/orders/[orderId]/__tests__/route.test.ts` (878-line fetch-mocking version). Service from PR-1a (8e0250f) unaffected. |

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `src/app/api/orders/[orderId]/route.ts` | Modified (slimmed) | 98 → 34 lines (-64) |
| `src/app/api/orders/[orderId]/__tests__/route.test.ts` | Modified (re-anchored) | 878 → ~862 lines (mock target switch) |

**Total changed lines**: ~226 (80 insertions + 146 deletions) — size:exception approved

## Deviations from Design
None — implementation matches design byte-for-byte. Route is 34 lines (design said ~25, but readability and proper formatting added a few lines). All Spanish strings byte-identical.

## Issues Found
- Git repository has corrupt openspec objects in the object store (same issue as PR-1a). Commit succeeded after unstaging openspec from index. Openspec files are untracked and intact on disk.

## Remaining Tasks
- [ ] B1.1 RED — requestCancellationService test
- [ ] B1.2 GREEN — requestCancellationService impl + CANCELLABLE_STATUSES relocate
- [ ] B2.1 RED — cancellation route test (GREENFIELD)
- [ ] B2.2 GREEN — cancellation route slim + 500-char cap (only external behavior change)
- [ ] V1/V2 — verification
