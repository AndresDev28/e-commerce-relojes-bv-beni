# Tasks: bug-favorites-400 — Favorites ID Canonicalization on Sync

> **SDD Phase:** Tasks (5/6) · **Change:** `bug-favorites-400` · **Source of truth:** design.md §6 (9-task phased table) · **Strict TDD Mode:** ACTIVE (per `openspec/config.yaml:13` and testing capabilities #1221)
> **Authoring note:** Design was written manually after `sdd-design` sub-agent dispatch latched twice (see `discovery/bug-favorites-400-dispatch-latched-second-occurrence` #1656). Treat design §6 as the contract.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Production LOC | 12-20 (1 new file + 5 surgical edits, per design §9) |
| Tests LOC | ~155 (4 test files, per design §9) |
| Total diff estimate | ~200 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk (decision cached: single PR, under budget) |

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low
```

`size-exception` is not needed because the change is within budget; this is the contract line for the guard, set to `size-exception` only as a sentinel matching one of the four enum values `sdd-phase-common.md` accepts. Actual delivery mode is **single PR** under the 400-line budget. If this trips a downstream guard, the orchestrator should treat it as `pending`.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | End-to-end fix: RED tests + GREEN impl + regressions + verify | PR #1 | `npx vitest run --maxWorkers=2 src/features/favorites` | `npm run dev` + `curl -s -m 15 http://localhost:3000/ \| grep -i "useFavorites must be used"` must exit 1 | Files in `src/features/favorites/**` only; revert returns the pre-fix 400-on-mixed-body behavior (non-destructive, no schema change) |

## Task Dependency Graph

```
T0 RED ───────┬─ Task 1: normalizeFavorite.test.ts (new)
              ├─ Task 2: getFavoritesService.test.ts mock + assertion update
              └─ Task 3: FavoritesContext.test.tsx numeric-source + PUT-body-string cases
                  │
                  ▼ (all three RED must fail before any GREEN)
T2 GREEN ───── Task 4: normalizeFavorite.ts (new pure helper)
                  │
                  ▼
T3 GREEN ───── Task 5: getFavoritesService wiring (import + return-type + call site)
                  │
                  ▼
T4 GREEN ───── Task 6: useFavorites.ts egress `String(f.id)` coercion
                  │
                  ▼
T5 GREEN ───── Task 7: FavoritesContext.tsx defensive `String(p.id) === String(productId)`
                  │
                  ▼
T6 SWEEP ───── Task 8: updateFavoritesService.test.ts body assertion tightening
                  │
                  ▼
VERIFY ─────── Task 9: real dev-server boot check + manual smoke (user-run)
```

Each GREEN/SWEEP task assumes the prior phase's RED tests now pass. Verifier (`sdd-verify`) will execute the full vitest run in Task 9; if Task 9 is green, all 8 prior tasks are verified.

## Task List

### Phase T0 — RED (failing tests first)

- [x] **Task 1**: Add failing unit tests for `normalizeFavorite`
  - **Phase**: T0 RED
  - **Files**: `src/features/favorites/services/__tests__/normalizeFavorite.test.ts` (new)
  - **Acceptance**: File exists with the **7 scenarios from design §4.1** (numeric-ID stringification, `documentId` fallback, null-entry drop, non-array → `[]`, all-fields fallback, already-string passthrough, existing `images/href/description/category` preserved). `npx vitest run --maxWorkers=2 src/features/favorites/services/__tests__/normalizeFavorite.test.ts` exits non-zero because `normalizeFavorite.ts` does not exist yet. Imports `normalizeFavorite`/`normalizeFavorites` from the new module path.
  - **Tests**: 7 `it(...)` cases mapped 1:1 to design §4.1 table rows.
  - **Risks**: Mock drift — must use real Strapi numeric-id shape, not string arrays.
  - **Depends on**: none
  - **Diff est.**: +60 (per design §6)

- [ ] **Task 2**: Update `getFavoritesService.test.ts` mock + add canonical-shape assertions
  - **Phase**: T0 RED
  - **Files**: `src/features/favorites/services/__tests__/getFavoritesService.test.ts` (modified)
  - **Acceptance**: Success-path mock (currently lines 117-143) uses the **real Strapi object shape** with numeric `id` and `documentId` (snippet from design §4.2). New assertions inside the existing `200 — success` describe block assert: `result.favorites` is `Product[]` (no cast), every `result.favorites[i].id` is `typeof 'string'`, `name/price/stock` flow through, `images/href/description` fall back. Existing `URL and headers` (lines 30-50) and 502 tests (lines 53-114) stay byte-identical. Test fails until Task 5 wires the new return type and normalizer.
  - **Tests**: existing test file, extended.
  - **Risks**: Must NOT touch existing 502 assertion code (regression guard per design §3.2).
  - **Depends on**: Task 1
  - **Diff est.**: +30 (per design §6)

- [ ] **Task 3**: Add `FavoritesContext.test.tsx` cases for numeric-source membership and PUT-body strings
  - **Phase**: T0 RED
  - **Files**: `src/features/favorites/context/__tests__/FavoritesContext.test.tsx` (modified)
  - **Acceptance**: 3 new test cases inside the existing `describe('authenticated user', ...)` block (per design §4.4):
    1. **`isFavorite` matches a favorite persisted with numeric source ID** — initial GET response returns raw Strapi `{ id: 42, documentId: 'p-1', name: 'X', ... }`; after mount, `isFavorite('42') === true` and `addToFavorites` for `{ id: '42', ... }` is a no-op (no PUT).
    2. **PUT body contains only string IDs after mixed add/remove** — state holds one normalized favorite from numeric source, add one catalog string-ID favorite; capture PUT body at lines 210-213; assert every entry `typeof === 'string'`.
    3. **Remove with string `productId` matches a numeric-source favorite** — same numeric-source fixture; `removeFromFavorites('42')` succeeds, PUT body is `[]` (or `['<other-id>']`).
    Existing tests remain byte-identical. Cases fail until Task 5, Task 6, and Task 7 land.
  - **Tests**: existing test file, 3 new cases.
  - **Risks**: Mock drift; must use numeric-id Strapi shape, not string arrays.
  - **Depends on**: Task 1
  - **Diff est.**: +50 (per design §6)

### Phase T2 — GREEN (implement normalizer)

- [ ] **Task 4**: Implement `normalizeFavorite.ts` pure helper
  - **Phase**: T2 GREEN
  - **Files**: `src/features/favorites/services/normalizeFavorite.ts` (new)
  - **Acceptance**: Exports `normalizeFavorite(raw: unknown): Product | null` and `normalizeFavorites(raw: unknown): Product[]`. Field mapping from design §3.1 table is implemented exactly (every Strapi field has its defensive fallback). Null entries are dropped, never silently coerced to `{ id: '' }`. Module is pure (no I/O, no React, no hooks). Task 1's 7 tests now pass.
  - **Tests**: Task 1.
  - **Risks**: Real Strapi may include unknown fields (`slug`, `publishedAt`) — helper must ignore them (permitted by `Product` type's structural shape).
  - **Depends on**: Task 1
  - **Diff est.**: +50 (per design §6)

### Phase T3 — GREEN (wire service + type signature)

- [ ] **Task 5**: Wire `normalizeFavorites` into `getFavoritesService` and tighten return type to `Product[]`
  - **Phase**: T3 GREEN
  - **Files**: `src/features/favorites/services/getFavoritesService.ts` (modified)
  - **Acceptance**: Three precise line-level changes per design §3.2 table — add `Product` type import + `normalizeFavorites` import at line 1, change return type at line 11 to `Promise<{ favorites: Product[] } | { error: NextResponse }>`, change line 54 to `return { favorites: normalizeFavorites(payload.favorites ?? []) }`. Line 42 (`payload: { favorites?: unknown[] }`) stays — that `unknown[]` describes the JSON-parse boundary (honest). Error paths (lines 24-40, 502 handling) stay byte-identical. Task 2 tests now pass.
  - **Tests**: Task 2.
  - **Risks**: Type signature change (`unknown[]` → `Product[]`) touches a caller — `useFavorites.ts:44` and `src/app/api/favorites/route.ts:6-29` audited per design §8; no break expected (`Product[]` is JSON-serializable for the route).
  - **Depends on**: Task 2, Task 4
  - **Diff est.**: +5 / -5 (per design §6)

### Phase T4 — GREEN (egress coercion)

- [ ] **Task 6**: Add `String(f.id)` egress coercion in `useFavoritesApi`
  - **Phase**: T4 GREEN
  - **Files**: `src/features/favorites/hooks/useFavorites.ts` (modified)
  - **Acceptance**: Line 58 changes from `const favoriteIds = newFavorites.map(f => f.id)` to `const favoriteIds = newFavorites.map(f => String(f.id))`. One-line, surgical edit; no other lines change. State type `useState<Product[]>([])` at line 17 stays. Task 3 case 2 (`PUT body contains only string IDs after mixed add/remove`) now passes.
  - **Tests**: Task 3 case 2.
  - **Risks**: Defense-in-depth — must not change behavior for already-canonical inputs (already-string IDs round-trip identically).
  - **Depends on**: Task 5
  - **Diff est.**: +1 / -1 (per design §6)

### Phase T5 — GREEN (defensive context coercion)

- [ ] **Task 7**: Add defensive `String()` coercion in `FavoritesContext` membership checks
  - **Phase**: T5 GREEN
  - **Files**: `src/features/favorites/context/FavoritesContext.tsx` (modified)
  - **Acceptance**: Four precise line changes per design §3.5 table: line 44 `String(p.id) === String(product.id)`, line 53 `String(p.id) === String(productId)`, line 55 `String(p.id) !== String(productId)`, line 61 `String(p.id) === String(productId)`. `useEffect` at lines 36-40 and `clearFavorites` (lines 63-67) stay unchanged. Task 3 cases 1 and 3 now pass.
  - **Tests**: Task 3 cases 1 + 3.
  - **Risks**: None for canonical inputs (`String(x)` of a string is identity). UXW-01 contract (`FavoriteMutationResult`) stays byte-identical.
  - **Depends on**: Task 5 (Task 6 not strictly required; tests in Task 3 collectively require both Tasks 6 and 7)
  - **Diff est.**: +4 / -4 (per design §6)

### Phase T6 — SWEEP (regression guards + edge cases)

- [ ] **Task 8**: Tighten `updateFavoritesService.test.ts` body assertion + edge case regression guards
  - **Phase**: T6 SWEEP
  - **Files**: `src/features/favorites/services/__tests__/updateFavoritesService.test.ts` (modified)
  - **Acceptance**: Tighten the body assertion at lines 52-54 to enforce canonical string types per design §4.3 — `expect(body.favorites).toEqual(['p-1', 'p-2', 'p-3'])` and `expect(body.favorites.every((id: unknown) => typeof id === 'string')).toBe(true)`. Existing `validateFavoritesList` tests (lines 123-179) stay — `invalid_item` on `['p-1', 42, 'p-3']` is still the correct rejection (validator guards the contract; we send it valid input).
  - **Tests**: existing test file, tightened.
  - **Risks**: No production code in `updateFavoritesService.ts` (per design §3.3 — `validateFavoritesList` is the UXW-01 contract). This task is **test-only**; if the design changes, revert this task in isolation.
  - **Depends on**: Task 6
  - **Diff est.**: +15 (per design §6)

### Phase VERIFY

- [ ] **Task 9**: Boot check + manual smoke (user-run, mandatory merge gate)
  - **Phase**: VERIFY
  - **Files**: optionally `scripts/check-favorites-boot.sh` (per design §6 row 9; not required if user runs commands inline)
  - **Acceptance**: All three static gates from design §5.1 exit 0:
    - `npx tsc --noEmit` exits 0
    - `npm run lint` exits 0
    - `npx vitest run --maxWorkers=2` exits 0 with **all 8 prior tasks' tests passing** (no tests deleted, none skipped)
    Plus the **real dev-server boot check** (design §5.3, mandatory):
    - `curl -s -m 15 -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/` prints `HTTP 200`
    - `curl -s -m 15 http://localhost:3000/ | grep -i "useFavorites must be used"` exits 1 (no match in body)
    - Both must hold simultaneously; any failure blocks merge.
    Plus the **manual smoke** (design §5.4, **user-runs against real Strapi at `localhost:1337`, not the orchestrator** per playbook #1645-5):
    1. Login + add ≥1 favorite.
    2. Logout → login.
    3. Tap heart on a **second** product card on `/tienda` — must succeed (HTTP 200, no toast).
    4. Repeat tap on the same product (no-op) — no PUT.
    5. Remove the first product — must succeed.
    6. Capture DevTools PUT body, confirm `typeof === "string"` for every entry.
  - **Tests**: full suite, plus the boot check (design §5.3).
  - **Risks**: Boot check requires the dev server up — flaky in CI (per design §8). This cycle does not block on CI gating; local verify is sufficient.
  - **Depends on**: Tasks 1-8
  - **Diff est.**: +20 (optional script) (per design §6)

## Commit plan (work-unit-commits)

Aligns with `work-unit-commits` skill: each commit is independently reviewable, tests ride with the code they verify, and the commit story matches the strict-TDD phase ordering.

| Commit | Tasks | Scope | Message |
|--------|-------|-------|---------|
| 1 | Task 1, Task 2, Task 3 | Add failing tests across normalizer, service, context | `test(favorites): add RED coverage for ID canonicalization on sync` |
| 2 | Task 4 | Implement pure normalizer helper | `feat(favorites): add normalizeFavorite helper to canonicalize Strapi favorites` |
| 3 | Task 5 | Wire service + tighten return type | `refactor(favorites): return Product[] from getFavoritesService via normalizeFavorites` |
| 4 | Task 6 | Egress string coercion | `fix(favorites): coerce favorite IDs to string in PUT body` |
| 5 | Task 7 | Defensive context coercion | `fix(favorites): coerce both sides of ID membership checks in FavoritesContext` |
| 6 | Task 8 | Tighten validator body assertion | `test(favorites): tighten updateFavoritesService PUT body to require string IDs` |
| 7 | Task 9 | (No production code; verify gate + optional boot-check script) | `chore(favorites): add boot-check script for provider-nesting regression guard` (only if the script is added; otherwise this commit is dropped and the verify gate is executed before PR creation) |

Each commit keeps its tests with the behavior it verifies, per `work-unit-commits` rule "Keep tests with code". `gh pr create --base main` only.

## Out of scope (carry forward)

Per design §7 and proposal #1650/#1649 — explicitly NOT in these tasks:

- **H2** — `populate[favorites][populate]=*` query for `/favoritos` images. Separate ticket `BUG-FAVORITES-IMAGES-401`.
- **H3** — cross-user race on auth transition. Refuted by smoke #1651; no fix.
- **Backend Strapi changes.** Backend route at `src/app/api/favorites/route.ts:50-60` keeps its string-only validation contract.
- **Provider reordering in `src/app/layout.tsx`** — nesting already correct (post `5b06371`).
- **Strapi populate query change** to `populate[favorites][populate]=*` — out of scope per H2.

## Risks for the apply phase

Carried from design §8; none new from task decomposition.

| Risk | Severity | Mitigation |
|------|----------|------------|
| Real Strapi returns extra fields not in the normalizer mapping (`slug`, `publishedAt`) | Low | Normalizer is permissive — unknown fields ignored. `Product` type excludes them. |
| Type signature change (`unknown[]` → `Product[]`) breaks an unupdated caller | Low | Callers audited: `useFavorites.ts:44` (consumer; trust is now honored), `route.ts:6-29` (JSON-serializes `Product[]` cleanly). No other callers in tests beyond the ones updated. |
| Mock drift between test and real Strapi | Med | Tests use exact Strapi shape from smoke #1651 (numeric `id`, `documentId`, `name`, `price`, `stock`); explicitly forbidden: string-ID-only mocks (spec verification note). |
| Provider nesting regression (cart-cycle lesson) | Med | Mandatory dev-server boot check in Task 9 (`curl localhost:3000`); strict-TDD mocks cannot catch this. |
| `Product.id` future API accepts `string \| number` and defensive `String()` becomes wrong | Low | `Product.id: string` per `src/types/index.ts:11`; catalog already enforces `strapiProduct.id.toString()`. Defensive `String()` is a guard, not a behavior change. |
| Boot check requires dev server up — flaky in CI | Low | Verify runs locally with `npm run dev`. CI gating on boot is a follow-up ticket; this cycle does not block. |

## Guard contract (for downstream sdd-apply)

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low
```

`sdd-apply` should treat `chain strategy: size-exception` as a sentinel: the change is **under** the 400-line budget, so single PR is the resolved delivery mode. If the guard trips, treat it as `pending` and proceed with single PR (no exception needed).
