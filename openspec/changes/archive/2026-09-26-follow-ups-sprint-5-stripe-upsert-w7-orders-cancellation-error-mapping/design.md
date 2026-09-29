# Design: W7 — Orders Cancellation Error Mapping

**Change**: `follow-ups-sprint-5-stripe-upsert-w7-orders-cancellation-error-mapping`
**Branch**: `frontend/w7-orders-cancellation-error-mapping` (create from main)
**Artifact store**: engram · strict TDD · budget 400 lines · single PR
**Topic key**: `sdd/follow-ups/sprint-5-stripe-upsert/w7-orders-cancellation-error-mapping/design`

## Technical Approach

Single work-unit commit on `frontend/w7-orders-cancellation-error-mapping`. Three localized changes:

### File 1 — `src/features/orders/services/requestCancellationService.ts`

1. New import at top: `import { OrderStatus } from '@/types'`
2. New file-local constant near `CANCELLABLE_STATUSES` (L15): `NON_CANCELLABLE_STATUS_COPY` mapping every non-cancellable enum value to pure Spanish copy.
3. Replace leaky string interpolation at L131 with map lookup + fallback.

### File 2 — `src/features/orders/services/__tests__/requestCancellationService.test.ts`

Update assertions at L462 and L487 (both atomically per strict-TDD triangulation).

## Test Strategy

1. Safety net: full `requestCancellationService.test.ts` run before any edit; baseline 19/19.
2. RED: update both test assertions first (without touching source); expect 2 failures with exact diff messages.
3. GREEN: apply map constant + L131 swap; expect 19/19 pass.
4. REFACTOR: N/A (diff already clean).

## Tradeoffs Considered

- **Inline map vs shared utility**: chose inline because this is the only consumer of this mapping pattern; promote to shared module only if a second consumer appears.
- **Cast `as string` on lookup vs strict typing**: chose `Record<string, string>` for the map because `OrderStatus` enum values cross function boundaries as strings from the Strapi backend; a stricter type-guard at the field extraction site is out of scope.
- **Default fallback message**: included explicitly so any future backend status that is not in the map still produces a defensible Spanish string. Fallback text not exposing any enum value.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 23 (20 insertions + 3 deletions) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Decision needed before apply | No |

## Migration / Rollback

- Migration: none — service is backwards compatible (Spanish copy strings replace leaky strings).
- Rollback: revert the single commit. Behavior returns to leaky enum echo. AGENT.md:51 violation re-introduced for the orders flow only.

## Out of Scope

- F4 spec drift (R1..R6). F4 spec reconciliation is a separate change.
- `withRetry` extraction.
- Status emojis/text alignment in `src/emails/templates/OrderStatusEmail.tsx` — separate ticket if pursued.
- Other messages in `requestCancellationService.ts` (5xx, 404, 502) — already friendly Spanish copy.
