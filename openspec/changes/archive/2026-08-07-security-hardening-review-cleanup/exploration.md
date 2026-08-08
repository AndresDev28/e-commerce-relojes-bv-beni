## Exploration: security-hardening-review-cleanup

Lineage: closes residual review findings from `security-hardening-critical-fixes` (archived 2026-08-04, review-bf31a670866c326b, verified `pass_with_warnings` per engram `#1190` / `#1465`).

### Current State

Vitest project layout in `vitest.config.ts`:
- `unit` (jsdom): includes `src/**/__tests__/**/*.{test,spec}.{js,ts,tsx}`, **excludes** `**/*.integration.test.{ts,tsx}`.
- `integration` (node): includes only `test/integration/**/*.{test,spec}.{js,ts}`.

That config strays one file in `src/**`: the orphan at `src/features/orders/components/__tests__/RequestCancellation.integration.test.tsx:1-155` (`.integration.test.tsx`) is excluded from `unit` and the `integration` project never scans `src/**`. The route layer under `src/app/api/orders/[orderId]/request-cancellation/__tests__/route.test.ts:1-476` already covers the POST contract (auth, 400 missing reason, 400 too-long reason, 404 IDOR, 502, 500, X-Trace-Id, service delegation).

Per-lens review manifests at `/tmp/opencode/review-lens-reliability.json` and `/tmp/opencode/review-lens-resilience.json` (lineage `review-bf31a670866c326b`) point to four remaining WARNING-level findings:

| ID | Location (manifest) | What is true in the working tree today |
| --- | --- | --- |
| R3-no-op-type-pin | `src/lib/api/__tests__/orders.public-api.test.ts:25` | **Still present**: `expect(key in ordersModule \|\| true).toBe(true)` is a vacuous assertion; the other 2 cases in the file (lines 15-23) are valid. |
| R3-too-many-branch-uncovered | `src/app/api/favorites/__tests__/route.test.ts:148` | **Still present**: `[FAV-W-2]` and `[FAV-W-3]` cover invalid JSON and `invalid_shape`; the `too_many` branch at `src/app/api/favorites/route.ts:53-55` (different Spanish message: `` `La lista de favoritos no puede tener más de ${MAX_FAVORITES} elementos.` ``) has no route-level case. Unit test at `src/features/favorites/services/__tests__/updateFavoritesService.test.ts:153-167` only covers the validator. |
| R3-requireuser-502-end2end / R4-requireuser-502-gap | `src/app/api/favorites/__tests__/route.test.ts:35` | **Still present**: GET and PUT mock `/api/users/me` as `ok:true` always. `requireUser` has 3 distinct 502 paths in `src/lib/auth/validate-request.ts:37-83` (network throw, non-401 Strapi error, missing user.id) — none exercised end-to-end through the route. |

The brief's reference to `src/features/orders/services/updateFavoritesService.ts` is a path typo; the file actually lives at `src/features/favorites/services/updateFavoritesService.ts` (re-exported from `src/features/favorites/index.ts:9-14`). `validateFavoritesList` is defined at `updateFavoritesService.ts:15-30` with the same `MAX_FAVORITES = 200` constant from `getFavoritesService.ts:4`.

Mirror pattern for R4 end-to-end coverage lives at `src/app/api/orders/[orderId]/__tests__/route.test.ts:296-364` ("Manejo de errores" describe — 502 + network-throw cases with byte-identical `'No pudimos verificar tu sesión. Inténtalo de nuevo.'` assertions).

DEBT-12 (`gentle-ai bind-sdd` scope-drift defect) is tool/provider-internal, surfaced in `#1465` and the defect report at `.git/gentle-ai/defect-reports/operation-outcome-unknown-*.md`. No code action.

### Affected Areas

- `src/features/orders/components/__tests__/RequestCancellation.integration.test.tsx` — orphant under vitest `unit` exclusion + `integration` project not scanning `src/**`.
- `src/lib/api/__tests__/orders.public-api.test.ts` — third case (lines 25-30) is a no-op; first two (lines 14-23) are valid and must stay.
- `src/app/api/favorites/__tests__/route.test.ts` — needs 2 new cases (GET requireUser-502, GET requireUser-network-throw) and 1 new PUT case (requireUser-502), and 1 new `too_many` case under PUT `[FAV-W-*]`.
- `openspec/specs/secure-route-authorization/spec.md` — R4 finding is grounded in the "Consistent Authorization Errors" requirement (lines 64-73) and the "JWT Validation" scenarios (lines 9-39). No new requirement; uses existing scope.
- `openspec/specs/api-traceability/spec.md` — R4 cases must continue to echo `X-Trace-Id` (requirement "Trace Id in Route Handlers" / "Trace Id on Errors", lines 41-65).
- `openspec/changes/2026-08-07-security-hardening-review-cleanup/` — new change folder for this cleanup.

### Approaches

#### W3 — orphant test

1. **Delete the file outright.**
   - Pros: smallest diff, removes a coverage hole that CI silently masks, the POST contract is fully covered at the route level.
   - Cons: drops the only coverage of `OrderDetail`'s cancel modal UI (open/close/typing). If that UX matters, it should be a Storybook interaction story, not a stranded `*.integration.test.tsx`.
   - Effort: Low.
2. **Move + rewrite under `test/integration/orders/request-cancellation.test.ts`** — stub `OrderDetail` props + assert the modal + fetch interaction.
   - Pros: preserves modal UX coverage inside the right project.
   - Cons: still depends on `OrderDetail` internals; the route test already pins the wire contract; this is essentially a UI test masquerading as integration.
   - Effort: Medium.
3. **Add a `frontend` glob to the `integration` project** so `src/**/*.integration.test.{ts,tsx}` runs.
   - Pros: zero source deletion; future frontend integration tests get a home.
   - Cons: enlarges test scope, masks the architectural smell (UI test under "integration"), still requires a deterministic fetch stub.
   - Effort: Low config, but adds ongoing maintenance surface.

#### R3-no-op-type-pin

1. **Delete the third `it` block (lines 25-30), keep the first two.**
   - Pros: removes the misleading test; the first two are real runtime assertions (`importable as module` and `does not export the legacy runtime helpers`).
   - Cons: drops the "type contracts still exist" intent — but that intent was unreachable in Vitest anyway.
   - Effort: Low.
2. **Replace with a real `tsd`-style check** (compile-time only).
   - Pros: actual type-surface guard.
   - Cons: `tsd` is not a project dependency; adding it inflates tooling.
   - Effort: Medium.

#### R3-too-many-branch-uncovered

1. **Add `[FAV-W-7]` in `src/app/api/favorites/__tests__/route.test.ts` mirroring `[FAV-W-3]`** — mock `requireUser` success, send a `MAX_FAVORITES + 1` array, assert `status 400` and `` data.error === `La lista de favoritos no puede tener más de ${MAX_FAVORITES} elementos.` `` with `X-Trace-Id`.
   - Pros: 1 case, mirrors existing pattern, locks the public Spanish string.
   - Cons: none material.
   - Effort: Low.
2. **Skip — argue the unit-level coverage is enough.**
   - Pros: zero diff.
   - Cons: the route returns a *different* message than the validator, and that message is a public contract; the unit test does not pin it.
   - Effort: Zero (but the finding stays open).

#### R3/R4-requireuser-502-gap

1. **Add 2 GET + 1 PUT cases in `src/app/api/favorites/__tests__/route.test.ts` mirroring the orders route pattern.**
   - GET: mock `fetch` to return 500 for the first call (mirror `route.test.ts:296-315`); assert `status 502`, byte-identical `'No pudimos verificar tu sesión. Inténtalo de nuevo.'`, `X-Trace-Id` echoed.
   - GET: mock `fetch` to reject with `new Error('network down')`; same assertions (mirror lines 346-364).
   - PUT: same 502 case (the PUT handler also gates via `requireUser`).
   - Pros: closes the end-to-end gap, locks Spanish strings at the route boundary, matches orders-route convention.
   - Cons: ~80-100 lines of new test code.
   - Effort: Low.
2. **Only add the GET case and leave PUT implicit.**
   - Pros: smaller diff.
   - Cons: PUT has its own 502 envelope in `validate-request.ts`; symmetry matters for review.
   - Effort: Lower but asymmetric.

#### DEBT-12

1. **Surface as a follow-up in the proposal; do not scope code work.**
   - Pros: keeps the change scoped to test-cleanup, the defect is a provider fault.
   - Cons: maintainer may want a re-base step anyway.
   - Effort: Zero code.

### Recommendation

- **W3**: Option 1 (delete the orphant). The POST contract is fully covered at the route layer; the modal UX can be a Storybook interaction story if it ever becomes a concern. Smallest diff, removes a coverage lie.
- **R3-no-op-type-pin**: Option 1 (delete the third `it` block). The first two cases are useful; the third asserts nothing.
- **R3-too-many-branch-uncovered**: Option 1 (add `[FAV-W-7]`). One test, byte-identical Spanish string, mirrors `[FAV-W-3]`.
- **R3/R4-requireuser-502-gap**: Option 1 (add 3 cases: GET 502, GET network-throw, PUT 502). Mirrors `route.test.ts:296-364`. Symmetric GET+PUT coverage.
- **DEBT-12**: Option 1 (proposal follow-up only; no code in this change).

Combined diff budget: ~120-150 test additions, 1 file deletion, 5 lines trimmed. Comfortably under the 400-line review budget; no chained-PR risk.

### Risks

- **Byte-identical Spanish strings** in the new test assertions must match `src/lib/auth/validate-request.ts:40,58,70,79` and `src/app/api/favorites/route.ts:54` exactly. A single character drift fails the trace-id / message contract. Mitigation: copy-paste the literal, do not retype.
- **Coverage report drift** — deleting the orphant and the no-op pin lowers test count by 2 and raises the 0-test-on-`src/**/components` ratio. Mitigation: cite the deletion in the proposal's scope section so reviewers see the intent.
- **`MAX_FAVORITES` is currently 200** (`getFavoritesService.ts:4`). The new `[FAV-W-7]` should import it and build `MAX_FAVORITES + 1` to stay robust if the constant changes. Mitigation: use the constant, not the literal `201`.
- **Vitest 832/853 baseline with 21 pre-existing jsdom localStorage failures** (per `#1190`): the new tests run in jsdom under the `unit` project (which is what `src/app/api/**` tests already use), so they do not cross into the broken surface. Mitigation: run the full `npx vitest run --maxWorkers=2` after the change; only the 21 pre-existing failures should remain.
- **DEBT-12 may block `sdd-archive`** if the orchestrator tries to re-bind the lineage. Mitigation: keep the proposal's rollback plan explicit about abandoning vs. re-binding the lineage.

### Ready for Proposal

Yes. Findings are concrete, file:line-anchored, all disposals fit in one test-only PR. Hand off to `sdd-propose` with: scope = "delete 1 file, trim 1 case, add 4 cases" (~150 net additions). Orchestrator may proceed to `sdd-propose` next.
