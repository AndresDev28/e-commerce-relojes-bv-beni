# Apply Progress: DEBT-03 — Orders malformed-but-200 → service 502

## Status
**COMPLETE** — All tasks implemented and verified.

## Completed Tasks
- [x] A1.1 RED — getOrderByIdService malformed-200 test
- [x] A2.1 GREEN — getOrderByIdService try/catch wrapper
- [x] B1.1 RED — requestCancellationService malformed-200 test
- [x] B1.2 GREEN — requestCancellationService try/catch wrapper
- [x] V1 — Full orders services suite: 34/34 pass
- [x] V2 — tsc --noEmit: clean
- [x] V3 — Guardrails verified

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| A1.1 | `getOrderByIdService.test.ts` | Unit | ✅ 14/14 | ✅ Written | ✅ Passed (15/15) | ✅ 2 cases (single null + [null, valid]) | ➖ None needed |
| A2.1 | `getOrderByIdService.test.ts` | Unit | ✅ 14/14 | ✅ (A1.1) | ✅ Passed (15/15) | ✅ Co-located edge | ➖ None needed |
| B1.1 | `requestCancellationService.test.ts` | Unit | ✅ 18/18 | ✅ Written | ✅ Passed (19/19) | ✅ 2 cases (single null + [null, valid]) | ➖ None needed |
| B1.2 | `requestCancellationService.test.ts` | Unit | ✅ 18/18 | ✅ (B1.1) | ✅ Passed (19/19) | ✅ Co-located edge | ➖ None needed |

## Work Unit Evidence

| Work Unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|-----------|---------------------------------------|---------------------------------------------------|-------------------|
| Domain A (getOrderByIdService) | `npx vitest run --maxWorkers=2 src/features/orders/services/__tests__/getOrderByIdService.test.ts` → 15/15 pass | `npx tsc --noEmit` → exit 0 (clean) | Revert try/catch in `getOrderByIdService.ts` L66-103 + remove test scenario L143-207 |
| Domain B (requestCancellationService) | `npx vitest run --maxWorkers=2 src/features/orders/services/__tests__/requestCancellationService.test.ts` → 19/19 pass | `npx tsc --noEmit` → exit 0 (clean) | Revert try/catch in `requestCancellationService.ts` L74-136 + hoisted orderData L74 + remove test scenario L300-363 |

## Test Summary
- **Total tests written**: 2 new scenarios (1 per suite)
- **Total tests passing**: 34 (15 + 19)
- **Layers used**: Unit (34)
- **Approval tests** (refactoring): None — additive-only change
- **Pure functions created**: 0 (no new functions)

## Commits
1. `e371c8c` — test(orders): RED malformed-200 → 502 for getOrderByIdService
2. `62cd47f` — fix(orders): catch normalizeStrapiOrder throw → service 502 in getOrderByIdService
3. `8f64800` — test(orders): RED malformed-200 → 502 for requestCancellationService
4. `bc7a2c6` — fix(orders): catch normalizeStrapiOrder throw → service 502 in requestCancellationService

## Files Changed
| File | Action | Lines |
|------|--------|-------|
| `src/features/orders/services/getOrderByIdService.ts` | Modified | +30 -21 |
| `src/features/orders/services/requestCancellationService.ts` | Modified | +57 -40 |
| `src/features/orders/services/__tests__/getOrderByIdService.test.ts` | Modified | +64 |
| `src/features/orders/services/__tests__/requestCancellationService.test.ts` | Modified | +64 |

## Guardrails Held
✅ Catch boundary starts AFTER existing json-parse catch (not wrapping `await response.json()`)
✅ No helper extraction — inline 502 literal reused verbatim
✅ Cancellation: catch ends BEFORE PUT fetch (L132)
✅ `catch (err: unknown)` — body only returns 502, no logging
✅ `normalizeStrapiOrder` NOT made null-safe (out of scope)
✅ Exactly ONE new scenario per suite + co-located edge case
✅ Existing 502 scenarios byte-identical and passing
✅ No edits to PUT-leg 502 catches in cancellation service

## Deviations from Design
None — implementation matches design exactly.

One minor adaptation: In `requestCancellationService.ts`, the `orderData` variable declaration was hoisted outside the try block (L74) so it remains accessible for the PUT-leg `documentId` construction at L139. This is a scoping necessity, not a design deviation — the catch boundary still wraps L74-L127 as specified.

## Issues Found
None.

## Next Steps
Ready for verify phase (sdd-verify).
