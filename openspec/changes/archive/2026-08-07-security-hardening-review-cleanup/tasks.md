# Tasks: Security-Hardening Review Cleanup

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 120–150 additions, 155 deletion, ~5 trimmed |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR; five work-unit commits |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Remove orphan and vacuous orders tests | PR 1 | `npx vitest run --maxWorkers=2 src/lib/api/__tests__/orders.public-api.test.ts` | N/A: test cleanup only | Revert two orders-test changes |
| 2 | Pin favorites validation and auth failures | PR 1 | `npx vitest run --maxWorkers=2 src/app/api/favorites/__tests__/route.test.ts` | N/A: route tests mock fetch | Revert favorites test additions |

## Phase 1 — Cleanup (no source changes)

- [x] 1.1 Delete `src/features/orders/components/__tests__/RequestCancellation.integration.test.tsx` (155 lines); verify `git status`, `ls`, and `npx vitest run --maxWorkers=2 src/app/api/orders/[orderId]/request-cancellation/__tests__/route.test.ts`; commit `test(orders): remove orphant RequestCancellation.integration.test`.
- [x] 1.2 Remove only the vacuous third `it` block (L25–30) from `src/lib/api/__tests__/orders.public-api.test.ts`; keep L14–23. Verify the targeted Vitest command passes 2 cases; commit `test(orders): drop vacuous type-key pin in orders.public-api.test`.

## Phase 2 — Favorites branch coverage (test-only RED→GREEN)

- [x] 2.1 Add `[FAV-W-7]` after `[FAV-W-3]` in `src/app/api/favorites/__tests__/route.test.ts`; import `MAX_FAVORITES` from `@/features/favorites/services/getFavoritesService`, submit `MAX_FAVORITES + 1`, and assert 400, the byte-identical `too_many` message, and echoed `X-Trace-Id`. RED→GREEN requires no source mutation. Verify with the targeted Vitest command; commit `test(favorites): cover too_many branch at PUT /api/favorites route`.

## Phase 3 — requireUser 502 coverage (test-only RED→GREEN)

- [x] 3.1 Add GET `/api/favorites` non-ok `/api/users/me` case: mock `ok:false,status:500`; assert 502, byte-identical `No pudimos verificar tu sesión. Inténtalo de nuevo.`, and `X-Trace-Id`. Mirror the orders route pattern; verify `npx vitest run --maxWorkers=2 src/app/api/favorites/__tests__/route.test.ts`.
- [x] 3.2 Add GET network-throw case with `new Error('network down')`; assert the same 502 response, message, and trace ID. RED→GREEN requires no source mutation; verify `npx vitest run --maxWorkers=2 src/app/api/favorites/__tests__/route.test.ts`.
- [x] 3.3 Add the equivalent PUT 502 case; verify `npx vitest run --maxWorkers=2 src/app/api/favorites/__tests__/route.test.ts`; commit 3.1–3.2 as `test(favorites): cover requireUser 502 end-to-end on GET /api/favorites`, then commit 3.3 as `test(favorites): cover requireUser 502 end-to-end on PUT /api/favorites route`.

## Phase 4 — Final verification

- [x] 4.1 Run `npx vitest run --maxWorkers=2`; only the 21 pre-existing jsdom localStorage failures may remain.
- [x] 4.2 Run `npx tsc --noEmit`; require exit 0. Run `gga run --pr-mode --diff-only` headlessly; use conventional commits without `Co-Authored-By`.

**Out of scope:** source changes, Storybook cancel-modal coverage, DEBT-12 workaround, and spec deltas. Rollback is reverting the single PR; if archive rebinding hits DEBT-12, abandon the lineage and do not retry.
