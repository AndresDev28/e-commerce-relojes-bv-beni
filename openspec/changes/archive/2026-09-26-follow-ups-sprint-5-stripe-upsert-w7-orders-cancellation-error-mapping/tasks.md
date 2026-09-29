# Tasks: W7 — Orders Cancellation Error Mapping

**Change**: `follow-ups-sprint-5-stripe-upsert-w7-orders-cancellation-error-mapping`
**Branch**: `frontend/w7-orders-cancellation-error-mapping` (create from main)
**Artifact store**: engram · strict TDD · budget 400 lines · single PR
**Topic key**: `sdd/follow-ups/sprint-5-stripe-upsert/w7-orders-cancellation-error-mapping/tasks`

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 20 insertions, 3 deletions (actual: 20+3 per `git diff --stat`) |
| 400-line budget risk | Low |
| Chained PRs recommended | No (single PR) |
| Decision needed before apply | No |
| Suggested split | Single work-unit commit |

## Out of Scope (refirmado)

- F4 spec drift (R1..R6).
- `withRetry` extraction.
- Status email template alignment.
- `CANCELLABLE_STATUSES` whitelist semantics (unchanged).

## Task List

- [x] T1 — Add `NON_CANCELLABLE_STATUS_COPY` constant + `OrderStatus` import
- [x] T2 — Replace leaky L131 with map lookup + fallback
- [x] T3 — Update both test assertions at L462 + L487 atomically
- [x] T4 — Triple gate: vitest (1158/1158) · tsc (0) · build (success)
- [x] T5 — Persist apply-progress to Engram (#1949)
- [x] T6 — Push branch + open PR + merge to main (user-merged per confirmation; release v1.12.1 published)
