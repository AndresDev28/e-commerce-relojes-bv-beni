# Exploration: follow-ups/sprint-5-stripe-upsert/F8-use-create-order-resilience

## Scope (user-confirmed)

Two complementary resilience fixes inside `src/features/checkout/hooks/useCreateOrder.ts`:

1. **Catch leak fix** — close an AGENT.md:51 violation in the outer `try/catch` of `createOrder` (interpolates raw `error.message` into UI-facing `orderError`).
2. **Retry with backoff** — defence-in-depth for transient network/5xx failures on the UPSERT PUT, per backend roadmap gap #3.

The user originally noted "requestCancellation.ts" in the backlog, but no such file exists. The intent appears to have been the resilience pair (catch leak + retry), not a separate helper.

## Current State

### The catch leak — `src/features/checkout/hooks/useCreateOrder.ts:127-148`

```ts
const createOrder = async (
  paymentIntent: PaymentIntent,
  cartItems: CartItem[],
  orderId: string
) => {
  try {
    setIsCreatingOrder(true)
    setOrderError(null)
    await doCreateOrder(paymentIntent, cartItems, orderId)
  } catch (error) {
    // Defensive net only: the UPSERT path maps every known failure through
    // `checkoutOrderErrors` and never throws back to this handler.
    const errorMsg =
      error instanceof Error ? error.message : 'Error al crear la orden'
    setOrderError(
      `Tu pago fue procesado, pero hubo un problema al registrar tu pedido: ${errorMsg}. ` +
        `Por favor, contacta con soporte indicando tu ID de pago: ${paymentIntent.id}`
    )
  } finally {
    setIsCreatingOrder(false)
  }
}
```

The string `${errorMsg}` is a raw `Error.message` interpolated into the user-facing banner. `error.message` for client-side throws can include path segments, fetch internals, JSON parse fragments — anything the underlying `fetch`/`AbortController`/`JSON.parse` chain happened to put there. AGENT.md:51 forbids this; F4 fixed the same pattern in `CheckoutForm.tsx` (PR #141) but the fix was not extended to `useCreateOrder`.

The mapper already exposes the right fallback copy at `checkoutOrderErrors.ts:40-43`:

```ts
fallback: (pi?: string) =>
  pi
    ? `Tu pago fue procesado, pero hubo un problema al registrar tu pedido. Por favor, contacta con soporte indicando tu ID de pago: ${pi}`
    : 'Tu pago fue procesado, pero hubo un problema al registrar tu pedido. Por favor, contacta con soporte.',
```

And `useCreateOrder.ts:48-53` (no-user branch) and `:98-104` (transport-fail branch) already use `checkoutOrderErrors(0, null, { paymentIntentId })` to set `orderError`. The outer catch (line 136-144) is the only path that bypasses the mapper.

### Existing test coverage of the catch branch — `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts`

`useCreateOrder.test.ts` has 9 sections (S3.1-S3.6 + S-MOD.*). The outer catch branch (line 136-144) is **not directly exercised** by any test:

- S3.1 (no user → mapper fallback, line 212-215) covers the no-user path. It happens to assert the same string the outer catch is supposed to produce, but it does NOT verify that an error thrown synchronously by `doCreateOrder` does not leak `error.message`.
- S3.3-S3.6 cover in-path mappings (400/403/409) where `doCreateOrder` does NOT throw — it sets `orderError` and returns. The outer `catch` is unreachable in those tests because there is no synchronous throw.
- There is no test that injects a thrown error into `doCreateOrder` (e.g. via a thrown property access on `mockUpsertResponse`, or via `fetch` throwing on the first call).

Coverage gap confirmed: the outer catch is reachable in production but not pinned by any test. After F8 lands, both the no-leak invariant AND the retry-exhausted path must be tested.

### Backend retry precedent — `src/lib/stripe/retryHandler.ts` and `errorHandler.ts`

`src/lib/stripe/retryHandler.ts` and `src/lib/stripe/errorHandler.ts` already implement a 3-attempt retry loop with exponential backoff for Stripe API calls (`paymentIntents.create`, `paymentIntents.confirm`, etc.). They are Stripe-specific (`Retry-After` header parsing, Stripe SDK error codes). They are NOT a generic fetch retry helper.

The codebase has no general-purpose `withRetry(fetch, opts)` utility today. Two options exist:

1. **Inline retry in `useCreateOrder`** — keep the retry policy scoped to the checkout flow; no new shared utility.
2. **Introduce `src/lib/http/withRetry.ts`** — a small generic helper that `useCreateOrder` and `CheckoutForm` (later) can both consume. Lower duplication, slightly broader surface to test.

Given that the only concrete consumer today is `useCreateOrder` and the retry policy is bounded (3 attempts, 500 ms base, 5xx/network only — no `Retry-After`), option 1 is the lower-risk starting point. Option 2 is a follow-up once a second consumer exists.

### Backend roadmap gap

`../e-commerce-relojes-bv-beni-api/docs/roadmapToProduction.md`:

- Gap #3 (MEDIUM): "`useCreateOrder` no tiene retry logic. Si falla POST a `/api/orders` tras pago exitoso, el usuario ve error con instrucción de contactar soporte. El pago quedó cobrado, la orden no quedó guardada, no hay cola ni webhook reconciliador. | Mala UX en fallos de red transitorios"
- Recommendation #4: "Retry con backoff en `useCreateOrder` (3 intentos). Defensa en profundidad mientras el webhook del #1 tarda en llegar."

The backend expects the frontend to absorb transient failures. The backend's own order endpoint (`upsertOrderService`) is idempotent on `orderId` (F4 design D-lock) — the same PUT body re-sent with the same `orderId` produces the same outcome. That makes frontend retry safe at the protocol level.

### Consumer surface — `src/app/checkout/page.tsx`

`page.tsx:35` consumes `useCreateOrder({ clearCart })` (no `onSuccess`). It uses only three return values: `createOrder`, `isCreatingOrder`, `orderError`. No public-API change is required to add retry — `isCreatingOrder` stays `true` across retries (no flicker), `orderError` only sets on final failure, `clearCart` only fires on final 2xx. The page's existing redirect-on-empty-cart effect (`page.tsx:55-58`) is unaffected.

## Affected Areas

| File | Action | Why |
|------|--------|-----|
| `src/features/checkout/hooks/useCreateOrder.ts` | Modify | Replace raw `${errorMsg}` with mapper call (line 142); wrap the UPSERT PUT in a retry loop; preserve D-lock wire body, rotate `X-Trace-Id` per attempt |
| `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts` | Modify | Add catch-leak + retry tests; ensure existing 9 sections still pass |
| `openspec/specs/checkout-error-display/spec.md` | Modify | Add S-MOD.8 (no raw leak in outer catch) + S-RET.1..S-RET.4 (retry trigger / max attempts / no-retry-on-409 / D-lock preserved across retries) scenarios |
| `openspec/changes/archive/2026-09-21-follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping/design.md` | Reference only | Read precedent for the AGENT.md:51 fix pattern (F4) |

No backend change implied (the retry is a frontend resilience layer; the backend is already idempotent on `orderId`).

## Approaches Evaluated

### Approach 1 — Inline retry in `useCreateOrder.ts` (RECOMMENDED)

Add the retry loop as an internal helper inside `useCreateOrder.ts` (or a small private function in the same file). Three attempts, 500 ms base, exponential backoff (500 ms / 1000 ms). Trigger table:

| Outcome | Retry? | Why |
|---------|--------|-----|
| `fetch` throws (network, abort) | **yes** | transient |
| 5xx (500, 502, 503, 504) | **yes** | transient |
| 4xx (400, 401, 403, 404) | **no** | terminal — mapper handles it |
| 409 | **no** | F4 invariant: 409 is post-convergence, do not retry |
| 2xx | **no** | success |

Pros:
- Bounded scope, no new shared module
- Uses the existing `checkoutOrderErrors` mapper unchanged
- Reuses `newTraceId()` per attempt (A-4 invariant preserved)
- D-lock wire body re-sent unchanged per attempt (F7 invariant preserved)
- `isCreatingOrder` semantics intact — no UI flicker

Cons:
- The retry logic is not reusable. A future consumer (e.g. `CheckoutForm`) would duplicate it.

### Approach 2 — Extract `withRetry` to `src/lib/http/`

Move the retry logic to a shared `src/lib/http/withRetry.ts` helper. `useCreateOrder` and (eventually) `CheckoutForm` consume it.

Pros:
- Reusable
- Easier to unit-test in isolation

Cons:
- New shared module surface
- No second consumer today — premature extraction
- Adds an abstraction layer that needs its own tests

**Recommendation: Approach 1.** The retry is small (~15 LOC), localised, and the second consumer case (CheckoutForm) is not yet a requirement. Extract later when a real second consumer exists. (Recorded as a follow-up observation, not blocking.)

### Approach 3 — Skip retry, fix only catch leak

Just close the AGENT.md:51 violation. Defer retry to a follow-up.

Pros:
- Smallest possible diff
- Aligns with F4 scope

Cons:
- Leaves backend gap #3 unaddressed — the user explicitly opted for B (catch + retry), so this misses user intent.

**Recommendation: not chosen.** User-confirmed scope is catch + retry.

## Risks

- **WARNING — Retry timing in CI**: a 3-attempt retry on transient 5xx adds up to 1500 ms of backoff plus three HTTP round-trips. The triple-gate is `vitest`, not Playwright, so unit tests are not affected. Playwright e2e CI is gated by the 2-min budget on the e2e job; the retry only fires on the UPSERT PUT (one test), not on the catalog/session/payment mocks. Worst case for the e2e lane is +2 s. Acceptable.
- **WARNING — D-lock invariant across retries**: F4 design and F7 design both require that the same `orderId` re-sent in the wire path is treated idempotently. The retry MUST re-send the same `wireBody` (same items, same paymentIntentId, same totals) and same `orderId` path param. Only `X-Trace-Id` rotates. Mitigated by reading `assembleOrderData` once before the loop and capturing the body in a closure.
- **WARNING — `clearCart` and `onSuccess` MUST NOT fire mid-retry**: they only fire after the final 2xx. Tests must pin this. The existing S3.2 tests cover the success path; new tests must cover "retry succeeds on attempt 2 → clearCart fires exactly once, onSuccess fires exactly once with the server orderId".
- **SUGGESTION — Pre-existing e2e flake baseline**: F7/F4 evidence notes `checkout-order-upsert.spec.ts` has known cart-priming flakes on Firefox. F8 does not change that. Disclosed in the apply-progress carry-forward.
- **SUGGESTION — Future extraction to `withRetry`**: when a second checkout flow needs retry (e.g. payment-intent creation in `CheckoutForm`), extract the inline helper into `src/lib/http/withRetry.ts`. This is a follow-up observation, not F8 scope.

## Recommendation

Fix both:

1. **Catch leak fix** in `useCreateOrder.ts:136-144`: replace the manual string interpolation with `setOrderError(checkoutOrderErrors(0, null, { paymentIntentId: paymentIntent.id }))`. The catch becomes a true defensive net that never produces different copy from the transport-fail branch (line 98-104).
2. **Retry with backoff** inline in the same hook: 3 attempts, 500 ms base, exponential. Trigger only on transient outcomes (network throw, 5xx). 409 is terminal (F4 invariant) and never retried. Re-send the same `wireBody`; rotate `X-Trace-Id` per attempt.

Tests to add:
- Catch-leak: a thrown error never produces a banner containing `error.message` substrings (assert via `not.toContain` for known dangerous substrings — fetch URL, stack line numbers, file paths).
- Retry-1-then-success: transient 500 on first attempt, 200 on second → `orderError` is null, `clearCart`/`onSuccess` fire exactly once.
- Retry-exhausted: three 500s → `orderError` is the fallback copy, no `error.message` substring, `isCreatingOrder` is false.
- Retry-not-on-409: a single 409 → no second attempt, the conflict copy appears immediately.
- Retry-not-on-4xx: a single 400 → no second attempt, the validation copy appears immediately.
- Trace-ID rotation: each attempt's fetch sees a different `X-Trace-Id`.

Estimated scope: ~15-25 LOC in `useCreateOrder.ts`, ~80-120 LOC in tests. Under the 400-line budget; single PR.

## Ready for Proposal

Yes. The proposal should commit to:
- Inline retry (Approach 1) — bounded scope, follow-up extraction documented
- 3 attempts, 500 ms base, exponential backoff
- Trigger table exactly as documented in this exploration
- D-lock wire body + per-attempt trace-ID rotation preserved
- New scenarios added to the delta spec at `openspec/changes/.../specs/checkout-error-display/spec.md`
- The catch leak becomes a copy-paste of the transport-fail branch mapper call — defensible as "the catch cannot produce a different banner than the in-path mapper"
