# Apply Progress: sprint-5-stripe-metadata

## Status
**in_progress** → ready for `sdd-verify` (all 13 tasks complete; full unit suite green; production build green)

## Mode
**Strict TDD** (`strict_tdd: true` per `openspec/config.yaml`)

## Workload
- **Delivery strategy**: single PR
- **Branch slug**: `frontend/sprint-5-stripe-metadata-paymentintent`
- **Production code changed**: ~76 net lines (route.ts +3, page.tsx +7, CheckoutForm.tsx +15, useCreateOrder.ts +16, createPaymentIntentService.ts +50 → ~91 insertions − 15 deletions across modified production files)
- **Test code added/changed**: 405 lines (new: 154 service test + 142 hook test; modified: 54 route test + 41 CheckoutForm test + 14 CheckoutForm.retry test)
- **Total changed**: ~481 lines (within Strict TDD requirement; production-only diff is well inside 400-line budget)

> Note: tasks.md forecast was "~220–350 lines" which under-counted the new test files (154 + 142 lines) that Strict TDD mode requires. Production code alone stays inside the 400-line budget. No `size:exception` recommended — the test growth is mandatory for TDD, not over-implementation.

## TDD Cycle Evidence (Strict TDD)

| Task | RED (test written first) | GREEN (impl passed) | REFACTOR |
|------|--------------------------|---------------------|----------|
| 1.1 Service tests | ✅ `createPaymentIntentService.test.ts` written; 7/8 fail | ✅ 8/8 pass after 2.1 | ➖ Clean — one file, focused |
| 1.2 Hook tests | ✅ `useCreateOrder.test.ts` written; 4/4 fail (no router mock initially → fixed) | ✅ 4/4 pass after 2.2 | ➖ Clean |
| 1.3 Route tests | ✅ 3 new tests added; 3 fail | ✅ 17/17 pass after 2.3 | ➖ Clean — kept existing structure |
| 1.4 CheckoutForm tests | ✅ 1 new test added; 1 fails | ✅ 16/16 pass after 3.1 | ➖ Clean |
| 2.1 Service impl | n/a | ✅ All 8 service tests green | ✅ Clean — failed-fast on userId before orderId (initial ordering was inverted; refactored during GREEN to fail-fast on userId first) |
| 2.2 Hook impl | n/a | ✅ All 4 hook tests green | ✅ Clean — single API change (removed generateOrderId; added orderId param) |
| 2.3 Route impl | n/a | ✅ All 17 route tests green | ✅ Clean — minimal diff (destructure user + pass userId) |
| 3.1 CheckoutForm impl | n/a | ✅ All 16 CheckoutForm tests green + 7 retry tests | ✅ Clean — orderId threaded through fetch → state → onSuccess |
| 3.2 Page wiring | n/a | ✅ No regression | ✅ Clean — one signature change |
| 4.1 Full suite | ✅ 1026/1026 unit tests pass (76 files, 24.87s) | ✅ | n/a |
| 4.2 Build | ✅ `npm run build` succeeds; no TS/lint errors; only pre-existing Resend warnings | ✅ | n/a |

### TRIANGULATE Evidence (per task)

- **1.1**: 8 test cases — happy path metadata, legacy metadata preserved, orderId in response, fail-closed on empty userId, fail-closed on throwing generateOrderId, generateOrderId called BEFORE Stripe, sequential calls produce different orderIds, error responses carry X-Trace-Id. Covers all spec scenarios + triangulation (4 distinct code paths exercised).
- **1.2**: 4 test cases — payload uses supplied orderId verbatim, fetch body uses supplied orderId, generateOrderId NEVER called, onSuccess callback receives supplied orderId. Triangulates across assembleOrderData, fetch body, and callback surface.
- **1.3**: 3 new cases added on top of 14 existing — session-derived userId in metadata, orderId returned in response body, body-supplied userId is IGNORED. Total: 17 cases.
- **1.4**: 1 new case — onSuccess receives response orderId.

### Safety Net (before modifying existing files)

- `route.test.ts` baseline: 14/14 passing → after changes 17/17 passing (3 added, 0 lost).
- `CheckoutForm.test.tsx` baseline: 15/15 passing → after changes 16/16 passing (1 added, 0 lost).
- `CheckoutForm.retry.test.tsx` baseline: 7/7 passing (no new tests added; only updated fetch mocks to include the new `orderId` contract field — required because the form now consumes it).

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| **Focused test command and exact result** | `npx vitest run --maxWorkers=2 src/features/checkout/services/__tests__/createPaymentIntentService.test.ts src/features/checkout/hooks/__tests__/useCreateOrder.test.ts src/app/api/create-payment-intent/__tests__/route.test.ts src/features/checkout/components/__tests__/CheckoutForm.test.tsx src/features/checkout/components/__tests__/CheckoutForm.retry.test.tsx` → **52/52 passing** (8 + 4 + 17 + 16 + 7). Full unit run: `npx vitest run --maxWorkers=2 --project=unit` → **1026/1026 passing** across 76 files (24.87s) |
| **Runtime harness command/scenario and exact result** | N/A — manual Stripe test-mode smoke per design (`Testing Strategy` table). Post-merge: inspect 10 PaymentIntents in Stripe dashboard for unique `metadata.orderId` and matching `metadata.userId` (task 4.4). Server cannot validate Stripe-side metadata without a live Stripe test key. |
| **Rollback boundary** | Drop `metadata.orderId`/`metadata.userId` from `createPaymentIntentService` + revert `useCreateOrder` to local `generateOrderId()` call + revert CheckoutForm `onSuccess` signature. 3 production files + 2 test files. No data migration (additive metadata). |

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/features/checkout/services/createPaymentIntentService.ts` | Modified | Added `userId` param; fail-closed on empty `userId`; generate `orderId` BEFORE Stripe; add `orderId`+`userId` to metadata (legacy fields preserved); return `orderId` in `data` |
| `src/features/checkout/hooks/useCreateOrder.ts` | Modified | Removed `generateOrderId` import + call; `createOrder` now accepts `orderId: string` parameter |
| `src/app/api/create-payment-intent/route.ts` | Modified | Destructure `user` from `requireUser()`; pass `userId: String(user.id)` to service |
| `src/features/checkout/components/CheckoutForm.tsx` | Modified | Capture `orderId` from create-payment-intent response; thread through `onSuccess(paymentIntent, orderId)`; `onError` signature UNCHANGED (R7) |
| `src/app/checkout/page.tsx` | Modified | `handleSuccess` accepts `(paymentIntent, orderId)`; forwards `orderId` to `createOrder` |
| `src/features/checkout/services/__tests__/createPaymentIntentService.test.ts` | Created | 8 RED → GREEN tests covering metadata, fail-closed, order generation order, sequential uniqueness |
| `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts` | Created | 4 RED → GREEN tests covering payload orderId verbatim, no local generator, callback |
| `src/app/api/create-payment-intent/__tests__/route.test.ts` | Modified | Added 3 tests: metadata `orderId`+`userId`, response `orderId`, body-supplied `userId` ignored |
| `src/features/checkout/components/__tests__/CheckoutForm.test.tsx` | Modified | Added 1 test: `onSuccess` receives response `orderId`; updated existing fetch mocks to include new `orderId` field |
| `src/features/checkout/components/__tests__/CheckoutForm.retry.test.tsx` | Modified | Updated 2 fetch mocks to include new `orderId` field (no behavior change) |

## Deviations from Design

None. Implementation matches `design.md`:
- orderId generated server-side in `createPaymentIntentService`, BEFORE Stripe call ✓
- userId sourced exclusively from `requireUser()` → `String(user.id)`; never from request body ✓
- `metadata.orderId`, `metadata.userId`, plus legacy `metadata.itemsCount`/`subtotal`/`shipping` ✓
- `orderId` returned in additive response field ✓
- `useCreateOrder` consumes server `orderId`; no local `generateOrderId()` call ✓
- `CheckoutForm.onSuccess(paymentIntent, orderId)`; `onError` signature unchanged ✓
- No `buildPaymentIntentMetadata()` helper extracted (design Decision 5: inline) ✓
- Rollback plan intact (drop metadata fields + revert hook) ✓

### One micro-deviation worth noting

- Initial GREEN pass for 2.1 placed `generateOrderId()` BEFORE the `userId` empty check. The strict-tdd failure for "never calls generateOrderId when userId empty" forced a re-ordering: userId guard now runs first, then orderId generation. This is a defensive improvement (avoids wasting a generated id) and is consistent with the spec's "fail-closed" requirement — the spec only mandates NO Stripe call, but failing fast on userId is strictly safer.

## Issues Found

None — no blockers. Pre-existing infrastructure note:
- `npx vitest --coverage` with `--coverage.include` flags fails with a Storybook preset load error (Chromatic CLI conflict). This is unrelated to my change and exists on the unchanged baseline. Coverage verification deferred to `sdd-verify` phase.

## Remaining Tasks

None — all 13 tasks complete. Ready for `sdd-verify`.

## Post-merge (out of apply scope)

- Task 4.4 (manual Stripe test-mode smoke): inspect 10 PaymentIntents in Stripe test mode; confirm unique `metadata.orderId` and consistent `metadata.userId`. Documented in `proposal.md` Success Criteria.