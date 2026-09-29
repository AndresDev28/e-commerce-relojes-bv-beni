# Design: follow-ups/sprint-5-stripe-upsert/F8-use-create-order-resilience

## Technical Approach

This change keeps the resilience logic inline inside `src/features/checkout/hooks/useCreateOrder.ts`, because that file is the actual design site and the only current consumer of this retry contract. The implementation will extend the existing `doCreateOrder` flow at `src/features/checkout/hooks/useCreateOrder.ts:40-125` so the hook assembles the D-lock wire body once (`:62-80`), then reuses that same serialized payload across up to three PUT attempts to `/api/orders/by-order-id/:orderId` (`:84-97`) while rotating `X-Trace-Id` with `newTraceId()` per attempt (`:88-93`, `src/lib/trace.ts:9-25`).

The design also closes the friendly-error leak in the outer defensive catch at `src/features/checkout/hooks/useCreateOrder.ts:136-144` by replacing raw `error.message` interpolation with the same mapper fallback already used by the no-user branch (`:48-53`) and the current transport-failure branch (`:98-104`) through `checkoutOrderErrors(0, null, { paymentIntentId })` from `src/features/checkout/utils/checkoutOrderErrors.ts:83-100`.

This maps directly to the proposal and delta spec:
- Proposal retry contract and trigger table: `openspec/changes/follow-ups-sprint-5-stripe-upsert-F8-use-create-order-resilience/proposal.md:31-43`
- Delta scenarios S-MOD.8 and S-RET.1..S-RET.7: `openspec/changes/follow-ups-sprint-5-stripe-upsert-F8-use-create-order-resilience/specs/checkout-error-display/spec.md:29-98`
- Existing consumer behavior that must stay stable (`isCreatingOrder`, `orderError`, success callbacks): `src/app/checkout/page.tsx:35-37`, `:139-167`, `:223-235`

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Retry placement | Keep retry logic private to `src/features/checkout/hooks/useCreateOrder.ts` near the current fetch block at `:82-116` | Extract a shared `withRetry` helper under `src/lib/http/`; move retry to a second helper module inside checkout | The repo already uses feature-local error mapping in `src/features/checkout/utils/checkoutOrderErrors.ts:1-100`, and the exploration explicitly selected inline retry as lower risk until a second consumer exists (`exploration.md:68-74`, `:101-136`). Adding a shared abstraction now would widen test surface and violate the requested “no new helper modules” rule. |
| Attempt budget and backoff shape | Exactly 3 total attempts with exponential backoff from a 500 ms base | Infinite retry, configurable retry count, linear backoff, immediate replay | The proposal fixes the contract at 3 attempts (`proposal.md:33-41`) and the delta spec caps attempts at 3 (`spec.md:45`) with an exponential backoff base of at least 500 ms (`spec.md:50`). Keeping the numbers local to the hook preserves bounded UX impact and avoids configuration surface for a single consumer. |
| Retry trigger classification | Retry only `fetch` throws and 5xx responses; treat 4xx and 409 as terminal | Retry all non-2xx; retry only throws; retry 409 as eventual convergence | `checkoutOrderErrors` is already the single translation point for 400/403/409 and fallback (`src/features/checkout/utils/checkoutOrderErrors.ts:83-100`). The proposal and spec both require 409 and other 4xx to stay terminal (`proposal.md:35-41`, `spec.md:42-49`, `:66-78`). Retrying those would break the F4 post-convergence invariant already encoded in the current comments at `useCreateOrder.ts:106-109`. |
| Wire body capture | Build `wireBody` once before the retry loop and reuse the same serialized request body and `orderId` path on every attempt | Recompute `assembleOrderData(...)` and rebuild the body inside each iteration | The current hook already computes the order payload once at `src/features/checkout/hooks/useCreateOrder.ts:55-80`. Recomputing per attempt risks drift in items, totals, or payment info if mutable inputs change between awaits. The spec requires byte-for-byte D-lock preservation across retries (`spec.md:46-47`, `:87-92`). |
| Trace correlation | Generate a fresh `X-Trace-Id` per attempt with `newTraceId()` | Reuse one trace ID for the whole retry window | The proposal commits to per-attempt rotation (`proposal.md:31-43`, success criterion `:77`) and `newTraceId()` is the project precedent for generating request identifiers (`src/lib/trace.ts:9-25`). The current fetch already generates one fresh ID per create-order call at `useCreateOrder.ts:88-93`; moving the call inside the retry iteration preserves that precedent across multiple attempts. |
| Defensive catch behavior | Replace raw string interpolation in `createOrder` catch with `checkoutOrderErrors(0, null, { paymentIntentId })` | Keep current interpolation; invent separate fallback copy just for the outer catch | The outer catch at `src/features/checkout/hooks/useCreateOrder.ts:136-144` is the only branch bypassing the mapper, while the no-user and transport-failure branches already use the fallback mapper output (`:48-53`, `:98-104`). The spec now requires byte-identical copy between transport-fail and defensive catch paths (`spec.md:29-35`). |
| Success side-effect timing | `clearCart`, `onSuccess`, and router navigation stay after the final successful 2xx only | Trigger side effects after any successful intermediate attempt marker; clear cart before retry exhaustion resolves | The current success side effects live after the `response.ok` gate at `src/features/checkout/hooks/useCreateOrder.ts:118-124`. Preserving that pattern avoids duplicate clears or duplicate navigation, which the proposal and spec explicitly forbid (`proposal.md:31-43`, `spec.md:48-49`, `:52-64`). |

## Data Flow

The retry loop stays inside `useCreateOrder.doCreateOrder` so the public hook contract remains unchanged for `src/app/checkout/page.tsx:35-37`.

```text
CheckoutPage.handleSuccess (src/app/checkout/page.tsx:96-112)
  └── useCreateOrder.createOrder(paymentIntent, cartItems, orderId)
        ├── setIsCreatingOrder(true)
        ├── setOrderError(null)
        └── doCreateOrder(...)
              ├── if !user
              │     └── setOrderError(checkoutOrderErrors(0, null, { paymentIntentId }))
              ├── subtotal/shipping/total computed once
              ├── assembleOrderData(...) once
              ├── wireBody captured once
              └── attempt loop (max 3)
                    ├── attempt 1
                    │     ├── newTraceId() -> X-Trace-Id A
                    │     ├── PUT /api/orders/by-order-id/:orderId with same wireBody
                    │     └── evaluate result
                    ├── transient fail? (throw or 5xx)
                    │     ├── wait 500ms after attempt 1
                    │     └── retry
                    ├── attempt 2
                    │     ├── newTraceId() -> X-Trace-Id B
                    │     ├── same URL path, same body bytes
                    │     └── evaluate result
                    ├── transient fail again?
                    │     ├── wait 1000ms after attempt 2
                    │     └── retry
                    ├── attempt 3
                    │     ├── newTraceId() -> X-Trace-Id C
                    │     └── final evaluation
                    ├── 2xx
                    │     └── clearCart/onSuccess/router exactly once
                    └── terminal fail (4xx/409/exhausted transient)
                          └── setOrderError(checkoutOrderErrors(statusOr0, bodyOrNull, { paymentIntentId }))
        ├── outer catch only for unexpected thrown defects
        │     └── setOrderError(checkoutOrderErrors(0, null, { paymentIntentId }))
        └── finally -> setIsCreatingOrder(false)
```

Retry classification inside the loop:

```text
fetch attempt
  ├── throws (network / abort / rejected promise)
  │     ├── attempts remaining? yes -> backoff -> retry
  │     └── no -> mapper fallback via checkoutOrderErrors(0, null, { paymentIntentId })
  ├── response.ok
  │     └── success path once
  ├── response.status is 500/502/503/504
  │     ├── attempts remaining? yes -> parse body best-effort for diagnostics only -> backoff -> retry
  │     └── no -> mapper fallback via checkoutOrderErrors(0, bodyOrNull, { paymentIntentId })
  └── response.status is 400/401/403/404/409/other 4xx
        └── no retry -> checkoutOrderErrors(response.status, parsedBody, { paymentIntentId })
```

The mapper remains the only UI string translation point for non-success order-upsert failures:
- `src/features/checkout/utils/checkoutOrderErrors.ts:83-100` for 400/403/409/default fallback
- outer catch fallback aligned to the same default branch instead of raw `error.message`

## File Changes

| File | Action | Description |
|---|---|---|
| `src/features/checkout/hooks/useCreateOrder.ts` | Modify | Replace the single-attempt fetch block at `:82-116` with an inline 3-attempt retry loop, preserve one-time `wireBody` capture from `:73-80`, rotate `X-Trace-Id` per attempt, and replace the outer raw-message catch at `:136-144` with mapper fallback copy. |
| `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts` | Modify | Rework the existing UPSERT hook tests at `:99-449` to match the new retry contract, add RED coverage for S-MOD.8 and S-RET.1..S-RET.7, and update the outdated A-7 comment at `:6-7` plus terminal 409 assertion block at `:306-331`. |
| `openspec/changes/follow-ups-sprint-5-stripe-upsert-F8-use-create-order-resilience/design.md` | Create | Technical design artifact for the inline retry and no-leak catch change. |

## Interfaces / Contracts

No public hook API change is required. `src/app/checkout/page.tsx:35-37` continues consuming the same shape.

```ts
interface UseCreateOrderOptions {
  onSuccess?: (orderId: string) => void
  clearCart?: () => void
}

interface UseCreateOrderResult {
  createOrder: (
    paymentIntent: PaymentIntent,
    cartItems: CartItem[],
    orderId: string
  ) => Promise<void>
  isCreatingOrder: boolean
  orderError: string | null
  clearOrderError: () => void
}

export function useCreateOrder(
  options: UseCreateOrderOptions = {}
): UseCreateOrderResult
```

Private same-file helpers are allowed if they stay inside `src/features/checkout/hooks/useCreateOrder.ts` and are not exported. The implementation MAY use local helper functions like these to keep the retry block readable, but MUST NOT extract them into a new module:

```ts
type OrderWireBody = {
  userId: number
  paymentIntentId: string
  items: CartItem[]
  subtotal: number
  shipping: number
  paymentInfo: unknown
}

type OrderAttemptResult = {
  response: Response | null
  failureKind: 'success' | 'network' | 'http-terminal' | 'http-retryable'
  parsedBody: unknown
}

const MAX_ORDER_UPSERT_ATTEMPTS = 3
const ORDER_UPSERT_BACKOFF_BASE_MS = 500

function isRetryableOrderUpsertStatus(status: number): boolean

function backoffDelayMs(attemptIndex: number): number
```

Behavioral contract for the private logic:
- `isRetryableOrderUpsertStatus(status)` returns `true` only for `500`, `502`, `503`, and `504`, matching `spec.md:42-45`.
- `backoffDelayMs(0) === 500` and `backoffDelayMs(1) === 1000`; no sleep after the final attempt.
- `JSON.stringify(wireBody)` is evaluated once per `createOrder` call and reused for each fetch init body so S-RET.6 can assert equality on request payload bytes.
- `checkoutOrderErrors(...)` remains the single copy source for every terminal non-success branch.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Retry classification and side-effect timing inside `useCreateOrder` | Extend `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts` with mocked `global.fetch`, fake timers, and assertions on call counts, bodies, headers, `orderError`, `isCreatingOrder`, `clearCart`, `onSuccess`, and `mockPush`. Use `vi.useFakeTimers()` only in the retry describe block so backoff windows can be asserted without slowing CI. |
| Integration | Hook consumer contract remains stable for `CheckoutPage` loading/error overlay assumptions | Keep the existing hook return shape unchanged and preserve `isCreatingOrder` semantics verified through hook-state assertions so `src/app/checkout/page.tsx:223-235` keeps showing the same modal across the whole retry window. No page test changes are required for this scoped change. |
| E2E | None newly required for F8 | The behavior is fully pinned at hook level and the proposal keeps this under a single-PR frontend-only change. Existing checkout e2e remains a regression net, but F8 does not add a new Playwright artifact in this phase. |

Concrete RED expectations mapped to the current test file sections:

| Spec scenario | Planned test name / section in `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts` |
|---|---|
| S-MOD.8 | Add after current S3.6 failures in the `describe('useCreateOrder — UPSERT rewire (S3.1–S3.6)', ...)` block: `it('S-MOD.8 — outer defensive catch falls back to checkoutOrderErrors and never leaks raw error.message', ...)` |
| S-RET.1 | Add new retry subsection in the same describe block: `it('S-RET.1 — network rejection retries once with the same body and succeeds on attempt 2', ...)` |
| S-RET.2 | `it('S-RET.2 — 503, 503, 200 retries up to 3 attempts and fires success side effects once', ...)` |
| S-RET.3 | Replace the current 409 terminal test at `useCreateOrder.test.ts:306-331` with `it('S-RET.3 — 409 is terminal and never retried', ...)` while preserving the mapper assertions |
| S-RET.4 | Extend the current 400 terminal test at `:255-279` into `it('S-RET.4 — 400 is terminal and never retried', ...)` |
| S-RET.5 | Add `it('S-RET.5 — exhausted transient failures surface the friendly fallback and never leak raw backend text', ...)` covering three 5xx, three throws, or a mixed series |
| S-RET.6 | Add `it('S-RET.6 — retries preserve the D-lock wire body and orderId while rotating X-Trace-Id', ...)` using captured `fetch.mock.calls` body strings and headers |
| S-RET.7 | Add `it('S-RET.7 — isCreatingOrder stays true across the retry window and flips false only after the final outcome', ...)` using fake timers plus intermediate state reads before the final resolve |

Existing tests that must be updated, not duplicated:
- `S3.5 — 409 maps verbatim ... client NEVER retries` at `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts:306-331` becomes the RED/green site for S-RET.3.
- `S3.6 — unknown status 500 keeps the paymentIntentId support copy` at `:333-357` and `fetch rejection (network down)` at `:390-408` must be rewritten because 500 and fetch rejection are no longer single-attempt terminal branches.
- `A-4 — each attempt generates a fresh X-Trace-Id` at `:410-430` should be reframed from separate `createOrder` invocations to within-one-call retry rotation, because F8’s actual requirement is per attempt, not just per invocation.

Verification command remains the project-standard unit gate from `openspec/config.yaml:13-16` and `AGENT.md`: `npx vitest run --maxWorkers=2`.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is added or changed. The change is confined to a frontend hook retry loop and its tests in `src/features/checkout/hooks/useCreateOrder.ts` and `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts`.

## Migration / Rollout

No migration required.

## Open Questions

- [ ] F4 archive drift: `openspec/changes/follow-ups-sprint-5-stripe-upsert-F8-use-create-order-resilience/specs/checkout-error-display/spec.md:110-112` records that F4’s S-MOD.1..S-MOD.7 delta was not promoted into `openspec/specs/checkout-error-display/spec.md:1-87`. This design assumes F8 lands on the current canonical baseline and does not reconcile that archive drift.
- [ ] Second-consumer extraction follow-up: once another checkout flow needs the same retry semantics, should the inline loop in `src/features/checkout/hooks/useCreateOrder.ts` be promoted into a shared `withRetry`-style helper under `src/lib/` or remain feature-local under `src/features/checkout/`?
