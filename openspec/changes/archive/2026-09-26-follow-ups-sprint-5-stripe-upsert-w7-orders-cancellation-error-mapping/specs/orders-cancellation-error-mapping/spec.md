# Spec Delta: W7 — Orders Cancellation Friendly Error Contract

**Change**: `follow-ups-sprint-5-stripe-upsert-w7-orders-cancellation-error-mapping`
**Baseline**: `openspec/specs/` (no existing `orders-cancellation` capability)
**Capability target**: `orders-cancellation-error-mapping` (new)

---

## Purpose

Capture the contract that `requestCancellationService.ts` now satisfies: when a customer requests cancellation of an order whose status is non-cancellable, the API MUST return a 400 with a friendly Spanish message; raw enum values MUST NOT appear in the visible response body. Closes the AGENT.md:51 violation class for the orders flow.

## ADDED Requirements

### Requirement: Friendly Error Mapping for Non-Cancellable Order Statuses

When `requestCancellationService` returns a 400 because the order's status is not in `CANCELLABLE_STATUSES`, the response body's `error` field MUST be a fixed Spanish copy that does NOT contain the raw `orderData.orderStatus` enum value.

The mapping MUST hold:

| Order status (raw) | Required `error` text |
|---|---|
| `shipped` | `Tu pedido ya fue enviado y no se puede cancelar.` |
| `delivered` | `Tu pedido ya fue entregado y no se puede cancelar.` |
| `cancelled` | `Este pedido ya fue cancelado.` |
| `refunded` | `Este pedido ya fue reembolsado.` |
| `cancellation_requested` | `Ya solicitaste la cancelación de este pedido; la estamos procesando.` |
| (any other status not in the map) | `Este pedido no se puede cancelar en su estado actual.` |

Test 1 of `requestCancellationService.test.ts:445` (400 — non-cancellable status) asserts this mapping across the `shipped` and `cancellation_requested` inputs.

#### Scenario: W7.S1 — shipped status surfaces friendly copy

- GIVEN an authenticated user requests cancellation of an order with `orderStatus: 'shipped'`
- WHEN `requestCancellationService` runs the cancellable-status check
- THEN the response MUST be `400` with body `{ error: 'Tu pedido ya fue enviado y no se puede cancelar.' }`
- AND the response body's `error` MUST NOT contain the substring `'shipped'`

#### Scenario: W7.S2 — cancellation_requested status surfaces friendly copy

- GIVEN an authenticated user requests cancellation of an order with `orderStatus: 'cancellation_requested'`
- WHEN the cancellable-status check runs
- THEN the response MUST be `400` with body `{ error: 'Ya solicitaste la cancelación de este pedido; la estamos procesando.' }`
- AND the response body's `error` MUST NOT contain the substring `'cancellation_requested'`

#### Scenario: W7.S3 — unknown future status falls through to default

- GIVEN a new backend status (e.g., `'returned'`) is added without updating the map
- WHEN the cancellable-status check runs
- THEN the response MUST be `400` with body `{ error: 'Este pedido no se puede cancelar en su estado actual.' }`
- AND the response MUST NOT crash and MUST NOT echo the unknown enum value

## Out of Scope

- F4 spec drift (R1..R6 missing from canonical `checkout-error-display/spec.md`) — separate change.
- `withRetry` extraction.
- Status email templates (`OrderStatusEmail.tsx`) consistency — separate ticket.
- `CANCELLABLE_STATUSES` whitelist semantics — unchanged by W7.
- Other 4xx/5xx messages in `requestCancellationService.ts` (404 for not-found / IDOR mismatch, 502 for transport) — already friendly Spanish copy, not in W7 scope.

## Acceptance Criteria

1. `requestCancellationService.ts:131` (post-edit) does NOT contain the leaky template literal `No se puede cancelar un pedido en estado: ${...}`.
2. Every non-cancellable `OrderStatus` enum value maps to pure Spanish copy per the table above.
3. Default fallback present for unmapped values.
4. Test 1 (`shipped`) and Test 2 (`cancellation_requested`) in `requestCancellationService.test.ts:445+` assert the new friendly copy.
5. All 19 tests in `requestCancellationService.test.ts` pass.
6. Triple gate green (vitest 1158/1158 · tsc 0 · build success).

## Cross-references

- F4 (#141): originally flagged this violation as W7 / F8-batch carry-forward (obs #1901).
- F8 (#146 + #148): closed the same violation class for `useCreateOrder.ts` (obs #1936).
- AGENT.md:51 — guidance satisfied across all three checkout/orders touch points.
