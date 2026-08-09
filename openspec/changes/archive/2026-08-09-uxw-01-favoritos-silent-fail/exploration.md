# Exploration: UXW-01 Favoritos Silent Fail

> **SDD Phase:** Explore (1/6) — read-only investigation.
> **Change slug:** `uxw-01-favoritos-silent-fail`
> **Topic key:** `sdd/UXW-01-favoritos-silent-fail/explore`
> **Date:** 2026-08-08

## Current State

Anonymous (logged-out) users can browse `/tienda` and `/tienda/[slug]` and tap the
heart icon, but nothing visibly happens. The system silently rejects the
request at the React state layer.

**Exact silent-fail sites** (`src/features/favorites/context/FavoritesContext.tsx`):

```tsx
// Line 40-46  addToFavorites
const addToFavorites = async (product: Product) => {
  if (!user) return                                  // ← silent
  if (favorites.some(p => p.id === product.id)) return
  ...
}

// Line 48-54  removeFromFavorites
const removeFromFavorites = async (productId: string) => {
  if (!user) return                                  // ← silent
  ...
}

// Line 59-62  clearFavorites
const clearFavorites = async () => {
  if (!user) return                                  // ← silent
  ...
}
```

`isFavorite(productId)` does **not** silently fail — it returns `false` for empty
`favorites`, which is correct. `useFavoritesApi` also never hits the API when
there is no user (the `useEffect` on line 34-38 gates `fetchFavorites` on `user`).

**Call sites that consume the silent-returning methods** (verified via
`codegraph_explore`):

| File | Line | What happens on no-user click |
|------|------|-------------------------------|
| `src/features/catalog/components/ProductCard.tsx` | 47-54 | `handleToggleFavorite` calls `addToFavorites`/`removeFromFavorites` → both return early → heart icon does not visually change. **SILENT.** |
| `src/features/catalog/components/ProductDetailClient.tsx` | 43-69 | `toggleFavorite` calls the same two methods → same silent behavior. The heart button stays un-filled. **SILENT.** |
| `src/features/favorites/components/FavoriteItemRow.tsx` | 18-20 | `handleRemoveFromFavorites` → silent. The heart in `/favoritos` is only ever rendered for already-loaded favorites, so this is unreachable for anonymous users in practice. |
| `src/app/favoritos/page.tsx` | (whole page) | Renders `FavoriteItemRow` from `useFavorites().favorites` which is always `[]` for anonymous users → empty state already. No silent fail here; the route is implicitly useless for anonymous users. |

**Existing test coverage:**

- ✅ `src/features/favorites/services/__tests__/getFavoritesService.test.ts` (145 LOC, exhaustive: URL, headers, 502 paths, success)
- ✅ `src/features/favorites/services/__tests__/updateFavoritesService.test.ts` (180 LOC: URL/body/headers, 502 paths, success, full `validateFavoritesList` matrix)
- ✅ `src/app/api/favorites/__tests__/route.test.ts` (per blast-radius — 401 path verified)
- ❌ **No tests** for `context/FavoritesContext.tsx` (the silent-fail source)
- ❌ **No tests** for `hooks/useFavorites.ts`
- ❌ **No tests** for `components/FavoriteItemRow.tsx`

**Test pattern available for L3:** `src/context/__tests__/AuthContext.test.tsx` uses
`vi.mock('next/navigation')` + `vi.mock('@/features/cart')` + a probe component.
`src/__tests__/context/CartContext.test.tsx` uses `renderHook` + `act` with a
wrapper Provider. Both patterns can be reused for FavoritesContext.

**Comparison with `cart` (the closest neighbor feature):**

`src/features/cart/context/CartContext.tsx` does **not** gate on user. It persists
to `localStorage` for *every* visitor (key `bv-beni-cart`, lines 28-59) and
hydrates from it on mount. Cart works fully for anonymous users — they can add,
remove, update quantity. So the favorites feature is **inconsistent** with cart
UX: cart says "anonymous works fine", favorites says "anonymous is invisible."

**API surface (no server change required for any level):**
`/api/favorites` GET and PUT both call `requireUser(request)` which returns 401
if `readSessionJwt(request)` finds no JWT cookie. The backend (Strapi at
`../e-commerce-relojes-bv-beni-api/`) is unaware of anonymous favorites.

**Important route correction:** the change description references
`/productos/[id]` but **that route does not exist**. The detail page lives at
`/tienda/[slug]` (file: `src/app/tienda/[slug]/page.tsx`). The heart in the
detail view is in `ProductDetailClient.tsx`, rendered from that page. Grid-card
hearts are in `ProductCard.tsx`, rendered by `FeaturedProducts` and
`CatalogContent`.

**Existing redirect pattern (for L1):** `router.push('/login?redirect=...')` is
already used in `src/app/mi-cuenta/pedidos/[orderId]/page.tsx:28`. However, the
`/login` page itself (`src/app/(auth)/login/page.tsx`) does not currently
consume the `redirect` query parameter — `LoginForm` always pushes to
`/mi-cuenta`. So L1's redirect-with-redirect-query may also need a small
follow-up on `LoginForm` to honor `?redirect=` (a known existing partial debt,
**out of scope for UXW-01 but worth flagging**).

**No toast/notification system exists** in the project. Reusing `ErrorMessage`
for L1's "info" feedback would be semantically wrong (it's `role="alert"` +
`aria-live="assertive"`, designed for failures). A new lightweight inline
prompt or modal is the cleanest fit.

## Affected Areas

- `src/features/favorites/context/FavoritesContext.tsx` — **primary fix site** (4 silent-return branches to remove or replace)
- `src/features/catalog/components/ProductCard.tsx` — heart icon consumer; needs to know whether to redirect or persist
- `src/features/catalog/components/ProductDetailClient.tsx` — heart button consumer; same as above
- `src/features/favorites/components/FavoriteItemRow.tsx` — minor consumer; already only reachable for authed users with loaded favorites
- `src/app/favoritos/page.tsx` — depends on the fix for which content it shows to anonymous visitors
- `src/features/favorites/index.ts` — may need to export a new utility (e.g., for localStorage migration in L2)
- `src/context/AuthContext.tsx` — already exposes `user`, `login`, `register`. L2 needs an `onLogin` callback hook for the merge step (or AuthContext listens for user transition itself).
- `openspec/specs/favorites/spec.md` — **new file** needed for any level if we want a formal delta contract.

## Approaches

The user explicitly requested three levels as **options to choose from** in the
proposal phase. Each is laid out below with the same shape so the proposal can
pick one cleanly.

### L1 — Feedback + login redirect (~60 LOC, smallest scope)

Heart click for an anonymous user shows a short inline prompt *"Iniciá sesión
para guardar favoritos"* and, on confirmation or after a brief delay, redirects
to `/login?redirect={currentPath}`. After successful login the user lands back
on the originating product page.

- **Implementation surface** (rough LOC):
  - `FavoritesContext.tsx`: remove the 3 silent `if (!user) return` branches → replace with a unified `if (!user) { setNeedsAuth(true); return }` (≈15 LOC)
  - New `usePromptForAuth()` hook or local state in the heart buttons (≈10 LOC)
  - `ProductCard.tsx` + `ProductDetailClient.tsx`: render the prompt before redirect (≈25 LOC)
  - `useFavoritesApi.ts`: no change (still no API call without user)
  - **No** `localStorage` persistence
- **Pros:**
  - Smallest, safest, lowest-risk. No new state outside React tree.
  - Aligned with existing redirects (`/mi-cuenta/pedidos/[orderId]/page.tsx`).
  - Honors Screaming Architecture — no new infrastructure layer.
  - Backend/SSOT untouched (no risk to Strapi).
  - Already-tested `/api/favorites` 401 path covers the server contract.
- **Cons:**
  - Anonymous user **cannot** save favorites — they must register before tapping the heart. This may reduce conversion.
  - Two-click cost (tap heart → tap "ir a login") feels heavier than other stores.
  - Requires the `/login` page to **eventually** honor `?redirect=` (currently doesn't — but that's existing debt, not a blocker for L1 itself; L1 simply passes the param and lets the existing flow continue to ignore it).
- **New spec delta needed?** Yes — a `favorites` capability spec with one Requirement: "Anonymous favorite interaction MUST prompt for authentication." Plus a small Scenario for the redirect URL format.
- **Effort:** Low. ~60 LOC + ~150 LOC of tests.
- **Breaking changes:** None. Existing authed UX is unchanged.

### L2 — localStorage for anonymous users + merge on login

Favorites work for everyone, anonymous or authed. Anonymous favorites persist
in `localStorage` under a dedicated key (e.g., `bv-beni-favorites`). On
successful `login` (or `register`), the local list is **merged** with the
server-side list and pushed via `PUT /api/favorites`. On `logout`, the merged
list stays in `localStorage` (so the same browser keeps its anonymous trail)
unless explicitly cleared.

- **Implementation surface** (rough LOC):
  - `FavoritesContext.tsx`: replace the silent `if (!user) return` with local-state branch that reads/writes `localStorage` (≈40 LOC)
  - Add `mergeAndPersist(localList, serverList)` pure function in `services/` (≈25 LOC)
  - `AuthContext.tsx` (or a dedicated effect in `FavoritesContext` listening to user transitions): on `user` becoming non-null, fetch server list, merge with local, PUT (≈30 LOC)
  - `useFavoritesApi.ts`: no change for PUT path; for GET, still gated by user
  - SSR safety: must guard `typeof window !== 'undefined'` (same pattern as CartContext lines 38-51)
  - **Optional small touch** on `LoginForm`/`RegisterForm` to surface a "se guardaron X favoritos" confirmation post-merge
- **Pros:**
  - Best UX for anonymous visitors — matches modern e-commerce expectations.
  - Aligns favorites with the cart feature (which already persists anonymously).
  - No data loss across sessions on the same browser.
  - Still no backend changes — Strapi contract unchanged.
- **Cons:**
  - More code, more edge cases: stale localStorage on a different device, dedup on merge, max-200 cap (already enforced server-side, but `MAX_FAVORITES` is 200 — needs to be respected client-side too before PUT).
  - PII concern (per AGENT.md "PII protection"): product IDs are non-personal, so `localStorage` is safe — but a short-expiration policy should still be considered if we ever start storing favorite metadata that could fingerprint users. Currently safe.
  - Merge UX is subtle: how do we dedupe when the same product is in both lists? (Most reasonable: union by id, with anonymous list taking freshness priority for ordering.)
  - Tests grow ~50% larger because we need hydration, hydration-after-login, conflict-merge, cap-respect cases.
- **New spec delta needed?** Yes — broader spec. At least three Requirements: "Anonymous favorites persist client-side", "On login, local list merges into server list", "On logout, local list is preserved (or optionally cleared)". Plus Scenarios for each merge case (intersection, disjoint, max-cap overflow).
- **Effort:** Medium. ~120-150 LOC + ~250 LOC of tests.
- **Breaking changes:** None observable for authed users. Anonymous behavior is the only change.
- **Cross-repo SSOT implication:** None. Backend at `../e-commerce-relojes-bv-beni-api/` is untouched. The merge happens client-side before the existing PUT — no new endpoint needed.

### L3 — Tests only

Add Vitest coverage for `context/FavoritesContext.tsx`, `hooks/useFavorites.ts`,
and `components/FavoriteItemRow.tsx`. This locks down the current behavior (so
any silent-fail regression is caught) and is the precondition for safely
implementing L1 or L2.

- **Implementation surface:**
  - `src/features/favorites/context/__tests__/FavoritesContext.test.tsx` (new, ~150 LOC)
  - `src/features/favorites/hooks/__tests__/useFavorites.test.ts` (new, ~80 LOC)
  - `src/features/favorites/components/__tests__/FavoriteItemRow.test.tsx` (new, ~80 LOC)
- **Pros:**
  - Zero UX change. Pure safety net. Honors strict TDD per `openspec/config.yaml` (`strict_tdd: true`) and AGENT.md.
  - Patterns already exist (`CartContext.test.tsx`, `AuthContext.test.tsx`) — direct copy-modify.
  - Smallest possible scope and risk.
- **Cons:**
  - Does **not** fix the user's reported bug (the heart still silently fails). It's a prerequisite, not a fix.
  - On its own, it answers the wrong question — "the test would *fail* right now, demonstrating the silent fail" without changing user-facing behavior.
- **New spec delta needed?** Optional. Could be the acceptance criteria for L1/L2 in the proposal, but L3 alone doesn't need a new spec — it just codifies existing behavior.
- **Effort:** Low. ~310 LOC of tests.
- **Breaking changes:** None.

### Recommended combination (for proposal phase to consider)

The user wrote the levels as **alternatives**, but L3 is implicitly a prerequisite
for either L1 or L2 (per strict TDD). Two pragmatic shapes:

1. **L1 + L3** — smallest scope, ships the fix and locks it down. Total ~210 LOC.
2. **L2 + L3** — bigger scope, but UX parity with `cart`. Total ~430 LOC.

Pure L3 alone does not address the user's reported issue; it only documents it.

## Recommendation

**Propose L1 + L3** as the recommended path. Reasoning:

- The user's three-level framing is "options" — the proposal phase should still
  present L1, L2, L3 separately so they can choose, but I recommend L1+L3.
- L1 is the smallest fix that **changes user-visible behavior** (which is what
  UXW = "UX Work" implies — bug + improvement scope). L2 is a feature
  enhancement and arguably belongs in a separate ticket (e.g., UXW-02).
- L3 is non-negotiable under strict TDD (`openspec/config.yaml:13`) — every
  implementation task must have a failing test first.
- L1's only real risk (the `/login` not honoring `?redirect=`) is existing
  debt, not new debt. Worth flagging but not blocking.
- L2 introduces merge complexity that deserves a dedicated change with its own
  spec; bundling it into UXW-01 would inflate scope and split the discussion.

If the user wants L2 anyway, that's fine — the proposal phase will let them
choose. This exploration has mapped the surface for either.

## Risks

- **L1 risk:** `/login` does not currently honor `?redirect=` → user is sent to
  `/mi-cuenta` instead of back to the product page. **Mitigation:** either accept
  the existing behavior (L1 still fixes the silent fail — the redirect just
  lands at `/mi-cuenta` like the rest of the app), or pair L1 with a 1-line
  `LoginForm` change to honor `redirect`. Document the latter as a follow-up
  suggestion.
- **L2 risk:** merge conflicts when a product is in both local and server
  lists, or when local list exceeds `MAX_FAVORITES = 200`. **Mitigation:**
  enforce `MAX_FAVORITES` client-side before PUT, document merge policy
  (union by id, local-list ordering wins).
- **L3 risk:** low — only adds tests. **Mitigation:** none needed.
- **Cross-repo risk:** none. Backend at `../e-commerce-relojes-bv-beni-api/`
  is untouched in all three levels. No SSOT change.
- **SSR risk (L2 only):** `localStorage` is browser-only. `FavoritesProvider`
  is `'use client'` already, but the initial render must guard `typeof window`.
  Same pattern as `CartContext` lines 38-51 — already established.
- **PII risk (L2 only):** AGENT.md flags persisting state with personal data
  in `localStorage`. Product IDs and metadata are non-personal, but if L2 ever
  evolves to store user-derived metadata (timestamps, notes), revisit the
  encryption / short-expiration rule.

## Ready for Proposal

**Yes.** All three levels are concrete enough that the proposal phase can
present them as a clear choice. The orchestrator should tell the user:

- The exact silent-fail sites (4× `if (!user) return` in `FavoritesContext.tsx`)
  are mapped.
- The route correction: `/productos/[id]` does **not** exist; the detail page
  is `/tienda/[slug]`.
- Three levels (L1 feedback+redirect, L2 localStorage, L3 tests) are laid out
  with effort, pros/cons, and SSOT implications.
- My recommendation: **L1 + L3** — fixes the bug, smallest scope, TDD-clean.
- The `/login?redirect=` follow-up is existing debt, **not a blocker** for L1.

The proposal phase can pick up the levels directly from the **Approaches**
section above.