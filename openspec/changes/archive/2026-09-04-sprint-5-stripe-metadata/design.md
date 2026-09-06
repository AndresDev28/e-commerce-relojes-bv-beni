# Design: Sprint 5 — Stripe PaymentIntent Metadata (orderId + userId)

## Technical Approach

Four-step server-authoritative plumbing, mapping to the spec's 6 requirements:

1. **Route**: destructure `user` from `requireUser()` (discarded today at `route.ts:18` — verified); pass `userId` to the service (Req 3).
2. **Service**: `generateOrderId()` BEFORE `paymentIntents.create`; add `orderId`/`userId` to metadata; fail closed if either missing — no Stripe call (Req 1, 2); return `orderId` in `data` (Req 4).
3. **Client**: `CheckoutForm` captures response `orderId` → `onSuccess` → `page.tsx` → `createOrder`; hook uses it verbatim; local `generateOrderId()` call at `useCreateOrder.ts:38` removed (Req 5).
4. **Errors**: existing Spanish mapping (`checkout-error-display`) untouched; new service errors use the same friendly-Spanish style (Req 6).

## Architecture Decisions

### 1. Where to generate orderId
**Choice**: Server-side in `createPaymentIntentService`, before the Stripe call.
**Alternatives**: Client-side (current); in the route handler.
**Rationale**: Server is source of truth — a tampered client id could collide or be replayed. In the service (not route) the "same id in metadata and response" invariant stays one unit-testable function.

### 2. Where to source userId
**Choice**: Exclusively from `requireUser()` → `String(user.id)`.
**Alternatives**: Request body; client hint with session fallback.
**Rationale**: Anti-spoofing (Req 3, "Client-supplied userId is ignored"). Body type `CreatePaymentIntentBody` stays `{ items?: unknown }` — no userId field added.

### 3. How to surface orderId to the client
**Choice**: Additive `orderId` field in the JSON response, threaded `onSuccess → page → createOrder`.
**Alternatives**: Cookie; separate resolve-by-paymentIntent-id endpoint; re-reading `paymentIntent.metadata.orderId` client-side.
**Rationale**: Additive field = minimal risk; rollback = drop one field. Reading Stripe metadata client-side couples the UI to its layout. **Consequence**: `src/app/checkout/page.tsx` joins the blast radius — codegraph confirms it is the only wiring point between `CheckoutForm.onSuccess` and `createOrder` (proposal table omitted it).

### 4. How to test
**Choice**: RED-GREEN-REFACTOR with vitest; extend `route.test.ts` (reuses `mockCreate`/`createAuthenticatedRequest` fixtures); create missing service + hook unit tests.
**Alternatives**: Playwright e2e for metadata; route-level-only coverage.
**Rationale**: Strict TDD ACTIVE per `openspec/config.yaml`; unit tests isolate fail-closed and id-uniqueness cases the route can't. Command: `npx vitest run --maxWorkers=2` (never raw).

### 5. Extract `buildPaymentIntentMetadata()` helper?
**Choice**: No — inline the object literal.
**Alternatives**: Dedicated helper.
**Rationale**: One producer, five string fields — no DRY benefit. Revisit if Gap #1/#4 add a second producer.

## Data Flow

```
CheckoutForm ──POST {items}──▶ route.ts ──requireUser()──▶ { user, jwtToken }
                                   ▼
        createPaymentIntentService({ jwtToken, traceId, input:{items},
                                     userId: String(user.id) })
             orderId = generateOrderId()          ◀── BEFORE any Stripe call
             guard: orderId && userId, else error + NO Stripe call
                                   ▼
        stripe.paymentIntents.create({ amount, currency:'eur', ...,
          metadata: { orderId, userId, itemsCount, subtotal, shipping } })
                                   ▼
        return { data: { clientSecret, amount, orderId } }   ◀── additive
                                   ▼
CheckoutForm: setServerOrderId(orderId) ─▶ onSuccess(paymentIntent, orderId)
                                   ▼
src/app/checkout/page.tsx ─▶ createOrder(paymentIntent, cartItems, orderId)
                                   ▼
useCreateOrder: assembleOrderData({ orderId, ... }) → POST /api/orders
                (no local generateOrderId)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/checkout/services/createPaymentIntentService.ts` | Modify | `userId` param; pre-Stripe orderId; fail-closed guard; metadata + return `orderId` |
| `src/app/api/create-payment-intent/route.ts` | Modify | Destructure `user`; pass `userId: String(user.id)` |
| `src/features/checkout/hooks/useCreateOrder.ts` | Modify | Drop `generateOrderId` import/call; accept `orderId` |
| `src/features/checkout/components/CheckoutForm.tsx` | Modify | Capture response `orderId`; pass via `onSuccess` |
| `src/app/checkout/page.tsx` | Modify | Forward orderId (wiring omitted from proposal table) |
| `src/app/api/create-payment-intent/__tests__/route.test.ts` | Modify (RED) | metadata + orderId-in-response tests |
| `src/features/checkout/services/__tests__/createPaymentIntentService.test.ts` | Create (RED) | metadata, fail-closed, unique orderIds |
| `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts` | Create (RED) | server orderId consumed; local generator never called |

## Interfaces / Contracts

```ts
createPaymentIntentService(params: {
  jwtToken: string; traceId: string; userId: string              // NEW
  input: CreatePaymentIntentInput
}): Promise<
  | { data: { clientSecret: string; amount: number; orderId: string } } // NEW
  | { error: NextResponse }
>

// Stripe metadata — record<string,string>; existing fields stay stringified
{ orderId: string; userId: string; itemsCount: string; subtotal: string; shipping: string }

createOrder: (paymentIntent: PaymentIntent, cartItems: CartItem[], orderId: string) => Promise<void>
onSuccess?: (paymentIntent: PaymentIntent, orderId: string) => void
// onError signature untouched (R7 frozen contract)
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Service: metadata fields; fail-closed (no Stripe call) on empty userId; distinct orderIds; legacy metadata preserved | Mock `@/lib/stripe/server`; new file |
| Unit | Hook: payload uses passed orderId verbatim | `renderHook` (@testing-library/react 16); mock `@/lib/orders/generateOrderId`, assert never called |
| Unit | CheckoutForm: onSuccess receives response orderId | Extend existing `CheckoutForm.test.tsx` mocks |
| Integration | Route: metadata reaches `mockCreate`; response has orderId; body-supplied userId ignored | Extend `route.test.ts` fixtures |
| E2E | Manual Stripe test mode: 10 PaymentIntents show unique `metadata.orderId` | Post-merge smoke (success criterion) |

**TDD**: RED first — failing tests committed BEFORE implementation; `npx vitest run --maxWorkers=2`.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

- No data migration — response and metadata changes strictly additive.
- No feature flag — legacy PaymentIntents without metadata remain valid in Stripe; future Gap #1 webhook tolerates them.
- Rollback: revert commits (drop metadata fields + orderId plumbing).

## Open Questions

- [ ] None blocking. (`AuthUser.id` is `number` → stringified; confirm backend webhook expects same string form in Gap #1 cycle.)
