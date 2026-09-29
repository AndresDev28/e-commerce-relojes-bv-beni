# Proposal: follow-ups/sprint-5-stripe-upsert/F4-friendly-error-mapping

## Intent

`CheckoutForm` passes **raw backend error text** directly to user-facing `<ErrorMessage>`, bypassing the AGENT.md:51 friendly-error mapping rule. This proposal introduces a **dedicated payment-intent error mapper** that always yields friendly Spanish copy before the error reaches the page, and re-enables `payment-errors.spec.ts` Test 1 with inverted assertions (Spanish visible, raw text absent).

User pre-approved direction:
1. **500 wording**: Use `STRIPE_ERROR_MESSAGES.api_error` (consistent with existing Stripe SDK error mapping in CheckoutForm).
2. **Scope**: Narrow — only payment-intent mapping in CheckoutForm. The `useCreateOrder.ts:137-143` catch leak stays as a separate ticket (F8).
3. **Test re-enable**: Only Test 1 in `payment-errors.spec.ts` (payment-intent friendly mapping). Test 2 (unauthenticated redirect) stays skipped (F9).

## Scope

### In Scope

- New mapper `src/features/checkout/utils/checkoutPaymentErrors.ts` — pure function `paymentIntentErrors(status: number, body: unknown): string`
- Rewire `CheckoutForm.tsx` lines 69-97 to use the new mapper; wrap `response.json()` in `.catch(() => undefined)`
- Unit tests for the new mapper (all 4 branches + defensive no-leak)
- Unit tests for `CheckoutForm` updated error handling
- Re-enable Test 1 in `tests/e2e/payment-errors.spec.ts`; rewrite to assert Spanish copy visible + absence of raw text
- Export `paymentIntentErrors` from `src/features/checkout/index.ts`

### Out of Scope

- `useCreateOrder.ts:137-143` catch leak → F8 candidate
- `payment-errors.spec.ts` Test 2 (unauthenticated redirect) → F9 candidate
- Backend error response redesign
- Login/register error flows
- Global error boundaries
- Toast notifications vs inline alert UX decisions
- Reusing `checkoutOrderErrors` (UPSERT-specific, wrong semantics) or `mapApiError` (general, has its own leak in 400 branch)

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `checkout-error-display` — extends the existing "Friendly Error Mapping for Stripe Codes" requirement to cover HTTP/network/parse failures for the payment-intent flow.

## Approach

**Capability delta = 0 new + 1 modified** (frontend only).

### New mapper

`src/features/checkout/utils/checkoutPaymentErrors.ts`:

```ts
export function paymentIntentErrors(
  status: number,
  body: unknown,
): string {
  // 5xx → STRIPE_ERROR_MESSAGES.api_error
  // 4xx → fixed Spanish validation copy
  // 0 (network) → STRIPE_ERROR_MESSAGES.network_error
  // unparseable body → safe Spanish fallback
}
```

- Type guards: `typeof status === 'number'`, `Array.isArray(body)`, body is plain object
- Status 0 / undefined / NaN → network fallback
- 500-599 → `STRIPE_ERROR_MESSAGES.api_error` (Spanish, payment-specific)
- 400-499 → fixed Spanish validation copy
- 401 → session copy
- 403 → permission copy
- 429 → rate-limit copy
- **Never returns raw `body.error` or `body.message` strings** (no passthrough)

### CheckoutForm integration

Mirror the proven Stripe SDK handler pattern at `CheckoutForm.tsx:166-173`:

```ts
const stripeResult = await stripe.confirmPayment(...)
const friendlyMessage = handleStripeError(stripeResult.error)
onError?.(friendlyMessage)
```

For payment-intent fetch (lines 69-97):
- Wrap `response.json()` in `.catch(() => undefined)` (parse failure safety)
- After fetch failure: `const friendly = paymentIntentErrors(response?.status ?? 0, parsedBody ?? undefined); onError?.(friendly)`
- For fetch-throws (network abort): `paymentIntentErrors(0, undefined)` → `onError?.(...)`

### E2E Test 1 re-enable

- Un-skip `payment-errors.spec.ts:26-48`
- Prime cart via proven pattern from `checkout-order-upsert.spec.ts:113-140`
- Mock `api/create-payment-intent` with `500 { error: 'Internal Server Error' }`
- Assert Spanish copy visible (`STRIPE_ERROR_MESSAGES.api_error` text in DOM)
- Assert 0 occurrences of `'Internal Server Error'` in DOM
- Leave Test 2 (lines 51-61) skipped — F9 candidate

### Strict fixed-copy decision

Pre-resolved: **strict fixed copy** (not passthrough). Rationale:
- `STRIPE_ERROR_MESSAGES.api_error` already covers user-facing 500 message
- Passthrough would risk leaking any future backend string changes
- Tests are simpler with deterministic fixed copy
- Backend route-specific Spanish copies (e.g., `INSUFFICIENT_STOCK`) emit server-side correctly; client just needs a safe fallback for infra-level failures

## Affected Files

| File | Action |
|------|--------|
| `src/features/checkout/utils/checkoutPaymentErrors.ts` | Create |
| `src/features/checkout/utils/__tests__/checkoutPaymentErrors.test.ts` | Create |
| `src/features/checkout/components/CheckoutForm.tsx` | Modify (lines 69-97) |
| `src/features/checkout/components/__tests__/CheckoutForm.test.tsx` | Modify |
| `src/features/checkout/index.ts` | Modify (1-line export) |
| `tests/e2e/payment-errors.spec.ts` | Modify (Test 1 only) |

## Delivery

Single PR (~191 lines total, under 400-line budget, Low risk). No chained PR split.

## Acceptance Criteria

1. After `500 { error: 'Internal Server Error' }` from `api/create-payment-intent`, `<ErrorMessage>` shows `STRIPE_ERROR_MESSAGES.api_error` Spanish copy; raw text never in DOM
2. After `400 { error: 'malformed request' }`, mapper returns a Spanish validation message (unit)
3. After fetch throws, mapper returns `STRIPE_ERROR_MESSAGES.network_error` (unit)
4. After `.json()` throws, mapper returns Spanish parse fallback (unit)
5. `payment-errors.spec.ts` Test 1 is live (not skipped) and passes
6. `paymentIntentErrors` exported from `src/features/checkout/index.ts` public API
7. R6 kept-green: existing tests (`useCreateOrder`, `useCheckout`, page tests, `checkout-order-upsert.spec.ts`, `favorites-error-feedback.spec.ts`) pass untouched
8. Triple gate: `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build` all exit 0
