# Design: follow-ups/sprint-5-stripe-upsert/F4-friendly-error-mapping

## Technical Approach

A new pure mapper `paymentIntentErrors(status: number, body: unknown): string` in `src/features/checkout/utils/checkoutPaymentErrors.ts` closes the AGENT.md:51 violation at the CheckoutForm payment-intent fetch site. The mapper is wired into `CheckoutForm.tsx` between the fetch failure and the existing `onError` callback, mirroring the proven `handleStripeError` pattern at `CheckoutForm.tsx:166-173`. Status-first branch precedence ensures deterministic Spanish copy for every failure mode (5xx wins, 4xx wins, 0/network wins). The mapper never echoes backend strings — even with saturated body shapes that include raw "Internal Server Error" text — defending against future backend response shape changes.

## Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Strict vs passthrough | **Strict fixed copy** | `STRIPE_ERROR_MESSAGES.api_error` already covers the user-facing 500 message; passthrough would risk leaking any future backend string changes; tests are simpler with deterministic fixed copy |
| 2 | Mapper home | `src/features/checkout/utils/` | Screaming Architecture (mirrors `checkoutOrderErrors.ts` location); feature-scoped utility |
| 3 | Reuse `checkoutOrderErrors` | **No** | Default fallback claims "tu pago fue procesado pero..." which is semantically false before any charge exists (`checkoutOrderErrors.ts:79-81`) |
| 4 | Reuse `mapApiError` | **No** | Its 400 branch at `src/lib/api.ts:44-50` echoes nested Strapi `error.message` (own leak); generic catalog wording inappropriate for payment |
| 5 | Parse failure handling | `.catch(() => undefined)` at `CheckoutForm.tsx:81,84` | Both `.json()` calls can throw; parse failure routes through mapper with status + undefined body, not via raw throw |
| 6 | Status-first branch precedence | 5xx → 4xx → 0/network (status wins) | A 500 with unparseable body must not match the 4xx parse-fallback; status dictates the user-facing copy |
| 7 | Copy register | Neutral tuteo ("verificá", "intentá") | Matches all existing user-facing copy in this repo (`src/lib/api.ts:39-54`, `src/lib/stripe/errorMessages.ts:169-199`); consistent voice |
| 8 | `onError` signature | Unchanged `(localizedMessage: string) => void` | Backward-compatible; the change is WHAT is passed, not HOW |
| 9 | E2E priming | `checkout-order-upsert.spec.ts:113-140` pattern | Proven cart-priming that avoids the #127-era hydration race |

## Data Flow

```
CheckoutForm submit
  └── fetch('/api/create-payment-intent')
        ├── response.ok (2xx) → onSuccess path
        └── !response.ok or fetch throws
              ├── response.json().catch(() => undefined)
              │     ↑ body may be undefined if .json() throws
              └── paymentIntentErrors(response?.status ?? 0, parsedBody ?? undefined)
                    ├── status 5xx → STRIPE_ERROR_MESSAGES.api_error
                    ├── status 4xx → fixed Spanish copy keyed to status
                    ├── status 0/NaN → STRIPE_ERROR_MESSAGES.network_error
                    └── body → ignored (never echoed)
              → onError?.(friendlyMessage)
                    → CheckoutPage: setPaymentError(message)
                    → <ErrorMessage>{message}</ErrorMessage>
                          ↑ user sees Spanish copy, NEVER raw "Internal Server Error"
```

## File-by-File Change List

### `src/features/checkout/utils/checkoutPaymentErrors.ts` (NEW, ~45 lines)

Pure function signature:
```ts
export function paymentIntentErrors(
  status: number,
  body: unknown,
): string
```

Branch table:
| Status range | Return value |
|---|---|
| 500-599 | `STRIPE_ERROR_MESSAGES.api_error` |
| 400 | "No pudimos procesar tu método de pago. Verificá los datos e intentá nuevamente." |
| 401 | "Tu sesión expiró. Iniciá sesión de nuevo." |
| 403 | "No tenés permiso para realizar esta acción." |
| 429 | "Demasiadas peticiones. Esperá un momento e intentá nuevamente." |
| other 4xx | "No pudimos procesar tu método de pago. Intentá nuevamente." |
| 0 / NaN / undefined | `STRIPE_ERROR_MESSAGES.network_error` |
| non-number | `STRIPE_ERROR_MESSAGES.network_error` (defensive) |

Type guards: `typeof status === 'number'`, `Array.isArray(body)`, body is plain object.
**Never** reads `body.error`, `body.message`, or `body.error.message` — defensively proven in S4.1.

Commit: `feat(checkout): add paymentIntentErrors mapper for friendly Spanish errors`

### `src/features/checkout/utils/__tests__/checkoutPaymentErrors.test.ts` (NEW, ~80 lines)

Test cases per AC1-AC4 + defensive no-leak:

| Test | AC | Description |
|---|---|---|
| `returns api_error for 500 with flat error` | AC1 | body `{error: 'Internal Server Error'}` → output equals `STRIPE_ERROR_MESSAGES.api_error` |
| `returns api_error for 500 with nested error.message` | AC1 | body `{error: {message: 'Internal Server Error'}}` → output equals `STRIPE_ERROR_MESSAGES.api_error` |
| `returns api_error for 500 with top-level message` | AC1 | body `{message: 'Internal Server Error'}` → output equals `STRIPE_ERROR_MESSAGES.api_error` |
| `returns api_error for 5xx range` | AC1 | 502, 503, 504 → `STRIPE_ERROR_MESSAGES.api_error` |
| `returns validation copy for 400` | AC2 | body `{error: 'malformed request'}` → Spanish validation fallback, NOT raw text |
| `returns session copy for 401` | AC2 | status 401 → session expired copy |
| `returns permission copy for 403` | AC2 | status 403 → permission copy |
| `returns rate-limit copy for 429` | AC2 | status 429 → rate-limit copy |
| `returns generic 4xx copy for other 4xx` | AC2 | status 418 → generic 4xx fallback |
| `returns network_error for status 0` | AC3 | status 0 → `STRIPE_ERROR_MESSAGES.network_error` |
| `returns network_error for NaN` | AC3 | status NaN → `STRIPE_ERROR_MESSAGES.network_error` |
| `returns network_error for undefined` | AC3 | status undefined → `STRIPE_ERROR_MESSAGES.network_error` |
| `returns network_error for non-number` | AC3 | status `"foo"` → `STRIPE_ERROR_MESSAGES.network_error` |
| `handles undefined body gracefully` | AC4 | body undefined → still returns status-appropriate copy |
| `handles null body gracefully` | AC4 | body null → still returns status-appropriate copy |
| `handles array body gracefully` | AC4 | body `[]` → still returns status-appropriate copy |
| `handles string body gracefully` | AC4 | body `"error"` → still returns status-appropriate copy |
| `does not leak raw Internal Server Error under saturated body` | AC4/AC7 | body with `error: 'Internal Server Error'`, `message: 'Internal Server Error'`, `error.message: 'Internal Server Error'` → output does NOT contain substring 'Internal Server Error' |

Commit: `test(checkout): cover paymentIntentErrors mapper branches + no-leak guarantee`

### `src/features/checkout/components/CheckoutForm.tsx` (MODIFIED, ~15 lines)

Changes at lines 69-97:
- Wrap `response.json()` in `.catch(() => undefined)` (parse failure safety)
- After fetch failure: `const friendly = paymentIntentErrors(response?.status ?? 0, parsedBody ?? undefined); onError?.(friendly)`
- For fetch-throws (network abort): `paymentIntentErrors(0, undefined)` → `onError?.(...)`
- `R7` signature `(localizedMessage: string) => void` unchanged

Pattern mirrored from `CheckoutForm.tsx:166-173`:
```ts
const stripeResult = await stripe.confirmPayment(...)
const friendlyMessage = handleStripeError(stripeResult.error)
onError?.(friendlyMessage)
```

Commit: `fix(checkout): route payment-intent errors through friendly Spanish mapper`

### `src/features/checkout/components/__tests__/CheckoutForm.test.tsx` (MODIFIED, ~30 lines)

Test cases:
- Mock `api/create-payment-intent` returns 500 with `{ error: 'Internal Server Error' }` → submit form → assert `<ErrorMessage>` contains `STRIPE_ERROR_MESSAGES.api_error` AND does NOT contain 'Internal Server Error'
- Mock fetch throws (network failure) → submit form → assert `<ErrorMessage>` contains `STRIPE_ERROR_MESSAGES.network_error`
- Mock `api/create-payment-intent` returns 400 with `{ error: 'malformed request' }` → assert `<ErrorMessage>` contains Spanish validation copy AND does NOT contain 'malformed request'

Commit: `test(checkout): verify CheckoutForm renders friendly Spanish on payment-intent failure`

### `src/features/checkout/index.ts` (MODIFIED, 1 line)

Add `paymentIntentErrors` to public exports alongside `checkoutOrderErrors`:
```ts
export { checkoutOrderErrors, paymentIntentErrors } from './utils/checkoutOrderErrors';
export { paymentIntentErrors as paymentIntentErrors2 } from './utils/checkoutPaymentErrors';
// (or single import + re-export)
```

Commit: `chore(checkout): export paymentIntentErrors from feature public API`

### `tests/e2e/payment-errors.spec.ts` (MODIFIED, ~20 lines)

- Un-skip Test 1 (lines 26-48)
- Prime cart via proven pattern from `checkout-order-upsert.spec.ts:113-140`
- Mock `api/create-payment-intent` with `500 { error: 'Internal Server Error' }`
- Assert Spanish copy visible (`STRIPE_ERROR_MESSAGES.api_error` text in DOM)
- Assert 0 occurrences of `'Internal Server Error'` in DOM
- Leave Test 2 (lines 51-61) skipped — F9 candidate

Commit: `test(e2e): re-enable payment-errors Test 1 with friendly Spanish assertions`

## Test Approach

| Requirement | Test type | File | Coverage |
|---|---|---|---|
| R1 (5xx mapping) | Unit | `checkoutPaymentErrors.test.ts` | 4 cases (flat/nested/top-level/range) |
| R1 (4xx mapping) | Unit | `checkoutPaymentErrors.test.ts` | 5 cases (400/401/403/429/other) |
| R1 (network) | Unit | `checkoutPaymentErrors.test.ts` | 4 cases (0/NaN/undefined/non-number) |
| R1 (parse) | Unit | `checkoutPaymentErrors.test.ts` | 4 cases (undefined/null/array/string) |
| R1 (no-leak) | Unit | `checkoutPaymentErrors.test.ts` | 1 saturated-body defensive case |
| R2 (CheckoutForm 500) | Unit (component) | `CheckoutForm.test.tsx` | 1 case |
| R2 (CheckoutForm network) | Unit (component) | `CheckoutForm.test.tsx` | 1 case |
| R2 (CheckoutForm 400) | Unit (component) | `CheckoutForm.test.tsx` | 1 case |
| R3 (public API) | Implicit | TypeScript compile | All exports resolve |
| R4 (no-leak guarantee) | Unit | `checkoutPaymentErrors.test.ts` | (covered above) |
| R5 (signature preserved) | Compile | TypeScript | Compile-time guarantee |
| R6 (UPSERT isolation) | Regression | `checkoutOrderErrors` tests | Untouched |

E2E Test 1 mirrors proven cart priming from `checkout-order-upsert.spec.ts:113-140`.

Triple gate: `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build`

## AGENT.md Compliance Check

- **AGENT.md:51** (canonical friendly-error rule): R1 + R2 + R4 close this. Verified by AC1.
- **Screaming Architecture**: mapper in `src/features/checkout/utils/` mirrors `checkoutOrderErrors` location.
- **Atomic Design**: no new components; the mapper is a utility.
- **TypeScript interfaces**: mapper signature `paymentIntentErrors(status: number, body: unknown): string` is explicit.
- **Vitest `--maxWorkers=2`**: per AGENT.md + `openspec/config.yaml:13-14`.
- **Conventional commits**: per file, no AI attribution.

## Risks + Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| `.json()` at `CheckoutForm.tsx:81,84` can itself throw | High | `.catch(() => undefined)` + parse fallback, unit-tested via AC4 |
| E2E not in default triple gate (`package.json:10-16`) | Med | Verify phase runs `npm run test:e2e` explicitly; document constraint in verify-report |
| Test 1's old priming (`goto('/checkout')` direct) races cart hydration (#127 note) | Med | Use proven cart priming from `checkout-order-upsert.spec.ts:113-140` |
| Backend response shape change in future could leak | Low | Defensive no-leak unit test (S4.1) + strict copy (no passthrough) |
| `STRIPE_ERROR_MESSAGES.api_error` may not be ideal for non-Stripe 500s | Low | Accept per D1; route-specific 500s already emit Spanish via the BFF; infra-level 500s use Stripe wording as fallback |
| `useCreateOrder.ts:137-143` catch leak surfaces as F8 follow-up | Med | NOT in this PR; tracked in verify-report as a follow-up |

## Out of Scope (Reaffirmation)

Backend error redesign, login/register, error boundaries, toast UX, F8 (useCreateOrder leak), F9 (Test 2 redirect), reusing `checkoutOrderErrors` or `mapApiError`.

## Size Estimate

~191 lines total per proposal; design confirms under 400-line budget → **single PR, Low risk**.

## Open Architectural Decisions

None. Strict fixed-copy closed.
