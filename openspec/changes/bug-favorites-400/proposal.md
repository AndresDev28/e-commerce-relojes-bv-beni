# Proposal: bug-favorites-400 — Fix `/api/favorites` 400 After Login

> SDD Phase: Propose (2/6) · Date: 2026-08-21 · Author: sdd-propose agent
> Source: `docs/roadmapToProduction.md:105-109` · Exploration: Engram #1646 / `openspec/changes/bug-favorites-400/exploration.md`
> Scope decisions: Engram #1649 (H1 only; H2/H3 deferred to separate tickets)
> **Pre-design smoke evidence: Engram #1651 (H1 confirmed and DEEPENED; roadmap "hard refresh fixes it" claim FALSIFIED)**

## Why

`/api/favorites` returns 400 after login; the heart on `/tienda` shows "No se pudieron actualizar tus favoritos" (DevTools evidence 13/08/2026, roadmap lines 105-109). Exploration #1646 traced the only 400 producer on the PUT path: `validateFavoritesList` rejects any non-string entry (`src/features/favorites/services/updateFavoritesService.ts:24-28`), and the route returns 400 on `invalid_item` (`src/app/api/favorites/route.ts:50-60`).

Root cause H1 (confirmed + deepened by smoke #1651): the GET path stores Strapi favorites as **raw Strapi objects** (not just IDs) with numeric `id` field, returned by `populate=favorites` on Strapi v5 (`src/features/favorites/services/getFavoritesService.ts:16`). The service returns these objects without transformation (`getFavoritesService.ts:54` returns `unknown[]`), and the hook assigns them to `useState<Product[]>([])` (`src/features/favorites/hooks/useFavorites.ts:44`) — a type lie. Catalog products carry string IDs (`src/features/catalog/hooks/useProducts.ts:56`). `FavoritesContext.addToFavorites` mixes the two (`src/features/favorites/context/FavoritesContext.tsx:46`), and `updateFavorites` sends `newFavorites.map(f => f.id)` uncoerced (`useFavorites.ts:58`) → mixed `[string, number]` body → 400. Strict-equality membership checks (`FavoritesContext.tsx:44,53,55,61`) also silently break because `42 !== "LA670WEA-1EF"`.

**Smoke evidence (2026-08-21, Engram #1651)**: user reproduced the bug end-to-end against real Strapi. `LA670WEA-8AEF` persists in `/favoritos` after logout/login (state correct, **H3 refuted**), but the second add attempt in `/tienda` produces a 400 in DevTools (`api/favorites:1`) and the error message lights up on every card in the grid (single shared `error` field in `FavoritesContext`). Hard refresh (Ctrl+Shift+R) and F5 do NOT fix the bug — it is deterministic, not stale-state. The roadmap claim "hard refresh fixes it" is **falsified**: same input always produces same 400.

Impact: HIGH severity — authenticated users with ≥1 persisted favorite cannot add or remove favorites. Image-not-loading on `/favoritos` (H2) is a separate bug, out of scope per #1649.

## What changes

**Fix shape: Shape A — full Strapi→Product normalization on the frontend, at the favorites-feature boundary.**

The fix is more extensive than originally scoped: state holds raw Strapi objects, not `Product` shape. Three layers of normalization, all on the frontend:

1. **Ingestion normalization (primary fix)** — `src/features/favorites/services/getFavoritesService.ts:54`:
   Map each Strapi object to canonical `Product` shape (string `id`, all required fields with safe fallbacks for missing ones). Change return type from `{ favorites: unknown[] }` to `{ favorites: Product[] }`. This single change fixes the root cause: state becomes canonical, strict-equality membership works, PUT body is all-string.
2. **Type contract tightening** — propagate the new return type through `useFavoritesApi`, `FavoritesContext`, and any test mocks. Existing `unknown[]` lie in `getFavoritesService` becomes a typed `Product[]` — TypeScript will catch any consumer that assumed the old shape.
3. **Defensive egress coercion** — `src/features/favorites/hooks/useFavoritesApi.ts:58`: `favoriteIds = newFavorites.map(f => String(f.id))`. Last-line defense in case any consumer (e.g., a future `addToFavorites(product)` with a non-canonical object) bypasses the ingestion path.
4. **Defensive membership checks** — `src/features/favorites/context/FavoritesContext.tsx:44,53,55,61`: compare with `String(p.id) === String(productId)` to guard against any future divergence between the canonical state and a non-canonical input.

Vitest unit tests with realistic mocks: GET response returns numeric-ID Strapi objects (real shape); PUT body asserted all-string; mixed add/remove flows; existing string IDs passthrough; `FavoriteMutationResult` discriminated union contract intact. Run with `npx vitest run --maxWorkers=2`.

**Verify-phase requirement (mandatory, not a guideline)**: real dev-server boot check — `curl -s -m 15 -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/` returns 200 and the response body contains no `useXxx debe ser usado dentro de un XxxProvider` runtime error. The fix touches `useFavorites`/`FavoritesContext` (Context provider surface), and strict-TDD mocks cannot catch provider-nesting regressions (playbook #1645-2, cart-cycle precedent).

**Why Shape A over Shape B**: the frontend already declares `Product.id: string` (`src/types/index.ts:11`) and already canonicalizes catalog IDs (`useProducts.ts:56`); the canonicalization layer is the frontend feature boundary by established convention. Shape B (accept `string | number` in the route handler before `validateFavoritesList`) would push type laxness into the backend proxy, weaken the validated contract `updateFavoritesService.test.ts:135-151` already pins, and still not fix the broken `===` ID comparisons in `FavoritesContext`. Backend SSOT check: `favorites` is a Strapi manyToMany relation (`e-commerce-relojes-bv-beni-api/src/extensions/users-permissions/content-types/user/schema.json:69-74`) — integer PKs at DB level, string IDs are a frontend canonicalization concern, so no backend change is implied.

### Affected capabilities

- **Modified Capabilities**: `favorites` — one requirement added to the existing capability (ID canonicalization on the authenticated sync path). No existing requirement changes semantics; UXW-01 contract (`FavoriteMutationResult` discriminated union, auth prompt) untouched.
- **Removed Capabilities**: None.
- **New Capabilities**: None.

Delta spec to be authored by sdd-spec:

```yaml
- openspec/changes/bug-favorites-400/specs/favorites/spec.md
  + ADDED Requirements:
    - favorites-id-canonicalization: Favorites IDs Canonicalized to Strings Before Sync
  + MODIFIED Requirements: None
  + REMOVED Requirements: None
```

## Pre-design validation gate — PASSED

**Status: PASSED (Engram #1651, 2026-08-21)**

User ran the manual smoke against real Strapi + Next.js dev. Result:

- H1 (mixed ID types) **confirmed and deepened**: state holds raw Strapi objects with `id: number`, not normalized `Product` with `id: string`. Not just ID coercion — full Strapi→Product normalization needed.
- H2 (populate query) **confirmed**: `/favoritos` shows broken image (out of scope per #1649).
- H3 (cross-user race) **refuted**: state persists correctly across logout/login (`LA670WEA-8AEF` visible in `/favoritos` after round-trip).
- **Roadmap "hard refresh fixes it" claim FALSIFIED**: user observed 400 persists after Ctrl+Shift+R and F5. Bug is deterministic.

The pre-design gate is now cleared. sdd-spec and sdd-design can proceed on the updated Shape A. The remaining manual smoke (re-test the full flow against real Strapi) is in the verify phase.

## Out of scope

- **H2** — `populate=favorites` query doesn't nest-populate images (`getFavoritesService.ts:16`), so `/favoritos` shows placeholder. Separate ticket `BUG-FAVORITES-IMAGES-401` if user opens it.
- **H3** — cross-user race: `useFavoritesApi` doesn't reset `useState([])` on user change (`useFavorites.ts:17`). Separate ticket `BUG-FAVORITES-RACE-402` if user opens it.
- BUG-IMAGES-400, BUG-CART-PERSISTENCE (closed, PR #114), TEST-INFRA-E2E-LEGACY-AUTH (merged, PR #111), UXW-01 regressions (closed, PR #98 — contract must not break).
- Provider reordering in `src/app/layout.tsx` (nesting already correct post-5b06371), backend/Strapi schema changes, strict-TDD hygiene followups, e2e flakes.

## Risks

- **H1 doesn't explain "hard refresh fixes it"** — Med. Under pure H1, hard refresh should NOT fix it (mixed types persist). Most plausible: user misattribution or empty-server-list state. Pre-design smoke resolves this tension before any code is written.
- **Provider nesting regression** — Med. Fix touches `useFavorites`/`FavoritesContext`; verify phase MUST include the real dev-server boot check (mandatory requirement above).
- **UXW-01 `FavoriteMutationResult` contract regression** — Low. Discriminated union (`src/features/favorites/types.ts`) untouched by coercion; verify tests must cover it.
- **Backend SSOT risk** — Low. Backend SSOT (`../e-commerce-relojes-bv-beni-api/.agents/rules/bv-beni-watch-store.md`) makes Sequelize/Strapi models the source of truth; DB IDs are numeric (manyToMany relation), frontend canonicalizes to string — Shape A aligns. If smoke shows Strapi rejects all-string bodies, that is a separate backend bug (would surface as 502, not 400).
- **Mocks diverge from real Strapi** — Med. Existing tests mock string IDs while production receives numeric IDs (exploration risk #6). New tests MUST use numeric-ID mocks reflecting real Strapi output.

## Alternatives considered

- **Shape B** (coerce in `updateFavoritesService` route handler, accept `string | number`): rejected — weakens the validated server contract, pushes laxness into the backend proxy, doesn't fix `FavoritesContext` strict-equality bugs.
- **Option C from exploration** (Strapi returns `documentId` strings): rejected for this cycle — requires backend schema/API change, out of scope.
- **Status quo**: rejected — HIGH severity, breaks the authenticated post-login favorites flow.

## Review Workload Forecast

| Field | Value |
|---|---|
| Production LOC | 12-20 |
| Tests | 8-12 |
| Total diff estimate | 150-300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | ask-on-risk |

## Rollback Plan

Revert the PR. The coercion is a pure frontend normalization with no schema, migration, or persisted-format change: server already stores the relation by ID, and pre-fix behavior (400 on mixed body) returns. No data corruption risk; users revert to the current broken state, which is non-destructive.

## Dependencies

None external. Backend untouched; real Strapi needed only for the pre-design smoke gate (user-run) and optional manual verify.

## Success Criteria

- [ ] Pre-design smoke confirms H1 (numeric IDs in real GET response; mixed PUT body → 400)
- [ ] Vitest: GET response with numeric IDs → PUT body contains all-string IDs
- [ ] Vitest: mixed add/remove flows produce valid all-string bodies; string IDs passthrough unchanged
- [ ] Vitest: `FavoriteMutationResult` discriminated union contract intact
- [ ] Verify phase: real dev-server boot check — `curl localhost:3000` → HTTP 200, no `useXxx debe ser usado dentro de un XxxProvider` runtime error
- [ ] Manual smoke: login → add favorite → logout → login → tap heart → 200, no error message
- [ ] `npx tsc --noEmit`, `npm run lint`, `npx vitest run --maxWorkers=2` exit 0

## Next step

After user confirms this proposal and the pre-design validation gate passes:

`/sdd-spec bug-favorites-400`
