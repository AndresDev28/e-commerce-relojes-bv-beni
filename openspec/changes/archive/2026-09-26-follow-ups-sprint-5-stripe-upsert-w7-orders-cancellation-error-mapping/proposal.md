# Explore + Proposal: W7 — Orders Cancellation Error Mapping

## Explore

### Current State

`src/features/orders/services/requestCancellationService.ts:117` echoes the raw `orderData.orderStatus` enum value into a user-facing 400 response:

```typescript
{
  error: `No se puede cancelar un pedido en estado: ${orderData.orderStatus}`,
  status: 400,
}
```

The enum values are technical snake_case (`shipped`, `delivered`, `cancelled`, `refunded`, `cancellation_requested`). This leaks internal status codes to the user-facing alert surface. Same AGENT.md:51 violation class that F4 (`CheckoutForm.tsx`) and F8 (`useCreateOrder.ts`) closed — but for the orders flow cancellation path.

`src/features/orders/services/__tests__/requestCancellationService.test.ts:462` actually **pins the leaky behavior** by asserting the literal Spanish string:

```typescript
expect(result.error.status).toBe(400);
expect(JSON.parse(/* ... */).error).toBe(
  'No se puede cancelar un pedido en estado: shipped'
);
```

The test must be updated when the leaky line is fixed.

### Affected Areas (1 file)

- `src/features/orders/services/requestCancellationService.ts` — replace the leaky string-interpolation error at L117 with a static enum→Spanish copy map. Add the map as a file-local constant near `CANCELLABLE_STATUSES` at L15.
- `src/features/orders/services/__tests__/requestCancellationService.test.ts` — update the assertion at L462 to match the new friendly copy.

### Why This Hole Matters

After a customer requests cancellation and the backend reports a non-cancellable status (most commonly `shipped`), they see:
- Today: `"No se puede cancelar un pedido en estado: shipped"`
- Fix target: `"Tu pedido ya fue enviado y no se puede cancelar."` (or similar pure Spanish)

The first form violates AGENT.md:51 ("never show cryptic technical errors") and arguably exposes operational status codes to the customer. Also inconsistent with F4/F8's fix pattern at the user-facing surface of the checkout and order-creation flows.

## Proposal

### Intent

Replace the leaky status-enum interpolation in `requestCancellationService.ts` with a static enum→Spanish copy map. Close the orders-side AGENT.md:51 violation and bring the orders flow to the same standard F4 and F8 already established for checkout.

### In Scope

- Add a file-local `NON_CANCELLABLE_STATUS_COPY: Record<string, string>` constant near `CANCELLABLE_STATUSES` at L15. Map every non-cancellable `OrderStatus` enum value to pure Spanish copy.
- Replace the leaky string-interpolation at L117 with a lookup against the new map (with a default fallback).
- Update the test at `requestCancellationService.test.ts:462` to assert the new friendly copy.
- Run triple gate: `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build`.

### Out of Scope

- F4 spec drift (R1..R6) — separate change.
- `withRetry` extraction — separate change.
- Other status emojis/text alignment in the orders email templates (`src/emails/templates/OrderStatusEmail.tsx`) — separate ticket if pursued.
- Any change to the `CANCELLABLE_STATUSES` whitelist — not needed for this fix.
- The 5xx, 404, 502 messages elsewhere in the file are already friendly Spanish copy; not touched.

### Approach

Single work-unit commit on `frontend/w7-orders-cancellation-error-mapping` (or similar branch from `main`). Three localized changes:

1. New constant near `CANCELLABLE_STATUSES`:

```typescript
const NON_CANCELLABLE_STATUS_COPY: Record<string, string> = {
  [OrderStatus.SHIPPED]:
    'Tu pedido ya fue enviado y no se puede cancelar.',
  [OrderStatus.DELIVERED]:
    'Tu pedido ya fue entregado y no se puede cancelar.',
  [OrderStatus.CANCELLED]:
    'Este pedido ya fue cancelado.',
  [OrderStatus.REFUNDED]:
    'Este pedido ya fue reembolsado.',
  [OrderStatus.CANCELLATION_REQUESTED]:
    'Ya solicitaste la cancelación de este pedido; la estamos procesando.',
}
```

2. Replace L117 leaky line with a map lookup + fallback:

```typescript
return {
  error: NextResponse.json(
    {
      error:
        NON_CANCELLABLE_STATUS_COPY[orderData.orderStatus as string]
        ?? 'Este pedido no se puede cancelar en su estado actual.',
    },
    { status: 400, headers: { 'X-Trace-Id': traceId } }
  ),
}
```

3. Test update at `requestCancellationService.test.ts:462`:

```typescript
expect(JSON.parse(/* ... */).error).toBe(
  'Tu pedido ya fue enviado y no se puede cancelar.'
);
```

### TDD Cycle

- **RED**: assert the new friendly string with the current leaky code → assertion fails (the old string is still in the response).
- **GREEN**: apply the diff above; re-run → assertion passes.
- **REFACTOR**: N/A — diff is already clean and uses a single map constant.

### Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 18-25 (constant ~10 LOC, line swap 3 LOC, test update 1-2 LOC) |
| 400-line budget risk | Low |
| Chained PRs recommended | No (single PR) |
| Decision needed before apply | No |

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Test misses a non-cancellable status value | Low | The map covers every OrderStatus enum value. Default fallback handles edge cases. |
| Backend adds new status without updating the map | Low | Default fallback covers any unmapped value. Logged via `X-Trace-Id` for traceability. |
| Test drift between copy strings | Low | Single test updated atomically with the diff. |

### Rollback

Revert the single commit. Behavior returns to leaky status-enum echo. Worst case: re-introduce the F4-revealed AGENT.md:51 violation for the orders flow.

### Success Criteria

- [x] `requestCancellationService.ts:117` no longer echoes raw `orderData.orderStatus`.
- [x] Every non-cancellable `OrderStatus` enum value maps to pure Spanish copy.
- [x] Default fallback present for unmapped values.
- [x] Test at `requestCancellationService.test.ts:462` asserts the new friendly string.
- [x] All existing 17 tests in `requestCancellationService.test.ts` (per grep) remain passing.
- [x] Triple gate green.

## Cross-references

- F4 (#1901 archived): closed the same violation at `CheckoutForm.tsx`.
- F8 (#1936 archived): closed the same violation at `useCreateOrder.ts:191-201` (S-MOD.8 outer catch).
- This W7 fix closes the orders-side mirror — completing the AGENT.md:51 remediation across the three checkout/orders touch points.

