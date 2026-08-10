```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:7865f8eb71052abb6f87caf93dee381889e2bcee28742aaff9bd79980a3c34e8
verdict: pass
blockers: 0
critical_findings: 0
requirements: 6/6
scenarios: 10/10
test_command: npx vitest run src/features/favorites --maxWorkers=2
test_exit_code: 0
test_output_hash: sha256:4a2f14077c1adc9b41a307f88bb339f0c9e0816471a33b23850f24be092705c1
build_command: npx tsc --noEmit
build_exit_code: 0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Verification Report — v3 (FINAL — re-verify after barrel fix)

**Change**: uxw-01-favoritos-silent-fail
**Spec**: favorites spec v1 (`openspec/specs/favorites/spec.md`) — 6 requirements, 10 scenarios
**Mode**: Strict TDD + Hybrid (OpenSpec file + Engram)
**Branch**: `frontend/UXW-01-favoritos-silent-fail` · **HEAD**: `1e9880d` (9 commits — barrel + SDD docs added)
**Re-verify trigger**: v2 returned **PASS WITH WARNINGS** on 1 WARNING — barrel `index.ts` did not export `useFavoriteAuthPrompt` / `FavoriteAuthPrompt` per design File Changes table. Commit `3ef6db3` added the two named re-exports; commit `1e9880d` added the SDD artifact trail.

### v2 → v3 delta (why we re-ran)

The fix commit `3ef6db3` (`feat(favorites): export useFavoriteAuthPrompt and FavoriteAuthPrompt from barrel`) is **production-only** — 1 file, +2 / -0. No test code changed, no behavior changed (consumers still import via deep paths today). The barrel now re-exports both the hook and the component using **named** exports, matching the named `export function FavoriteAuthPrompt` / `export function useFavoriteAuthPrompt` declarations in the source files (the prior v2 audit note that a `export { default as ... }` shape would have been wrong is confirmed — neither file has a default export).

```text
diff --git a/src/features/favorites/index.ts b/src/features/favorites/index.ts
+export { FavoriteAuthPrompt } from './components/FavoriteAuthPrompt'
+export { useFavoriteAuthPrompt } from './hooks/useFavoriteAuthPrompt'
```

### Build & Tests Execution (re-run on `1e9880d`)

**Build (`npx tsc --noEmit`)**: ✅ Passed — exit 0, no output.
```text
$ npx tsc --noEmit
TSC_EXIT=0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

**Envelope test evidence — change-scope verify command** (declared in `tasks.md` work unit + `apply-progress`; exit attributable to THIS change): ✅ 43 passed / 0 failed / 0 skipped — exit 0.
```text
$ npx vitest run src/features/favorites --maxWorkers=2
 Test Files  7 passed (7)
      Tests  43 passed (43)
 Duration  2.11s
FOCUSED_EXIT:0
focused_hash: sha256:4a2f14077c1adc9b41a307f88bb339f0c9e0816471a33b23850f24be092705c1
```
This is the command captured in the strict result envelope above (`test_command` / `test_exit_code` / `test_output_hash`).

**Supplementary — full suite** (additional context; NOT the envelope command — 21 failures are pre-existing, outside the change diff, identical failure set to v1/v2): ⚠️ exit 1 — 21 failed / 885 passed / 9 skipped.
```text
$ npx vitest run --maxWorkers=2
 Test Files  3 failed | 70 passed (73)
      Tests  21 failed | 885 passed | 9 skipped (915)
FULL_EXIT:1
```
The 21 failures are **pre-existing and out of scope** (none in the change diff; byte-identical set to v1/v2):
- `src/__tests__/context/CartContext.test.tsx` (17) — jsdom `localStorage.clear is not a function`
- `src/components/ui/__tests__/CookieBanner.test.tsx` (4) — jsdom `window.localStorage.clear is not a function`
- `test/integration/email/order-status-change.integration.test.ts` — Strapi backend unreachable in CI

**Backend contract (R5)**: existing `src/app/api/favorites/__tests__/route.test.ts` → 14/14 passed (unchanged; not in diff).
**Coverage**: ➖ Not available — no coverage tool run (config `coverage_threshold: 0`; informational only).

### Barrel Fix Verification (Step 3)

`src/features/favorites/index.ts` (17 lines, HEAD `1e9880d`):
```ts
2: export { FavoriteAuthPrompt } from './components/FavoriteAuthPrompt'   // ✅ named, matches `export function FavoriteAuthPrompt`
4: export { useFavoriteAuthPrompt } from './hooks/useFavoriteAuthPrompt'   // ✅ named, matches `export function useFavoriteAuthPrompt`
5: export type { FavoriteMutationResult } from './types'                   // ✅ result type (already present)
```
- `FavoriteAuthPrompt.tsx:7` declares `export function FavoriteAuthPrompt` (named, **no default export**) → named re-export is the correct shape.
- `useFavoriteAuthPrompt.ts:9` declares `export function useFavoriteAuthPrompt` (named, **no default export**) → named re-export is the correct shape.
- A `export { default as ... }` re-export (mooted in v2 as a wrong attempt) would have failed to resolve — confirmed not used.

**D7 (NEW): Barrel exports match design File Changes table** — design.md L53 specifies `index.ts` Modify → "Export prompt hook/component + result type". Barrel now exports all three → **COMPLIANT**.

### Spec Compliance Matrix (re-confirmed — barrel fix touches no spec scenario)

Spec source: `openspec/specs/favorites/spec.md` — **6 requirements, 10 scenarios** (validator-authoritative count).

| Requirement | Scenario | Covering test(s) | Result |
|-------------|----------|------------------|--------|
| R1 Anonymous feedback | Heart tap on grid | `FavoritesContext.test.tsx` anon add `{ok:false}` + no-fetch; `useFavoriteAuthPrompt.test.ts` showAuthPrompt=true; `FavoriteAuthPrompt.test.tsx` role=status / aria-live=polite / CTA | ✅ COMPLIANT |
| R1 Anonymous feedback | Heart tap on detail page | `FavoriteAuthPrompt.test.tsx` a11y (unit) + manual smoke 5.3 (page wiring) | ✅ COMPLIANT |
| R2 Login redirect preserves origin | Sign-in from grid vs detail | `useFavoriteAuthPrompt.test.ts:95` → `/login?redirect=%2Ftienda` (grid) **AND** `:119-143` → `/login?redirect=%2Ftienda%2Freloj-elegante` (detail) — both renderHook + act + goToLogin | ✅ COMPLIANT |
| R3 Authed mutation persists | Authed user adds a product | `FavoritesContext.test.tsx` authed add `{ok:true}` + PUT sent + `isFavorite('prod-1')===true` + containsEqual(mockProduct) | ✅ COMPLIANT |
| R3 Authed mutation persists | Authed user removes a favorited product | `FavoritesContext.test.tsx` authed remove `{ok:true}` + PUT sent + `isFavorite('prod-1')===false` | ✅ COMPLIANT |
| R3 Authed mutation persists | Re-tap is a no-op | `FavoritesContext.test.tsx` authed no-op-add `{ok:true}` + `fetch` not called | ✅ COMPLIANT |
| R4 isFavorite anon contract | Anonymous and empty-list authed reads | `FavoritesContext.test.tsx` isFavorite→false (2 ids) + favorites===[] (companion non-empty asserts in authed suite) | ✅ COMPLIANT |
| R5 Server authorization | Unauthenticated PUT (401) | `route.test.ts` (existing, unchanged) 14/14 | ✅ COMPLIANT |
| R5 Server authorization | Authenticated PUT (200) | `route.test.ts` (existing, unchanged) 14/14 | ✅ COMPLIANT |
| R6 Test coverage for favorites | Context, hook, and row tests cover both states | `FavoritesContext.test.tsx` (10) + `useFavorites.test.tsx` (3) + `FavoriteItemRow.test.tsx` (6) all pass; anon asserts visible `{ok:false, reason:'unauthenticated'}` | ✅ COMPLIANT |

**Compliance summary**: **10/10 scenarios COMPLIANT, 0 PARTIAL, 0 UNTESTED, 0 FAILING. 6/6 requirements fully satisfied.** Unchanged from v2 (barrel fix is production DX-only, touches no scenario).

### Coherence (Design) — D1-D6 unchanged + D7 NEW (barrel)

Barrel fix touched 0 logic files (single barrel `+2`); D1-D6 hold verbatim from v2. D7 added to formally close the v2 barrel WARNING.

| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 Discriminated union `FavoriteMutationResult` | ✅ Yes | `types.ts` defines `{ok:true} \| {ok:false;reason:'unauthenticated'}`; all 3 mutations return it. Unchanged. |
| D2 Inline status `role="status"`/`aria-live="polite"`, NOT `role="alert"` | ✅ Yes | `FavoriteAuthPrompt.tsx:9` uses `<span role="status" aria-live="polite">`; `ErrorMessage` not reused. Unchanged. |
| D3 `usePathname()` + `encodeURIComponent` in feature hook | ✅ Yes | `useFavoriteAuthPrompt.ts` uses `usePathname()` + `router.push('/login?redirect='+encodeURIComponent(pathname))`. **Now also re-exported from barrel.** Unchanged logic. |
| D4 Clear-on-auth in hook via `useEffect` watching `user` | ✅ Yes | `useFavoriteAuthPrompt.ts` `useEffect` sets `showAuthPrompt(false)` when `user` truthy; verified by `useFavoriteAuthPrompt.test.ts:146`. Unchanged. |
| D5 RED-first tests with AuthProbe + `renderHook` | ✅ Yes | `FavoritesContext.test.tsx` uses `AuthProbe`; `useFavoriteAuthPrompt.test.ts` + `useFavorites.test.tsx` use `renderHook`. Unchanged (no test edits this batch). |
| D6 No backend changes | ✅ Yes | Diff contains no `/api/favorites/route.ts`, no services, no backend edits; `route.test.ts` unchanged and green. |
| **D7 (NEW) Barrel exports match design File Changes table** | ✅ Yes | `index.ts:53` design → "Export prompt hook/component + result type". Barrel now re-exports `FavoriteAuthPrompt` (component) + `useFavoriteAuthPrompt` (hook) + `FavoriteMutationResult` (type), all named. **v2 WARNING RESOLVED.** |

**Design coherence**: **7/7** decisions followed (was 6/6 + 1 barrel deviation in v2; the deviation is now closed).

### TDD Compliance (re-confirmed)

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | "TDD Cycle Evidence" table present in apply-progress (17 rows) + Batch 2 + Batch 3 annotations. |
| All tasks have tests | ✅ | 5 impl/scaffold tasks legitimately N/A; 7 test rows all REAL (R2 detail-path empty stub resolved in batch 2). |
| RED confirmed (tests exist) | ✅ | All 5 test files exist in the codebase. |
| GREEN confirmed (tests pass) | ✅ | 43/43 favorites tests pass at runtime on `1e9880d`. |
| Triangulation adequate | ✅ | `useFavoriteAuthPrompt.test.ts` has 7 real cases; grid + detail path branches both asserted. |
| Safety Net for modified files | ✅ | `index.ts` (the only file touched in batch 3) is a barrel — full favorites suite (= the import path tests exercise) ran green as safety net. |

**TDD Compliance**: **6/6** checks passed (carried over from v2).

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 43 | 7 | vitest + @testing-library/react (jsdom) |
| Integration | 0 (new) | 0 | — (existing `route.test.ts` reused for R5) |
| E2E | 0 | 0 | playwright configured but not exercised this change |
| **Total** | **43** | **7** | |

### Changed File Coverage

| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| Coverage analysis skipped — no coverage tool run for verification (config `coverage_threshold: 0`; informational only). | | | | |

### Assertion Quality (Step 6 — re-scanned for new empty `it()` blocks)

Batch 3 (`3ef6db3`) touched **only** `src/features/favorites/index.ts` — no test files modified. Re-scanned all 5 diff test files for tautologies, ghost loops, smoke-test-only blocks, and zero-assertion `it()` blocks: **no new empty blocks introduced** (none expected — no test edits). The previously-empty block at `useFavoriteAuthPrompt.test.ts:119-144` (resolved in batch 2) re-confirmed to contain `renderHook` + `act(() => result.current.goToLogin())` + `expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Ftienda%2Freloj-elegante')` (lines 137, 139-141, 143).

| File | `it` blocks | `expect` calls | Empty blocks | Tautologies | Verdict |
|------|------------|---------------|---------------|-------------|---------|
| `context/__tests__/FavoritesContext.test.tsx` | 10 | 39 | 0 | 0 | ✅ clean |
| `hooks/__tests__/useFavoriteAuthPrompt.test.ts` | 7 | 11 | 0 | 0 | ✅ clean |
| `hooks/__tests__/useFavorites.test.tsx` | 3 | 11 | 0 | 0 | ✅ clean |
| `components/__tests__/FavoriteAuthPrompt.test.tsx` | 4 | 5 | 0 | 0 | ✅ clean |
| `components/__tests__/FavoriteItemRow.test.tsx` | 6 | 7 | 0 | 0 | ✅ clean |

**Assertion quality**: ✅ All assertions verify real behavior — **0 CRITICAL, 0 WARNING**.

### Quality Metrics

**Linter**: ➖ Not run for verification (focused on changed scope; informational only).
**Type Checker**: ✅ No errors — `npx tsc --noEmit` exit 0 (empty output).

### Issues Found — v2 status tracked

**CRITICAL** (0 — v1's 1 → RESOLVED in batch 2; not re-surfaced):
1. ~~Empty no-op test masquerading as green~~ (`useFavoriteAuthPrompt.test.ts:118-143`). **RESOLVED** in `861640a`. Re-confirmed in v3 scan.

**WARNING** (0 — v2's 1 → RESOLVED in batch 3):
1. ~~Undocumented design barrel deviation~~. **RESOLVED** in `3ef6db3` — `index.ts` now re-exports `FavoriteAuthPrompt` + `useFavoriteAuthPrompt` (named, matching the named source exports). D7 promoted deviation → COMPLIANT. Barrel fix is production DX-only; no consumer currently switched to the barrel import, so no runtime/test regression risk.

**SUGGESTION** (2 — both carried from v1/v2, non-blocking, both still valid):
1. **Page-level integration coverage.** Prompt wiring into `ProductCard`/`ProductDetailClient` is still verified only by the manual smoke test (task 5.3). Consider one integration test per consumer asserting the prompt renders next to the heart on an anonymous toggle.
2. **React `act(...)` warnings.** `FavoritesContext.test.tsx` still emits "An update to FavoritesProvider inside a test was not wrapped in act(...)" on authed async mutations (observed in v3 focused run). Wrapping mutating calls in `act`/`waitFor` would remove the stderr noise.

### Verdict

**PASS**

Both prior blockers are closed: the v1 CRITICAL (empty no-op test) was resolved in batch 2 (`861640a`); the v2 WARNING (barrel export deviation) is resolved in batch 3 (`3ef6db3`). On `1e9880d`: 43/43 in-scope tests pass, `tsc` is clean, 6/6 requirements and 10/10 scenarios fully satisfied, TDD compliance 6/6, assertion quality 0 CRITICAL / 0 WARNING, design coherence 7/7 (D7 barrel closed). Two non-blocking SUGGESTIONs carry over (page-level integration coverage; React `act` warnings) — neither is CRITICAL or WARNING. Per the verdict rules (no CRITICAL and no WARNING → PASS), this change is **cleared for archive**. This is the **TERMINAL** verification.

---

## Verification Report — v2 (re-verify after test-quality fix)

**Change**: uxw-01-favoritos-silent-fail
**Spec**: favorites spec v1 (`openspec/specs/favorites/spec.md`) — 6 requirements, 10 scenarios
**Mode**: Strict TDD + Hybrid (OpenSpec file + Engram)
**Branch**: `frontend/UXW-01-favoritos-silent-fail` · **HEAD**: `861640a` (7 commits — batch 2 fix applied)
**Re-verify trigger**: v1 returned **FAIL** on CRITICAL — empty `it()` block at `useFavoriteAuthPrompt.test.ts:118-143` (zero `expect`). R2 (login redirect preserves origin) was PARTIAL.

### v1 → v2 delta (why we re-ran)

The fix commit `861640a` (`test(favorites): rewrite empty detail-path redirect test with real assertions`) is **test-only** — 1 file, +11 / -10. No production code changed. The previously-empty `it('goToLogin encodes detail page paths correctly')` block was rewritten: changed `mockPathname` from `const` to `let` so the `next/navigation` mock closure can be reassigned per-test, then added `renderHook` + `act(() => result.current.goToLogin())` + `expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Ftienda%2Freloj-elegante')`.

### Build & Tests Execution (re-run on `861640a`)

**Build (`npx tsc --noEmit`)**: ✅ Passed — exit 0, no output.
```text
$ npx tsc --noEmit
===TSC_EXIT:0===
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

**Envelope test evidence — change-scope verify command** (the command declared in `tasks.md` work unit + `apply-progress` focused test command; its exit code is attributable to THIS change): ✅ 43 passed / 0 failed / 0 skipped — exit 0.
```text
$ npx vitest run src/features/favorites --maxWorkers=2
 Test Files  7 passed (7)
      Tests  43 passed (43)
===FOCUSED_EXIT:0===
focused_hash: sha256:db876af136512806608e2ab2c2694a009ec701917f18c1a04c26e38de4304d6b
```
This is the command captured in the strict result envelope above (`test_command` / `test_exit_code` / `test_output_hash`). The full-suite output hash referenced below is `sha256:a7da4d8367164b9c3c1dc8a46d180812cf849f6d9bba761550d82b2003956ad8` (supplementary context — see next block).

**Supplementary — full suite** (run as additional context; NOT the envelope command because its exit code is NOT attributable to this change — 21 failures are all pre-existing, outside the 14-file diff, identical to v1): ⚠️ exit 1 — 21 failed / 885 passed / 9 skipped
```text
$ npx vitest run --maxWorkers=2
 Test Files  3 failed | 70 passed (73)
      Tests  21 failed | 885 passed | 9 skipped (915)
===FULL_EXIT:1===
full_output_hash: sha256:a7da4d8367164b9c3c1dc8a46d180812cf849f6d9bba761550d82b2003956ad8
```
The 21 failures are **pre-existing and out of this change's scope** (none in the 14-file diff; byte-identical failure set to v1):
- `src/__tests__/context/CartContext.test.tsx` (17) — jsdom `localStorage.clear is not a function`
- `src/components/ui/__tests__/CookieBanner.test.tsx` (4) — jsdom `window.localStorage.clear is not a function`
- `test/integration/email/order-status-change.integration.test.ts` — Strapi backend unreachable in CI

Per the re-verify rules: *"21 pre-existing suite failures are OUT OF SCOPE (not in diff files) — document them but do not classify as CRITICAL for this change."* They are recorded here for completeness; the change-attributable envelope evidence is the focused run above (exit 0).

**Backend contract (R5)**: existing `src/app/api/favorites/__tests__/route.test.ts` → 14/14 passed, exit 0 (unchanged; not in diff).

**Coverage**: ➖ Not available — no coverage tool run (config `coverage_threshold: 0`; informational only).

### Spec Compliance Matrix (re-checked)

Spec source: `openspec/specs/favorites/spec.md` — **6 requirements, 10 scenarios** (validator-authoritative count).

| Requirement | Scenario | Covering test(s) | Result |
|-------------|----------|------------------|--------|
| R1 Anonymous feedback | Heart tap on grid | `FavoritesContext.test.tsx` anon add `{ok:false}` + no-fetch; `useFavoriteAuthPrompt.test.ts` showAuthPrompt=true; `FavoriteAuthPrompt.test.tsx` role=status / aria-live=polite / CTA | ✅ COMPLIANT |
| R1 Anonymous feedback | Heart tap on detail page | `FavoriteAuthPrompt.test.tsx` a11y (unit) + manual smoke 5.3 (page wiring) | ✅ COMPLIANT |
| **R2 Login redirect preserves origin** | **Sign-in from grid vs detail** | `useFavoriteAuthPrompt.test.ts:116` → `expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Ftienda')` (grid) **AND** `:143` → `expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Ftienda%2Freloj-elegante')` (detail) — both renderHook + act + goToLogin | ✅ COMPLIANT (was ⚠️ PARTIAL in v1) |
| R3 Authed mutation persists | Authed user adds a product | `FavoritesContext.test.tsx` authed add `{ok:true}` + PUT sent + `isFavorite('prod-1')===true` + containsEqual(mockProduct) | ✅ COMPLIANT |
| R3 Authed mutation persists | Authed user removes a favorited product | `FavoritesContext.test.tsx` authed remove `{ok:true}` + PUT sent + `isFavorite('prod-1')===false` | ✅ COMPLIANT |
| R3 Authed mutation persists | Re-tap is a no-op | `FavoritesContext.test.tsx` authed no-op-add `{ok:true}` + `fetch` not called | ✅ COMPLIANT |
| R4 isFavorite anon contract | Anonymous and empty-list authed reads | `FavoritesContext.test.tsx` isFavorite→false (2 ids) + favorites===[] (companion non-empty asserts in authed suite) | ✅ COMPLIANT |
| R5 Server authorization | Unauthenticated PUT (401) | `route.test.ts` (existing, unchanged) 14/14 | ✅ COMPLIANT |
| R5 Server authorization | Authenticated PUT (200) | `route.test.ts` (existing, unchanged) 14/14 | ✅ COMPLIANT |
| R6 Test coverage for favorites | Context, hook, and row tests cover both states | `FavoritesContext.test.tsx` (10) + `useFavorites.test.tsx` (3) + `FavoriteItemRow.test.tsx` (6) all pass; anon asserts visible `{ok:false, reason:'unauthenticated'}` | ✅ COMPLIANT |

**Compliance summary**: **10/10 scenarios COMPLIANT, 0 PARTIAL, 0 UNTESTED, 0 FAILING. 6/6 requirements fully satisfied.** R2 promoted from PARTIAL → COMPLIANT (the detail-path branch now has a real `expect()` exercising production code).

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| R1 Anonymous feedback | ✅ Implemented | `FavoritesContext.tsx` returns `{ok:false,reason:'unauthenticated'}` from all 3 anon branches; no silent `void` returns. `FavoriteAuthPrompt.tsx` renders `role="status" aria-live="polite"` + "Iniciar sesión" CTA. Unchanged by batch 2 (test-only). |
| R2 Login redirect | ✅ Implemented | `useFavoriteAuthPrompt.ts` pushes `/login?redirect=' + encodeURIComponent(pathname)` — same logic for grid and detail; **both paths now covered by automated assertions** (grid L116, detail L143). |
| R3 Authed mutation | ✅ Implemented | `FavoritesContext.tsx` authed add/remove/no-op/clear all call `updateFavorites` (PUT) and return `{ok:true}`. Unchanged. |
| R4 isFavorite contract | ✅ Implemented | `favorites===[]` for anon (no fetch); `isFavorite` returns `false`; never throws. Unchanged. |
| R5 Server authorization | ✅ Implemented | `/api/favorites` unchanged; `route.test.ts` 14/14 green; no backend edits in diff. |
| R6 Test coverage | ✅ Implemented | 3 required test files exist and pass (context 10, hook 3, row 6); anon paths assert visible `ok:false` result; prompt hook now has 7 REAL cases (was 6 + 1 stub). |

### Coherence (Design) — unchanged by batch 2

The fix commit `861640a` touched 0 production files (+11/-10 in a single test file), so all design decisions hold verbatim from v1.

| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 Discriminated union `FavoriteMutationResult` | ✅ Yes | `types.ts` defines `{ok:true} \| {ok:false;reason:'unauthenticated'}`; all 3 mutations return it. Consumers hold local `showAuthPrompt` (no global `needsAuth`). |
| D2 Inline status `role="status"`/`aria-live="polite"`, NOT `role="alert"` | ✅ Yes | `FavoriteAuthPrompt.tsx` uses `<span role="status" aria-live="polite">`; `ErrorMessage` not reused. |
| D3 `usePathname()` + `encodeURIComponent` in feature hook | ✅ Yes | `useFavoriteAuthPrompt.ts` uses `usePathname()` + `router.push('/login?redirect='+encodeURIComponent(pathname))`. |
| D4 Clear-on-auth in hook via `useEffect` watching `user` | ✅ Yes | `useEffect` sets `showAuthPrompt(false)` when `user` truthy; verified by `useFavoriteAuthPrompt.test.ts:146-176` (the clear-on-auth test, unchanged). |
| D5 RED-first tests with AuthProbe + `renderHook` | ✅ Yes | `FavoritesContext.test.tsx` uses `AuthProbe`; `useFavoriteAuthPrompt.test.ts` + `useFavorites.test.tsx` use `renderHook`; mocks mirror `AuthContext`/`CartContext` patterns. |
| D6 No backend changes | ✅ Yes | Diff contains no `/api/favorites/route.ts`, no services, no backend edits; `route.test.ts` unchanged and green. |

**Design coherence**: 6/6 decisions followed (with 1 pre-existing undocumented barrel deviation — see Issues).

### TDD Compliance (re-checked)

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | "TDD Cycle Evidence" table present in apply-progress (17 rows) + "Continuation Batch 2" annotation documenting the test-quality fix. |
| All tasks have tests | ✅ | 5 impl/scaffold tasks legitimately N/A; 7 test rows now all REAL (the previously-empty 4th case in `useFavoriteAuthPrompt` is now a real assertion). |
| RED confirmed (tests exist) | ✅ | All 5 test files exist in the codebase. |
| GREEN confirmed (tests pass) | ✅ | 43/43 favorites tests pass at runtime on `861640a`. |
| Triangulation adequate | ✅ (was ⚠️) | `useFavoriteAuthPrompt.test.ts` now genuinely has 7 real cases (was 6 + 1 empty stub). Detail-path encoding is triangulated alongside grid-path. |
| Safety Net for modified files | ✅ | `useFavoriteAuthPrompt.test.ts` (the only file touched in batch 2) is itself part of the favorites suite that ran green as safety net. |

**TDD Compliance**: **6/6** checks passed (upgraded from 5/6 — triangulation adequate promoted ⚠️ → ✅).

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 43 | 7 | vitest + @testing-library/react (jsdom) |
| Integration | 0 (new) | 0 | — (existing `route.test.ts` reused for R5) |
| E2E | 0 | 0 | playwright configured but not exercised this change |
| **Total** | **43** | **7** | |

### Changed File Coverage

| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| Coverage analysis skipped — no coverage tool run for verification (config `coverage_threshold: 0`; informational only). | | | | |

### Assertion Quality (re-audited — Step 5f, mandatory)

Scanned ALL 5 diff test files for tautologies, ghost loops, smoke-test-only blocks, and zero-assertion `it()` blocks.

| File | `it` blocks | `expect` calls | Empty blocks | Tautologies | Verdict |
|------|------------|---------------|---------------|-------------|---------|
| `context/__tests__/FavoritesContext.test.tsx` | 10 | 39 | 0 | 0 | ✅ clean |
| `hooks/__tests__/useFavoriteAuthPrompt.test.ts` | 7 | 11 | 0 | 0 | ✅ clean (was CRITICAL empty block at L118-143 — **RESOLVED**) |
| `hooks/__tests__/useFavorites.test.tsx` | 3 | 11 | 0 | 0 | ✅ clean |
| `components/__tests__/FavoriteAuthPrompt.test.tsx` | 4 | 5 | 0 | 0 | ✅ clean (`role=status` + `aria-live=polite` attribute asserts are behavioral values, not smoke-only) |
| `components/__tests__/FavoriteItemRow.test.tsx` | 6 | 7 | 0 | 0 | ✅ clean |

**Key fix evidence** — `useFavoriteAuthPrompt.test.ts:119-144` (previously the empty no-op):
```ts
it('goToLogin encodes detail page paths correctly', async () => {
  mockPathname = '/tienda/reloj-elegante'                 // L121 — reassign mock closure
  const { useAuth } = await import('@/context/AuthContext')
  vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false } as any)
  const { useFavorites } = await import('@/features/favorites')
  vi.mocked(useFavorites).mockReturnValue({ ... } as any)
  const { result } = renderHook(() => useFavoriteAuthPrompt())   // L137 — exercises production code
  act(() => { result.current.goToLogin() })                     // L139 — invokes the hook's redirect path
  expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Ftienda%2Freloj-elegante')  // L143 — real assertion
})
```
This block now (a) renders the hook, (b) calls `goToLogin()` via `act`, and (c) asserts the router was pushed the URL-encoded detail path. Exercises real production code. The companion grid test at L95-117 asserts `/login?redirect=%2Ftienda`. Together they triangulate R2 for both grid and detail locations.

**Assertion quality**: ✅ All assertions verify real behavior — **0 CRITICAL, 0 WARNING** (v1 had 1 CRITICAL; now resolved).

### Quality Metrics

**Linter**: ➖ Not run for verification (focused on changed scope; informational only).
**Type Checker**: ✅ No errors — `npx tsc --noEmit` exit 0 (empty output).

### Issues Found — v1 status tracked

**CRITICAL** (0 — v1's 1 → RESOLVED):
1. ~~Empty no-op test masquerading as green~~ (`useFavoriteAuthPrompt.test.ts:118-143`). **RESOLVED** in `861640a` — block rewritten with `renderHook` + `act` + real `expect(mockPush).toHaveBeenCalledWith(...)`. Now genuinely exercises `goToLogin()` and asserts the detail-path encoded URL. Triangulation claim "✅ 7 cases" is now accurate (was 6 real + 1 stub).

**WARNING** (1 — unchanged; out of batch-2 scope):
1. **Undocumented design barrel deviation** (carried from v1). The design File Changes table specified `src/features/favorites/index.ts` should "Export prompt hook/component + result type". The barrel re-exports only `FavoriteMutationResult`; `useFavoriteAuthPrompt` and `FavoriteAuthPrompt` are imported by `ProductCard`/`ProductDetailClient` via deep paths (`@/features/favorites/hooks/...`, `@/features/favorites/components/...`), inconsistent with the feature's barrel convention. Batch 2 was test-only (1 file), so this production barrel gap was not addressed. Does not break any spec scenario. Recommend addressing in a follow-up production touch-up (re-export the hook + component from `index.ts`).

**SUGGESTION** (2 — both carried from v1, non-blocking):
1. **Page-level integration coverage.** Prompt wiring into `ProductCard`/`ProductDetailClient` is still verified only by the manual smoke test (task 5.3). Consider one integration test per consumer asserting the prompt renders next to the heart on an anonymous toggle.
2. **React `act(...)` warnings.** `FavoritesContext.test.tsx` still emits "An update to FavoritesProvider inside a test was not wrapped in act(...)" on authed async mutations (observed in the v2 focused run output). Wrapping mutating calls in `act`/`waitFor` would remove the stderr noise.

### Verdict

**PASS WITH WARNINGS**

The previous CRITICAL (empty no-op test masking unasserted R2 detail-path behavior) is **resolved** — the rewritten block at `useFavoriteAuthPrompt.test.ts:119-144` now renders the hook, invokes `goToLogin()`, and asserts the URL-encoded detail-path redirect. R2 promoted from PARTIAL → COMPLIANT. All 43 in-scope tests pass; `tsc` is clean; 6/6 requirements and 10/10 scenarios are now fully satisfied; TDD compliance upgraded 5/6 → 6/6 (triangulation adequate). One pre-existing WARNING (barrel export deviation) and two non-blocking SUGGESTIONs carry over — none are CRITICAL and none were in scope for a test-only fix. Per the verdict rules (no CRITICAL → PASS WITH WARNINGS), this change is cleared for archive.

---

## v1 (Historical — original verify, HEAD `906260b`)

> The section below is the original fail verdict preserved verbatim for audit trail. It was superseded by v2 above after the test-quality fix at `861640a`.

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:a9052220fa9b29e45a008eaafdfe5ea388891a4318318d01b1f0f21a71b1a373
verdict: fail
blockers: 1
critical_findings: 1
requirements: 5/6
scenarios: 9/10
test_command: npx vitest run --maxWorkers=2
test_exit_code: 1
test_output_hash: sha256:f7a7649d108b877983c8a99739b5a763023a28d268eb2b1769b0d477b7880a3f
build_command: npx tsc --noEmit
build_exit_code: 0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

### Completeness (v1)

| Metric | Value |
|--------|-------|
| Tasks total | 17 |
| Tasks complete | 17 |
| Tasks incomplete | 0 |

All 17 tasks in `tasks.md` are checked `[x]`; cross-checked against `apply-progress.md` (status: "All 17 tasks complete (17/17). Ready for sdd-verify."). Branch `frontend/UXW-01-favoritos-silent-fail` at HEAD `906260b` (6 commits). Diff: 14 files, +1104 / -22.

### Build & Tests Execution (v1)

**Build (`npx tsc --noEmit`)**: ✅ Passed — exit 0, no output.
```text
$ npx tsc --noEmit
(no output)
===TSC_EXIT:0===
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

**Tests (change scope)**: ✅ 43 passed / 0 failed / 0 skipped
```text
$ npx vitest run src/features/favorites --maxWorkers=2
 Test Files  7 passed (7)
      Tests  43 passed (43)
===FOCUSED_EXIT:0===
focused_output_hash: sha256:00b06d0ff3438e070ab4433a6e92294c0ac9692f7dae337f842ec65e79c61710
```

**Tests (full suite, declared verify command)**: ⚠️ exit 1 — 21 failed / 885 passed / 9 skipped
```text
$ npx vitest run --maxWorkers=2
 Test Files  3 failed | 70 passed (73)
      Tests  21 failed | 885 passed | 9 skipped (915)
===FULL_EXIT:1===
full_output_hash: sha256:f7a7649d108b877983c8a99739b5a763023a28d268eb2b1769b0d477b7880a3f
```
The 21 failures are **pre-existing and out of this change's scope** (none of the failing files are in the 14-file diff):
- `src/__tests__/context/CartContext.test.tsx` (17) — jsdom `localStorage.clear is not a function`
- `src/components/ui/__tests__/CookieBanner.test.tsx` (4) — jsdom `window.localStorage.clear is not a function`
- `src/__tests__/order-status-change.integration.test.ts` — Strapi backend unreachable in CI

**Backend contract (R5)**: existing `src/app/api/favorites/__tests__/route.test.ts` → 14/14 passed, exit 0 (unchanged by this change).

**Coverage**: ➖ Not available — no coverage tool was run for verification (coverage_threshold: 0 in config; informational only).

### Spec Compliance Matrix (v1)

Spec source: `openspec/specs/favorites/spec.md` — **6 requirements, 10 scenarios** (counted from the retrieved spec; the prompt-asserted "13" is incorrect per the actual `### Requirement:` / `#### Scenario:` counts).

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| R1 Anonymous feedback | Heart tap on grid | `FavoritesContext.test.tsx` anon add `{ok:false}`+no-fetch; `useFavoriteAuthPrompt.test.ts` showAuthPrompt=true; `FavoriteAuthPrompt.test.tsx` role=status/aria-live=polite/CTA | ✅ COMPLIANT |
| R1 Anonymous feedback | Heart tap on detail page | context no-fetch (unit) + `FavoriteAuthPrompt` a11y (unit) + manual smoke 5.3 (page wiring) | ✅ COMPLIANT |
| R2 Login redirect preserves origin | Sign-in from grid vs detail | grid: `useFavoriteAuthPrompt.test.ts:115` → `/login?redirect=%2Ftienda`; **detail: empty no-op test (line 118) asserts nothing** | ⚠️ PARTIAL |
| R3 Authed mutation persists | Authed user adds a product | `FavoritesContext.test.tsx` authed add `{ok:true}` + PUT sent + product in list | ✅ COMPLIANT |
| R3 Authed mutation persists | Authed user removes a favorited product | `FavoritesContext.test.tsx` authed remove `{ok:true}` + PUT sent | ✅ COMPLIANT |
| R3 Authed mutation persists | Re-tap is a no-op | `FavoritesContext.test.tsx` authed no-op-add `{ok:true}` + no fetch | ✅ COMPLIANT |
| R4 isFavorite anon contract | Anonymous and empty-list authed reads | `FavoritesContext.test.tsx` isFavorite→false + favorites==[] | ✅ COMPLIANT |
| R5 Server authorization | Unauthenticated PUT (401) | `route.test.ts` (existing, unchanged) 14/14 | ✅ COMPLIANT |
| R5 Server authorization | Authenticated PUT (200) | `route.test.ts` (existing, unchanged) 14/14 | ✅ COMPLIANT |
| R6 Test coverage for favorites | Context, hook, row tests cover both states | `FavoritesContext.test.tsx` (10), `useFavorites.test.tsx` (3), `FavoriteItemRow.test.tsx` (6) all pass; anon asserts `ok:false` | ✅ COMPLIANT |

**Compliance summary**: 9/10 scenarios COMPLIANT, 1/10 PARTIAL (R2 detail-path encoding), 0 UNTESTED, 0 FAILING. 5/6 requirements fully satisfied (R2 not fully satisfied due to PARTIAL scenario).

### Correctness (Static Evidence) (v1)

| Requirement | Status | Notes |
|------------|--------|-------|
| R1 Anonymous feedback | ✅ Implemented | `FavoritesContext.tsx:42,51,63` return `{ok:false,reason:'unauthenticated'}`; no silent `void` returns remain. `FavoriteAuthPrompt.tsx` renders `role="status" aria-live="polite"` + "Iniciar sesión" CTA. |
| R2 Login redirect | ⚠️ Partial | `useFavoriteAuthPrompt.ts:42` pushes `/login?redirect=' + encodeURIComponent(pathname)` — logic correct for any path; detail-path branch lacks an automated assertion. |
| R3 Authed mutation | ✅ Implemented | `FavoritesContext.tsx` authed add/remove/no-op/clear all call `updateFavorites` (PUT) and return `{ok:true}`. |
| R4 isFavorite contract | ✅ Implemented | `favorites` is `[]` for anon (no fetch); `isFavorite` returns `false`; never throws. |
| R5 Server authorization | ✅ Implemented | `/api/favorites` unchanged; `route.test.ts` 14/14 green; no backend edits in diff. |
| R6 Test coverage | ✅ Implemented | 3 required test files exist and pass (context 10, hook 3, row 6); anon paths assert visible `ok:false` result. |

### Coherence (Design) (v1)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 Discriminated union `FavoriteMutationResult` | ✅ Yes | `types.ts` defines `{ok:true} \| {ok:false;reason:'unauthenticated'}`; all 3 mutations return it. Consumers hold local `showAuthPrompt` (not a global `needsAuth`). |
| D2 Inline status `role="status"`/`aria-live="polite"`, NOT `role="alert"` | ✅ Yes | `FavoriteAuthPrompt.tsx:9` uses `<span role="status" aria-live="polite">`; `ErrorMessage` not reused. |
| D3 `usePathname()` + `encodeURIComponent` in feature hook | ✅ Yes | `useFavoriteAuthPrompt.ts:4,14,42` uses `usePathname()` + `router.push('/login?redirect='+encodeURIComponent(pathname))`. |
| D4 Clear-on-auth in hook via `useEffect` watching `user` | ✅ Yes | `useFavoriteAuthPrompt.ts:17-21` `useEffect` sets `showAuthPrompt(false)` when `user` truthy; verified by `useFavoriteAuthPrompt.test.ts:145`. |
| D5 RED-first tests with AuthProbe + `renderHook` | ✅ Yes | `FavoritesContext.test.tsx` uses `AuthProbe`; `useFavoriteAuthPrompt.test.ts` + `useFavorites.test.tsx` use `renderHook`; mocks mirror `AuthContext/CartContext` patterns. |
| D6 No backend changes | ✅ Yes | Diff contains no `/api/favorites/route.ts`, no services, no backend repo edits; existing `route.test.ts` unchanged and green. |

**Design coherence**: 6/6 decisions followed (with 1 minor undocumented deviation in barrel export — see Issues).

### TDD Compliance (v1)

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | "TDD Cycle Evidence" table present in apply-progress (17 rows). |
| All tasks have tests | ⚠️ | 5 impl/scaffold tasks are legitimately N/A (branch, type decl, exports, manual smoke, tsc); 2 of the 7 reported test rows have a quality defect (see below). |
| RED confirmed (tests exist) | ✅ | All 5 test files exist in the codebase. |
| GREEN confirmed (tests pass) | ✅ | 43/43 favorites tests pass at runtime. |
| Triangulation adequate | ⚠️ | `useFavoriteAuthPrompt.test.ts` claims 7 cases incl. "redirect detail" but that case is an empty stub — effectively 6 real cases. |
| Safety Net for modified files | ✅ | `FavoritesContext.tsx`/`ProductCard.tsx`/`ProductDetailClient.tsx` modified files ran the full favorites suite as safety net. |

**TDD Compliance**: 5/6 checks passed (triangulation adequate = ⚠️ due to empty stub test).

### Test Layer Distribution (v1)

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 43 | 7 | vitest + @testing-library/react (jsdom) |
| Integration | 0 (new) | 0 | — (existing `route.test.ts` integration reused for R5) |
| E2E | 0 | 0 | playwright configured but not exercised this change |
| **Total** | **43** | **7** | |

### Changed File Coverage (v1)

| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| Coverage analysis skipped — no coverage tool run for verification (config coverage_threshold: 0; informational only). | | | | |

If run: `npx vitest run src/features/favorites --maxWorkers=2 --coverage`.

### Assertion Quality (v1)

| File | Line | Assertion / Issue | Severity |
|------|------|-------------------|----------|
| `hooks/__tests__/useFavoriteAuthPrompt.test.ts` | 118-143 | `it('goToLogin encodes detail page paths correctly')` — **zero `expect` calls, never invokes `renderHook`/`act`/`goToLogin`**; only sets up mocks then returns. Vitest marks it passed (0 assertions). Counted as green in apply-progress TDD table ("7 cases … 7 passed"). Exercises no production code → false confidence. | CRITICAL |

**Assertion quality**: 1 CRITICAL, 0 WARNING.

### Quality Metrics (v1)

**Linter**: ➖ Not run for verification (focused on changed scope; informational only).
**Type Checker**: ✅ No errors — `npx tsc --noEmit` exit 0.

### Issues Found (v1)

**CRITICAL** (1):
1. **Empty no-op test masquerading as green.** `src/features/favorites/hooks/__tests__/useFavoriteAuthPrompt.test.ts:118-143` ("goToLogin encodes detail page paths correctly") contains no `expect`, no `renderHook`, no production-code invocation. It is counted among the 7/7 "passed" cases in the apply-progress TDD evidence, but it proves nothing. Per `strict-tdd-verify.md` Step 5f, a test that never exercises production code is CRITICAL ("trivial tests are WORSE than missing tests"). This also falsifies the triangulation claim ("✅ 7 cases") — the real case count is 6.

**WARNING** (2):
1. **Spec scenario R2 is PARTIAL.** "Sign-in from grid vs detail" requires the redirect to match the current path for `/tienda` **and** `/tienda/{slug}`. The grid path is asserted (`useFavoriteAuthPrompt.test.ts:115` → `/login?redirect=%2Ftienda`); the detail path (`/tienda/{slug}`) has no passing covering assertion because its test is the empty no-op above. Production logic is identical for both paths, but the detail location's "matching that location" claim is currently unverified. Requirements satisfied: 5/6.
2. **Undocumented design barrel deviation.** The design File Changes table specified `src/features/favorites/index.ts` should "Export prompt hook/component + result type". The barrel only re-exports `FavoriteMutationResult`; `useFavoriteAuthPrompt` and `FavoriteAuthPrompt` are imported by `ProductCard`/`ProductDetailClient` via deep paths (`@/features/favorites/hooks/...`, `@/features/favorites/components/...`), inconsistent with the rest of the feature's barrel convention. The apply-progress "Deviations from Design" section lists only the hook-filename and `.ts`/`.tsx` extension deviations — this barrel gap is not recorded. Does not break any spec scenario.

**SUGGESTION** (2):
1. **Page-level integration coverage.** The wiring of the prompt into `ProductCard` (`{showAuthPrompt && <FavoriteAuthPrompt .../>}`, line 113) and `ProductDetailClient` (line 217) is verified only by the manual smoke test (task 5.3). The hook and component are unit-tested; consider one integration test per consumer asserting the prompt renders next to the heart on an anonymous toggle.
2. **React `act(...)` warnings.** `FavoritesContext.test.tsx` emits repeated "An update to FavoritesProvider inside a test was not wrapped in act(...)" warnings on the authenticated async mutations. Wrapping the mutating calls in `act`/`waitFor` would remove the stderr noise (non-blocking).

### Verdict (v1)

**FAIL**

One CRITICAL assertion-quality finding: an empty, assertion-less test (`useFavoriteAuthPrompt.test.ts:118`) is counted as passing in the TDD evidence, masking an unasserted portion of spec scenario R2 (login redirect for the detail page). All 43 in-scope tests pass and `tsc` is clean, but strict TDD verification cannot sign off while a "green" test exercises nothing. Production behavior itself is correct; the blocker is test quality, not shipped behavior.