# Exploration: bug-favorites-400

> SDD Phase: Explore (1/6) · Date: 2026-08-21 · Author: sdd-explore agent
> Bug source: `docs/roadmapToProduction.md:105-109`

## Symptom (verbatim from roadmap)

> **BUG-FAVORITES-400** 🟡 HIGH (UX)
> - **Síntoma**: `/api/favorites` retorna 400 después de login. Botón favoritos en `/tienda` muestra "No se pudieron actualizar tus favoritos". `/favoritos` no carga imagen del producto. Hard refresh (Ctrl+Shift+R) lo arregla — sugiere stale client state.
> - **Evidencia**: DevTools console 13/08/2026 — `Failed to load resource: 400 (Bad Request) for /api/favorites:1`
> - **Sugerido**: Sprint 4 (independiente; root cause NO compartido con BUG-CART-PERSISTENCE según TEST-INFRA-VITEST findings)
> - **Estimación**: ~4-8 LOC + tests

## Repro (manual evidence)

The DevTools evidence is a single 400 status on `GET /api/favorites:1` (the `:1` is the Chrome line number in the network log — the URL is `/api/favorites`). The frontend hook at `src/features/favorites/hooks/useFavorites.ts:71` maps any non-OK response to the literal Spanish string `No se pudieron actualizar tus favoritos.` — this is the message the user sees in the `ErrorMessage` rendered by `ProductCard.tsx:132-140` and `ProductDetailClient.tsx:235-241`.

**Important**: the user-reported backend status is **400**, but the frontend error message is the generic "no se pudieron actualizar..." string. The 400 must come from the Next.js route's `validateFavoritesList` (which returns 400) — the `updateFavoritesService` maps ANY Strapi non-OK to 502, not 400. So the 400 is from the route, not the service.

## Current state — favorites feature

### Provider nesting (`src/app/layout.tsx:39-48`)

```
<AuthProviderWrapper>
  <CartProvider>
    <FavoritesProvider>
      <StripeProviderWrapper>
        <AppShell>{children}</AppShell>
        <CookieBanner />
      </StripeProviderWrapper>
    </FavoritesProvider>
  </CartProvider>
</AuthProviderWrapper>
```

`FavoritesProvider` is NESTED INSIDE `AuthProviderWrapper` (post-5b06371 cart-cycle reorder). This is correct: `FavoritesContext.tsx:33` consumes `useAuth().user` and the type-narrowing holds.

### Frontend callsites that hit `/api/favorites`

| Caller | File:line | Method | Body shape |
|--------|-----------|--------|------------|
| `fetchFavorites` | `src/features/favorites/hooks/useFavorites.ts:25-51` | GET | none |
| `updateFavorites` | `src/features/favorites/hooks/useFavorites.ts:53-82` | PUT | `JSON.stringify(favoriteIds)` where `favoriteIds = newFavorites.map(f => f.id)` |
| `test mocks` | `src/app/api/favorites/__tests__/route.test.ts:50-74` | GET | n/a |

`favoriteIds` is derived from `newFavorites[].id` — the `Product.id` field. **The Product type declares `id: string` (`src/types/index.ts:11`), but the actual values depend on the producer.**

### Backend handler for `/api/favorites`

`src/app/api/favorites/route.ts`:
- **GET** (lines 6-29): `requireUser` → `getFavoritesService({ jwtToken, traceId })` → returns `{ favorites: [...] }`. **No 400 path** for GET.
- **PUT** (lines 31-81): `requireUser` → `validateFavoritesList(body)` (lines 50-60) → `updateFavoritesService({ jwtToken, userId, favorites, traceId })`. **400 path is the validation**:
  - `invalid_shape` (body not array) → 400 "La lista de favoritos no es válida."
  - `too_many` (>200 items) → 400 "La lista de favoritos no puede tener más de 200 elementos."
  - `invalid_item` (any entry is not a non-empty string) → 400 "La lista de favoritos no es válida."

`validateFavoritesList` (`src/features/favorites/services/updateFavoritesService.ts:15-30`):
```ts
for (const id of value) {
  if (typeof id !== 'string' || !id.trim()) {
    return { valid: false, reason: 'invalid_item' }
  }
}
```

**This is the only 400 producer on the PUT path.** Explicitly tested in `src/features/favorites/services/__tests__/updateFavoritesService.test.ts:135-151` with `validateFavoritesList(['p-1', 42, 'p-3'])` → `invalid_item`.

Backend service (`src/features/favorites/services/updateFavoritesService.ts:32-69`): calls Strapi `${API_URL}/api/users/${userId}` PUT with body `{ favorites: [string_ids] }`. Any non-OK from Strapi is mapped to **502** (not 400).

### Auth reading pattern

Cookie-based session via `bv_session` (httpOnly, `src/lib/auth/session.ts:3`). `requireUser` (`src/lib/auth/validate-request.ts:11-86`) reads the JWT cookie, calls `${API_URL}/api/users/me` with `Bearer ${jwt}`, returns the user. **Returns 401 if no cookie, 502 if Strapi fails, 401 if Strapi 401.**

So `/api/favorites` cannot return 400 from auth flow. The 400 must come from `validateFavoritesList`.

### Recent changes affecting favorites flow

| Commit | Date | What it touched | Favorites impact |
|--------|------|-----------------|------------------|
| `b7a3568` | 2026-08-10 | UXW-01: inline auth prompt + login redirect + `images?: string[]` defensive fix | Fixed the `images[0]` crash on `/favoritos` page (3 components). Did NOT touch the validation or the put-body shape. |
| `5b06371` | 2026-08-20 | BUG-CART-PERSISTENCE: cart per-user key + removed `clearCart()` from logout + reordered layout | Reordered `src/app/layout.tsx` so `AuthProviderWrapper` wraps `CartProvider`. `FavoritesProvider` was already inside `AuthProviderWrapper` BEFORE the reorder, so favorites is unaffected — but the cycle proves the strict nest pattern is fragile and layout bugs hide. |
| `150a58c` | 2026-08-08 | Test review warnings close | Pure test cleanup. |
| `69c3cb0` | 2026-07-30 | Cookie-based `/api/favorites` tests | Established the cookie-based flow that's now in production. |

**No commit has touched `validateFavoritesList` or `getFavoritesService` since the 400 was first observed (13/08/2026).**

## Candidate root causes (ranked by likelihood)

### H1 (most likely) — Mixed ID types in PUT body: favorite-IDs from Strapi are numbers, validation expects strings

**Evidence:**
- `getFavoritesService.ts:54` returns `payload.favorites ?? []` AS-IS from Strapi's `/api/users/me?populate=favorites` response. Strapi v5 returns `favorites: [{ id: <number>, documentId: '<string>', name: ..., ... }]`.
- `useProducts.ts:56` converts the catalog's `StrapiProduct.id` (number) to string via `strapiProduct.id.toString()` before assigning to `Product.id`. So the catalog hands the frontend string IDs.
- `useFavoritesApi.ts:58`: `const favoriteIds = newFavorites.map(f => f.id)` — `f.id` is whatever was stored, no coercion.
- `validateFavoritesList` REJECTS non-string items (`updateFavoritesService.ts:24-28`).
- `updateFavoritesService.test.ts:135-151` explicitly tests the mixed-type case → `invalid_item` → 400.

**Flow that triggers 400:**
1. User is authenticated, `/api/favorites` GET returns the populated favorites (each with `id: number`).
2. User taps the heart on `/tienda`. `ProductCard.onToggleFavorite` → `useFavoriteAuthPrompt.handleToggleFavorite(product)` → `addToFavorites(product)`.
3. `FavoritesContext.addToFavorites` builds `updated = [product, ...favorites]` — mix of `string` (catalog) and `number` (server).
4. `updateFavorites(updated)` → `favoriteIds = newFavorites.map(f => f.id)` → mixed `[string, number, ...]`.
5. Body sent via `JSON.stringify` → mixed types in the array.
6. `validateFavoritesList` rejects → **400 "La lista de favoritos no es válida."**
7. Hook maps to "No se pudieron actualizar tus favoritos." in the UI.

**Why "Hard refresh fixes it" might be a misread:**
- After hard refresh, the user is typically on `/tienda` with the favorites list freshly fetched. If the user IMMEDIATELY taps the heart on a product that's NOT in their existing favorites, `updated = [product, ...favorites]` STILL has mixed types — so hard refresh should NOT fix it under this hypothesis.
- **Alternative explanation**: the user might be testing in a state where the server list is empty (no existing favorites). After login → server has no favorites → `favorites = []` → `updated = [product]` → 200. After hard refresh → same state. So hard refresh wouldn't visibly change anything.
- **Most plausible explanation**: the bug only manifests when the user has ≥1 existing favorite AND adds a new product. The user might have observed this transiently and incorrectly attributed the fix to hard refresh. **The proposal phase must confirm via a manual smoke test against real Strapi with the user's actual account.**

**Where to confirm/refute in design/apply:**
- Add a Vitest unit test that mocks `getFavoritesService` returning `{ favorites: [{ id: 5, name: 'X', ... }] }` (numeric IDs) and asserts the resulting PUT body has stringified IDs.
- Add a Vitest unit test for `validateFavoritesList` covering `String(id)` coercion at the service boundary.
- Manual smoke: log in, add a favorite, log out, log back in, tap a heart on a different product → expect 400 if hypothesis is correct.

**Fix sketch (for design phase, NOT now):**
- Option A: coerce at the service boundary — `getFavoritesService.ts:54` returns `favorites.map(f => ({ ...f, id: String(f.id) }))`.
- Option B: coerce at the hook boundary — `useFavoritesApi.ts:58` does `newFavorites.map(f => String(f.id))`.
- Option C: make Strapi return `documentId` (string) instead of `id` (number) — requires backend change.
- Recommended: **Option B** (smallest blast radius, single line in `useFavorites.ts`). Track Option A as a defense-in-depth if the hook is bypassed.

### H2 — Strapi populate query doesn't fetch images, so `/favoritos` shows placeholder

**Evidence:**
- `getFavoritesService.ts:16`: `fetch(${API_URL}/api/users/me?populate=favorites, ...)`. The `populate=favorites` populates the `favorites` relation but does NOT nest-populate `images` inside the products.
- `FavoriteItemRow.tsx:33`: `src={product.images?.[0] || '/images/placeholder.png'}`. If `images` is undefined → placeholder.
- A real Strapi response from `/api/users/me?populate=favorites` (no `populate[favorites][populate]=images`) returns Product objects with `id, name, slug, price, stock, ...` but `images` is undefined (null on the relation).

**Why this is a SEPARATE bug from the 400:**
- This bug is about **`/favoritos` page** (image doesn't load). The 400 is about `/api/favorites` (PUT validation rejects). They share the same root: the GET returns incomplete data. But the 400 is a code-with-mixed-types bug, the image bug is a missing-populate bug.
- The roadmap entry groups them under BUG-FAVORITES-400 (which is technically misleading). The image bug is technically a Strapi query bug, not a 400 bug.

**Where to confirm/refute:**
- Manual smoke: `GET /api/users/me?populate=favorites` (real Strapi) — check if `images` is populated. If not → H2 confirmed.
- Code change: `populate=favorites` → `populate[favorites][populate]=*` or `populate[favorites][populate]=images,category`.

**Fix sketch:**
- `getFavoritesService.ts:16`: change `populate=favorites` to `populate[favorites][populate]=*`. **1-line change.**
- Or: keep the existing query and add a separate hydration step that fetches missing fields by ID.

### H3 — `favorites` state persists across logout/login (cart-cycle analog)

**Evidence:**
- `useFavoritesApi.ts:17`: `useState<Product[]>([])` — local state, NOT reset on user change.
- `FavoritesContext.tsx:36-40`: useEffect fires `fetchFavorites()` on `user` change, but the OLD favorites stay in state until the new fetch completes.
- If a user logs out (clearing `user`) and a DIFFERENT user logs in, the new fetch returns the new user's favorites, but there's a race: the user could tap the heart BEFORE the fetch completes → the OLD user's favorites are still in state → the new user's PUT includes the OLD user's product IDs → Strapi rejects → 400.

**Why this is plausible but obscure:**
- Cross-user scenarios are real (shared browser, account switching). The roadmap says "BUG-CART-PERSISTENCE root cause was global localStorage key" — analogous bug class could exist for favorites in-memory state.
- But the user reports the bug AFTER login, not necessarily after a user switch. So this requires a more specific scenario.

**Where to confirm/refute:**
- Manual smoke: log in as user A, add 3 favorites, log out, log in as user B, tap a heart on /tienda → expect 400 if H3 is correct (B's update tries to write A's product IDs).
- Code change: clear `favorites` state on `user` change to null OR on user switch. `useFavoritesApi.ts` would need to listen to `user` and reset state.

**Fix sketch (for design phase, NOT now):**
- `useFavoritesApi.ts:18-20`: add `useEffect(() => { setFavorites([]); setError(null) }, [user])` (where `user` is passed in as a prop OR read via `useAuth`).
- Note: `useFavoritesApi` is a vanilla hook without `useAuth` dependency today. Coupling it is a design decision.

### H4 — `getFavoritesService` returns `favorites` as `unknown[]` but `useFavoritesApi.setFavorites` types it as `Product[]` — TypeScript lies

**Evidence:**
- `getFavoritesService.ts:11`: returns `{ favorites: unknown[] }`.
- `useFavoritesApi.ts:44`: `setFavorites(data.favorites ?? [])` — `data.favorites` is `unknown[]`, but stored as `Product[]`.
- `Product.id` is `string` per type, but values from Strapi are `number`.

**Why this is more of a coding-hygiene observation than a separate bug:**
- The types are wrong, but the runtime behavior is the same as H1. This is the type-level counterpart to H1's runtime bug.

**Fix sketch:** Same as H1 — coerce to `string` at the service boundary.

### H5 — Race condition: user taps heart before initial fetch completes

**Evidence:**
- `FavoritesContext.tsx:36-40`: `useEffect(() => { if (user) fetchFavorites() }, [user, fetchFavorites])`. The fetch is async.
- If the user taps the heart BEFORE the fetch resolves, `favorites` is `[]` (initial), and `addToFavorites` builds `updated = [product]` → 200 OK. So this doesn't cause 400.

**Why this is rejected:**
- Empty list → `updated = [product]` → valid → 200. No 400.

(Eliminated.)

### H6 — Strapi PUT endpoint rejects the request shape (e.g., expects `{ favorites: <array of integers> }` not strings)

**Evidence:**
- `updateFavoritesService.ts:42-50` sends `{ favorites: [string_ids] }` to Strapi.
- Strapi v5 might reject if the `favorites` field expects an array of integers (since the relation is many-to-many with integer IDs).

**Why this is possible but contradicted by tests:**
- `updateFavoritesService.test.ts:44-55` mocks the PUT request to Strapi and asserts the body shape. The test doesn't verify Strapi's response, just the request.
- The actual Strapi response would surface as 502 (mapped by the service), not 400 (which is the route's validation).

**Where to confirm/refute:**
- Manual smoke against real Strapi: log in, send a PUT with `["1", "2"]` (string IDs) and inspect Strapi's response. If Strapi returns 400 with "expected integers", the service should ideally coerce to integers before sending.
- **But** the user reports the 400, not 502. If Strapi returned 400, the service would map to 502. So either:
  - The 400 is from the route's `validateFavoritesList` (H1), not Strapi.
  - OR the service is bypassed somehow (unlikely).
- Most likely: H1 is the cause. The 400 from `validateFavoritesList` is the one the user sees.

(Eliminated as PRIMARY cause, but worth confirming in the design phase.)

## Open questions for the user (proposal preflight)

1. **Has the user actually observed the 400 in a multi-step scenario (login → add favorites → login → tap heart)** — i.e., is the bug only reproducible when the user has existing favorites, OR does it happen on a fresh-account first-tap? The "hard refresh fixes it" claim is incompatible with H1 being a pure mixed-types bug under all scenarios. Need to clarify what state the user was in when they hit the bug.

2. **Is the "no carga imagen del producto" symptom on `/favoritos` also reproducible on the `/tienda/[slug]` page** (where the user is authenticated and looking at a single product detail)? UXW-01 fixed `[0]` crashes but didn't enable the populate query. If the image is missing on `/favoritos` only, it's a separate Strapi query bug. If it's also missing on `/tienda/[slug]`, it's a different shape (catalog query, not favorites query).

3. **What's the desired behavior for the "favorites" field on Strapi** — should the frontend treat Strapi's `id` (number) and the catalog's `id` (string) as the same identifier, or should the frontend always use `documentId` (Strapi v5 string ID)? This is a downstream design decision that affects H1's fix shape.

4. **Should this cycle also fix the cross-user favorites state race** (H3)? Or is that out of scope and a separate ticket? The cart cycle closed analogous bugs, but the roadmap explicitly says "root cause NO compartido con BUG-CART-PERSISTENCE".

5. **Is the 4-8 LOC estimate still realistic** given the populate-query fix (H2) is a separate concern? Or should the cycle scope H1 + H2 together?

## Out of scope (explicit)

- BUG-IMAGES-400 (separate ticket, `/next/image` 400 — different symptom, different root cause).
- BUG-CART-PERSISTENCE (already closed as PR #114).
- TEST-INFRA-E2E-LEGACY-AUTH (already closed as PR #111).
- UXW-01 silent-fail fixes (already closed as PR #98).
- `no-op` `dependencies` warnings (Strict TDD followups — defer to a separate hygiene cycle).
- Browser `next/image` optimization config (BUG-IMAGES-400 territory).
- Touching `AuthContext` layout nesting (already correct post-5b06371).
- Backend Strapi changes (any schema/migration work — would be a separate cycle).

## Estimated scope (LOC + tests)

Roadmap said ~4-8 LOC + tests. Revised estimate based on findings:

- **H1 fix**: 1-2 LOC production (coerce `f.id` to `String` in `useFavoritesApi.ts:58`) + 3-4 Vitest unit tests (mixed types produce string body, single numeric ID, existing string IDs passthrough).
- **H2 fix** (if in scope): 1 LOC production (`populate[favorites][populate]=*` in `getFavoritesService.ts:16`) + 1-2 Vitest tests verifying the new query string.
- **H3 fix** (if user wants it): 3-5 LOC production (`useFavoritesApi` resets `favorites` on user change) + 2-3 Vitest tests.
- **Docs**: roadmap correction (1 line), `openspec/changes/bug-favorites-400/` artifacts.

**Conservative estimate**: ~6-12 LOC production + 5-8 tests (within 400-line budget comfortably; single PR).

## Risks

1. **The "hard refresh fixes it" claim is unreliable evidence**. The user may be misattributing the fix. The proposal phase MUST do a manual smoke test against real Strapi to confirm the actual repro. If H1 is correct, the bug is a one-line code fix; if H3 is also correct, the fix is 5-line code + state-reset helper.
2. **Symptom grouping mismatch in the roadmap**. The 400 on `/api/favorites` and the missing image on `/favoritos` may be the same root cause (incomplete Strapi payload) OR independent bugs. If they're INDEPENDENT, the cycle scope is ~2-3 LOC production + tests; if same root cause, the fix is the populate query string in one place.
3. **Regression risk to the UXW-01 fixed behavior**. The UXW-01 cycle (PR #98) wired the auth prompt and the FavoriteItemRow image fallback. Touching `getFavoritesService` or `useFavoritesApi` must not break the `FavoriteMutationResult` discriminated union contract already in use.
4. **Type lie risk**. `Product.id` is declared `string` but `getFavoritesService` returns numeric IDs from Strapi. Coercing at the service boundary (Option A) is safest; coercing at the hook boundary (Option B) is smallest. Either way, the type annotation is wrong; a future refactor could re-introduce the bug.
5. **Cart-cycle-provider-order-replay risk**. The cart cycle had a layout integration bug that surfaced POST-verify (discovered by user at runtime). The favorites cycle MUST include a real dev-server boot check in the verify phase (per playbook lesson #1645-2), not just vitest. The current vitest test mocks `useAuth` directly so the provider-nesting bug class can't be caught.
6. **No-Strapi-for-frontend-tests risk**. The frontend tests mock `getFavoritesService` with string IDs. The actual Strapi response has numeric IDs. The test suite passes while the production bug persists. The fix MUST be tested with mocks that reflect real Strapi output.

## Next step

`/sdd-propose bug-favorites-400` will draft a proposal based on this exploration. The proposal will:

1. Confirm scope with the user (H1 alone vs H1+H2 vs H1+H2+H3).
2. Lock the design decision (coercion at service vs hook boundary).
3. Write spec/design/tasks for the apply phase.

The open questions above will be presented to the user before the proposal is locked.
