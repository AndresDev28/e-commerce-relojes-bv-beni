# Tasks: Slice B (DEBT-05 conductual)

## Summary

Four tasks in a single PR (~150-250 total lines, well under the 400-line review budget). Strict TDD order: Task 1 is mechanical cleanup; Task 2 writes a failing test (RED); Task 3 turns it green; Task 4 verifies the existing `ErrorMessage` test surface. Locked decisions D1-D4 govern scope; no re-opening in the apply phase.

## Locked Decisions

- **D1**: Page-level `<ErrorMessage>` in `src/app/checkout/page.tsx` owns the Stripe error alert. `CheckoutForm`'s inline alert is suppressed AND `onError` must stop re-surfacing the same localized string.
- **D2**: Single PR. ~150–250 lines total. No chaining, no work-unit commits.
- **D3**: retryHandler.ts cleanup OUT of scope.
- **D4**: WU-4.4 = verify existing tests still pass (NO new tests added).

## Chain Strategy

**Single PR, NOT chained.**

The `orders-services-refactor` precedent (PR #62 Slice A → PR #63 Slice B, archived 2026-07-15) stacked mechanical WU-3 before UX WU-4 because both slices were self-contained. Slice B here is a different shape:

- Total estimated lines ~150-250 (well under the 400-line budget; ask-on-risk threshold not hit).
- Both WU-3 and WU-4 touch `src/app/checkout/page.tsx` — splitting across two branches would create merge friction on a single file.
- The 4-commit order (mechanical → RED → GREEN → verify) gives reviewers the same progressive context as chained PRs, inside one branch.
- D2 was locked at the proposal phase, not deferred — no user decision pending.

If the apply phase estimate balloons beyond 250 lines, it MUST surface that to the orchestrator before writing Task 3.

## Review Workload Forecast

| Task | Estimate | Note |
|------|----------|------|
| Task 1: WU-3 provider + JSDoc | ~30-50 lines | Mostly deletions + 7 doc-only JSDoc blocks |
| Task 2: WU-4.1 RED test | ~40-60 lines | Greenfield test file |
| Task 3: WU-4.2 + WU-4.3 page + form | ~60-100 lines | State, render, suppression, JSDoc |
| Task 4: WU-4.4 verification | ~0-5 lines | No code change |
| **Total** | **~130-215 lines** | Design forecast ~150-250 |

- Compared to 400-line budget: **well under** (~33-54%).
- Decision needed before apply: **No** (ask-on-risk threshold not hit).
- Chained PRs recommended: **No** (single PR under budget).

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Task 1: WU-3 Stripe provider consolidation + JSDoc convention

- **Description**: Delete the redundant page-level `<Elements>` wrapper at `src/app/checkout/page.tsx:125-132` plus its supporting imports/state. Layout-level `StripeProviderWrapper` becomes the only Stripe provider for the checkout tree. Prepend a `@remarks` JSDoc block to each of the 7 prop-less pages identified in exploration.

- **Files affected**:
  - `src/app/checkout/page.tsx` — delete line 17 (`loadStripe`), line 19 (`Elements`), line 20 (`getStripePublishableKey`), lines 22-27 (`getStripePromise`), line 37 (`useState(getStripePromise)`), lines 125-132 (`<Elements>` wrapper). Imports collapse to `PaymentIntent` type only.
  - 7 prop-less pages — doc-only JSDoc prepend above each `export default function`:
    - `src/app/page.tsx` (`Home`)
    - `src/app/carrito/page.tsx` (`CartPage`)
    - `src/app/favoritos/page.tsx` (`FavoritesPage`)
    - `src/app/checkout/page.tsx` (`CheckoutPage`)
    - `src/app/(auth)/login/page.tsx` (`LoginPage`)
    - `src/app/(auth)/registro/page.tsx` (`RegisterPage`)
    - `src/app/mi-cuenta/pedidos/page.tsx` (`OrdersPage`)

- **Acceptance criteria**:
  - [x] `src/app/checkout/page.tsx` has no `loadStripe` / `Elements` / `<Elements` / `getStripePublishableKey` (grep gate).
  - [x] `git grep "<Elements" src/` returns only the layout-level `StripeProviderWrapper` import site.
  - [x] Each of the 7 prop-less pages has a `@remarks` JSDoc block above its default export.
  - [x] `npx vitest run --maxWorkers=2 src/components/ui/__tests__/ErrorMessage.test.tsx` passes all 14 existing tests (smoke gate).
  - [x] `npx tsc --noEmit` clean.
  - [x] `src/features/checkout/components/CheckoutForm.tsx` is unchanged in this task.

- **Tests**: no new tests. Existing ErrorMessage tests + tsc as regression gates.

- **Estimated lines**: ~30-50 lines changed (mostly deletions + JSDoc).

## Task 2: WU-4.1 RED test for page-level ErrorMessage

- **Description**: Write a failing test asserting `/checkout` renders a localized `<ErrorMessage>` when `CheckoutForm.onError(localizedMessage)` fires. Lock the contract before any UX code lands.

- **File**: `src/app/checkout/__tests__/page.test.tsx` (CREATE, greenfield).

- **Acceptance criteria**:
  - [x] Test file exists at the specified path.
  - [x] Test mocks `CheckoutForm` via `vi.mock('@/features/checkout', ...)` and captures the `onError` prop.
  - [x] Test invokes `capturedOnError(handleStripeError({ code: 'card_declined', ... }).localizedMessage)`.
  - [x] Test asserts page-level `<ErrorMessage>` renders with the mapped Spanish text via `getByText(...)`.
  - [x] Test asserts raw Stripe text `"Your card was declined."` is absent (`queryByText` returns null).
  - [x] Test does NOT mutate production code.
  - [x] `npx vitest run --maxWorkers=2 src/app/checkout/__tests__/page.test.tsx` reports **FAIL** (RED state). Expected failure: `Unable to find an element with the text: <mapped Spanish text>` because the page still has `handleError = (_error: string) => {}`. Capture and record the failure output in the commit message.

- **Strict TDD gate**: this task MUST be completed and the failure confirmed BEFORE Task 3 begins. The apply phase captures the failing test output and includes it in the Task 2 commit body.

- **Estimated lines**: ~40-60 lines (one greenfield test file).

## Task 3: WU-4.2 + WU-4.3 page-level ErrorMessage + CheckoutForm silent

- **Description**: Implement page-level `paymentError` state and `<ErrorMessage>` rendering. Suppress `CheckoutForm`'s internal inline alert when `onError` is provided. Document `onError` signature per R7; clear `paymentError` at the start of every `handleSubmit` per R8.

- **Files affected**:
  - `src/app/checkout/page.tsx` — replace `handleError = (_error: string) => {}` (line 76) with `useState<string | null>(null)` + setter wrapped in `useCallback`; pass `handleError` (now state setter) to `<CheckoutForm onError={...}>`; render `{paymentError && <ErrorMessage variant="error" message={paymentError} className="mb-6" />}` between breadcrumbs and `<h1>` (line 83); clear `paymentError` at the start of every `handleSuccess`/`handleSubmit` flow (R8).
  - `src/features/checkout/components/CheckoutForm.tsx` — wrap `setErrorMessage(processedError.localizedMessage)` (line 154) and `setErrorSuggestion(suggestion)` (line 156) in an `if (!onError)` guard. The `onError?.(processedError.localizedMessage)` call (line 157) stays unconditional. The inline `<ErrorMessage>` render (lines 199-209) is suppressed via the same `!onError` guard (or removed). Add JSDoc on `CheckoutFormProps.onError` documenting `onError?: (localizedMessage: string) => void` (R7).

- **Acceptance criteria**:
  - [x] The red test from Task 2 now PASSES (GREEN state).
  - [x] `src/features/checkout/components/CheckoutForm.tsx` does NOT render `<ErrorMessage>` when `onError` is provided (`grep "<ErrorMessage" src/features/checkout/components/CheckoutForm.tsx` returns 0 hits in the conditional render path).
  - [x] Page-level `<ErrorMessage>` exposes `role="alert"` and `aria-live="assertive"` (accessibility check — ErrorMessage component sets these by default for `variant="error"`).
  - [x] `paymentError` is cleared at the start of every `handleSubmit` invocation (R8).
  - [x] `CheckoutForm.onError` signature is documented in JSDoc above `CheckoutFormProps` (R7).
  - [x] No regression: existing tests in `src/features/checkout/components/__tests__/` and `src/app/checkout/__tests__/` still pass.
  - [x] No regression: `npx vitest run --maxWorkers=2 src/components/ui/__tests__/ErrorMessage.test.tsx` still passes all 14 tests.

- **Tests**: Task 2 RED test is the primary acceptance. Existing tests are the regression gate.

- **Estimated lines**: ~60-100 lines changed.

## Task 4: WU-4.4 ErrorMessage smoke render verification

- **Description**: Confirm the existing 14 tests in `src/components/ui/__tests__/ErrorMessage.test.tsx` already cover R-CED-2 scenarios. No new tests added (D4). This task is verification-only.

- **Acceptance criteria**:
  - [x] Cross-reference existing tests to R-CED-2 scenarios:
    - "Renders passed message text" → `Basic render > should render error message with text` (lines 8-13).
    - "Default variant exposes alert semantics" → `default error variant` (15-21) + `Accesibilidad > role="alert"` (102-106) + `aria-live="assertive"` (120-127).
    - "Non-error variant exposes status semantics" → `Variants > warning` (34-41) + `info` (43-50) + `Accesibilidad > role="status"` (108-118) + `aria-live="polite"` (129-136).
  - [x] Run `npx vitest run --maxWorkers=2 src/components/ui/__tests__/ErrorMessage.test.tsx` — all 14 tests pass.
  - [x] If any R-CED-2 scenario is uncovered by existing tests, FLAG it as a follow-up (NOT in this slice's scope).

- **Estimated lines**: ~0-5 lines (verification only, no code changes).

## Out of Scope

- `src/lib/stripe/retryHandler.ts` console.log cleanup (D3) — 6 diagnostic logs.
- `useCreateOrder`'s `orderError` banner normalization (`src/app/checkout/page.tsx:87-116`) — cosmetic, separate concern.
- Backend changes in `../e-commerce-relojes-bv-beni-api/`.
- Route guard changes.
- JSDoc lint rule (review-time convention only).
- Orphan `openspec/changes/orders-services-refactor/` active folder cleanup (housekeeping).

## Risks

- **R2** (Low-Med): Provider-instance drift — Task 1's grep gate (`git grep "<Elements" src/`) is the empirical proof.
- **R3** (Low): JSDoc convention drift — review-time only, not enforced.
- **R7** (Low): `onError` callback signature stability — JSDoc enforcement in Task 3.
- **R8** (Low-Med): `paymentError` staleness after successful retry — Task 3's "clear on handleSubmit" gate.
- **R9 (new, task-level)**: Strict TDD discipline — if the apply phase writes Task 3 before Task 2's RED is confirmed and recorded, the test is meaningless. The apply phase MUST capture the failing test output and include it in the Task 2 commit body before any production code in Task 3 lands.

## Dependencies

None external. All artifacts in this change directory. `RootLayout → StripeProviderWrapper` already provides the singleton context (verified in codegraph; Slice A / DEBT-05 unchanged). Slice A merged via PR #77 on 2026-07-23.

## Open Questions

None. D1-D4 cover all exploration open questions.
