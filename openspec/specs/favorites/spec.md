# Favorites Specification

## Purpose

Define the favorite-interaction contract: anonymous vs. authenticated heart behavior, sign-in feedback, and the server authorization contract.

## Requirements

### Requirement: Anonymous Favorite Action Surfaces Visible Feedback

When an anonymous user activates any favorite mutation (`addToFavorites`, `removeFromFavorites`, `clearFavorites`), the system MUST surface visible feedback explaining that sign-in is required. The feedback MUST NOT be silent and MUST expose a sign-in action. It MUST use non-alert accessibility semantics (`role="status"`, `aria-live="polite"`) — not `role="alert"`.

#### Scenario: Heart tap on grid

- GIVEN an unauthenticated visitor is on `/tienda`
- WHEN the user activates the heart on a product card
- THEN a visible prompt appears explaining that sign-in is required
- AND the prompt exposes a navigation action to `/login`

#### Scenario: Heart tap on detail page

- GIVEN an unauthenticated visitor is on `/tienda/{slug}`
- WHEN the user activates the heart
- THEN the prompt appears next to the heart and no API call is sent

### Requirement: Login Redirect Preserves Origin

When the anonymous user accepts the sign-in action, the system MUST navigate to `/login?redirect={currentPath}`. The `currentPath` MUST be the path active when the heart was tapped.

#### Scenario: Sign-in from grid vs detail

- GIVEN an unauthenticated user on `/tienda` or `/tienda/{slug}`
- WHEN the user accepts the sign-in action
- THEN the browser navigates to `/login?redirect={currentPath}` matching that location

### Requirement: Authenticated Favorite Mutation Persists

When an authenticated user activates a favorite mutation, the system MUST persist the change via `/api/favorites` and update local state. Adding a non-favorited product MUST add it; removing a favorited product MUST remove it. `clearFavorites` MUST empty the server list.

#### Scenario: Authed user adds a product

- GIVEN an authenticated user with empty favorites
- WHEN the user taps the heart on a product card
- THEN the product appears at the top of the favorites list
- AND a `PUT /api/favorites` request is sent with the updated list

#### Scenario: Authed user removes a favorited product

- GIVEN an authenticated user with the product already favorited
- WHEN the user taps the heart
- THEN the product is removed locally and a `PUT /api/favorites` request is sent

#### Scenario: Re-tap is a no-op

- GIVEN an authenticated user with the product already favorited
- WHEN the user taps the heart via the add path again
- THEN no duplicate is appended and no redundant PUT is sent

### Requirement: `isFavorite` Contract for Anonymous Users

`isFavorite(productId)` MUST return `false` for any product ID when the user is unauthenticated. It MUST NOT throw and MUST NOT return `undefined`. The favorites list state MUST be `[]` for anonymous users.

#### Scenario: Anonymous and empty-list authed reads

- GIVEN an unauthenticated user OR an authed user with empty favorites
- WHEN `isFavorite('any-product-id')` is called
- THEN it returns `false`

### Requirement: Server Authorization Contract

The `/api/favorites` endpoint MUST reject unauthenticated mutation requests with a 401 response and MUST NOT mutate server state. This contract is independent of client behavior.

#### Scenario: Unauthenticated PUT

- GIVEN no valid session cookie is present
- WHEN a PUT request is sent to `/api/favorites`
- THEN the response status is 401 and the favorites list is not modified

#### Scenario: Authenticated PUT

- GIVEN a valid session cookie
- WHEN a PUT request is sent with a valid list
- THEN the response status is 200 and the list is persisted

### Requirement: Test Coverage for Favorites

`FavoritesContext`, the `useFavorites` hook, and `FavoriteItemRow` MUST have automated test coverage for both authenticated and anonymous paths. Anonymous-path tests MUST assert visible feedback (no silent return). The suite MUST run with `npx vitest run --maxWorkers=2`.

#### Scenario: Context, hook, and row tests cover both states

- GIVEN the test suite executes
- WHEN the three test files are collected
- THEN each covers both paths
- AND the anonymous-path tests assert visible feedback (not silent return)
### Requirement: Favorites ID Canonicalization on Sync

The favorites feature MUST canonicalize every product identifier to the `Product` type (`id: string`, `src/types/index.ts:10-19`) at the feature boundary, in both directions, so client state, membership checks, and the `PUT /api/favorites` body all operate on one canonical string type.

**Canonical type on entry.** When `GET /api/favorites` returns raw Strapi objects from `/api/users/me?populate=favorites` (numeric `id`, string `documentId` — `src/features/favorites/services/getFavoritesService.ts:16`), the favorites service MUST normalize each object to canonical `Product` shape — `id` coerced to string, all required fields present with safe fallbacks for fields Strapi omits — before the list reaches React state (`src/features/favorites/hooks/useFavorites.ts:44`).

**Canonical type on egress.** The `PUT /api/favorites` request body MUST contain string IDs only. The egress layer MUST coerce every ID to string (`src/features/favorites/hooks/useFavorites.ts:58`) even if a non-canonical object bypasses the ingestion path.

**Honest type signature.** `getFavoritesService` MUST declare its favorites list as `Product[]`, replacing the current `{ favorites: unknown[] }` signature (`src/features/favorites/services/getFavoritesService.ts:11`). The `unknown[]` type lie MUST be removed.

**Strict equality.** `isFavorite(productId)` and the add/remove membership checks (`src/features/favorites/context/FavoritesContext.tsx:44,53,55,61`) MUST compare canonical strings on both sides. A catalog string ID MUST match a previously persisted favorite whose source ID was numeric.

**UXW-01 contract intact.** The `FavoriteMutationResult` discriminated union (`src/features/favorites/types.ts:1-3`), the anonymous auth-prompt UX, and the "No se pudieron actualizar tus favoritos" error mapping MUST NOT change. The 400 is fixed at the boundary, not by altering the error contract. The server-side string-only `validateFavoritesList` contract (`src/features/favorites/services/updateFavoritesService.ts:24-28`, 400 at `src/app/api/favorites/route.ts:50-60`) is unchanged and remains the acceptance gate.

#### Scenario: GET response with numeric IDs from Strapi is normalized to string

- GIVEN an authenticated user with one previously persisted favorite
- AND Strapi `/api/users/me?populate=favorites` returns `{ favorites: [{ id: 42, documentId: "la670wea1ef", name: "Casio LA670WEA-1EF", price: 3990, href: "/tienda/casio-la670wea-1ef", description: "Reloj Casio vintage", stock: 5 }] }`
- WHEN the favorites GET path delivers the list to client state
- THEN the state entry has `id: "42"` with `typeof id === "string"` and `name`, `price`, `href`, `description`, `stock` preserved
- AND any field Strapi omits receives a safe fallback (`images: []`, `href: ""`, `description: ""`, `stock: 0`)

#### Scenario: GET response with already-string IDs is unchanged

- GIVEN the GET response already contains entries whose `id` values are strings
- WHEN the list is delivered to client state
- THEN every ID is byte-identical to the response value
- AND no entries are reordered, duplicated, or dropped

#### Scenario: PUT body for an add contains only string IDs

- GIVEN an authenticated user whose state holds one normalized favorite ingested from numeric source `id: 42`
- WHEN the user adds catalog product `{ id: "18", name: "Casio LA670WEA-8AEF", price: 4590, href: "/tienda/casio-la670wea-8aef", description: "Reloj Casio", stock: 3 }` via `addToFavorites`
- THEN the `PUT /api/favorites` body is `["18", "42"]` with `typeof === "string"` for every entry
- AND `validateFavoritesList` returns `{ valid: true }` (no `invalid_item`, no 400)

#### Scenario: PUT body for a remove contains only string IDs

- GIVEN an authenticated user whose state holds favorites `[{ id: "42", ... }, { id: "18", ... }]`, both normalized to strings
- WHEN the user calls `removeFromFavorites("18")`
- THEN the `PUT /api/favorites` body is `["42"]` with no numeric leftover
- AND the response status is 200

#### Scenario: isFavorite matches a favorite persisted with a numeric source ID

- GIVEN a favorite persisted server-side with numeric `id: 42`, normalized to `id: "42"` on ingestion
- AND the catalog exposes the same product with string `id: "42"` (`src/features/catalog/hooks/useProducts.ts:56`)
- WHEN `isFavorite("42")` is called
- THEN it returns `true`
- AND `addToFavorites` for that product is a no-op (no duplicate appended, no redundant PUT)

#### Scenario: Dev server boots without provider-nesting runtime errors

- GIVEN the change is applied and the Next.js dev server runs on port 3000
- WHEN `curl -s -m 15 -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/` is executed
- THEN it prints `HTTP 200`
- AND the rendered page contains no `useFavorites must be used within a FavoritesProvider` runtime error (`src/features/favorites/context/FavoritesContext.tsx:90`)

#### Scenario: UXW-01 anonymous contract is unchanged

- GIVEN an anonymous visitor on `/tienda`
- WHEN the visitor taps a product heart
- THEN `addToFavorites` returns `{ ok: false, reason: "unauthenticated" }` per the unchanged `FavoriteMutationResult` union
- AND the auth-prompt flow surfaces visible sign-in feedback per the existing "Anonymous Favorite Action Surfaces Visible Feedback" requirement
- AND no `PUT /api/favorites` request is sent

#### Verification (non-negotiable)

- **Real dev-server boot check**: after the change, `curl -s -m 15 -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/` MUST return `HTTP 200`, and the response body MUST contain no `useFavorites must be used within a FavoritesProvider` runtime error. The fix touches `useFavorites`/`FavoritesContext` (Context provider surface); strict-TDD mocks cannot catch provider-nesting regressions (playbook #1645-2). This check MUST run in the verify phase and is a merge gate, not a guideline.
- **Test command**: `npx vitest run --maxWorkers=2` MUST exit 0. New tests MUST mock numeric-ID Strapi responses reflecting real Strapi output; string-ID-only mocks are prohibited (exploration risk #6).

### Requirement: Favorites Hydrated From Server Renders Product Images

The favorites service MUST hydrate every favorited Product with renderable absolute image URLs at the feature boundary, so `/favoritos` shows real images after re-login without changing the canonical `Product.images: string[]` contract.

**Server query.** `getFavoritesService.ts:18` MUST nest-populate the Product media field — `image` (singular, per Strapi schema `e-commerce-relojes-bv-beni-api/src/api/product/content-types/product/schema.json:20-29`) — inside the `favorites` populate. The route uses the `users-permissions` plugin and bypasses the Product controller's `images→image` normalization, so the query MUST address `image` directly.

**Normalizer shape.** `normalizeFavorite.ts` MUST dual-key read the image field (`item.images ?? item.image ?? null`), coerce to array, and map every entry — Strapi `{ id, url }` — to an absolute URL prefixed with `NEXT_PUBLIC_STRAPI_API_URL` (fallback chain mirrors `formatProduct` at `useProducts.ts:33-65`). Zero-image Products normalize to `images: []` (NOT a placeholder URL); `FavoriteItemRow.tsx:33` keeps rendering `/images/placeholder.png` per decision #1669.

**Atomic ship.** Query and normalizer changes MUST land in the same commit. Splitting them ships a regression (objects inside a `string[]` crash Next.js Image at runtime) — `sdd-verify` MUST enforce this as a merge gate.

**Scope preserved.** The `Favorites ID Canonicalization on Sync` requirement (archive #1664) is unchanged. Shared `getStrapiImageUrl` extraction is deferred to a separate tech-debt cycle — this spec MUST NOT touch `formatProduct`.

#### Scenario: Re-login renders the previously-favorited Product image

- GIVEN an authenticated user has favorited a Product with `image: [{ id: 7, url: "/uploads/casio.jpg" }]` server-side
- AND the user logs out and logs back in
- WHEN the user navigates to `/favoritos`
- THEN each row renders `next/image` with `src` equal to `NEXT_PUBLIC_STRAPI_API_URL + "/uploads/casio.jpg"`
- AND no row falls back to `/images/placeholder.png`

#### Scenario: Product with zero images renders the placeholder

- GIVEN a favorited Product whose `image` field is empty server-side
- WHEN the user navigates to `/favoritos`
- THEN the row renders `next/image` with `src = "/images/placeholder.png"` (decision #1669 #1)

#### Scenario: Favorites added after re-login already render images

- GIVEN an authenticated user is browsing `/tienda` after re-login
- WHEN the user taps a heart on a product card
- THEN the new favorite appears in `/favoritos` with the catalog image immediately (catalog `formatProduct` unchanged — no regression)

#### Scenario: Mixed list — each row resolves independently

- GIVEN a list with three Products: one `image: [{ id, url }]`, one empty `image`, one `images: [{ id, url }]` (legacy plural)
- WHEN rendered on `/favoritos`
- THEN the first and third rows render their respective absolute URLs
- AND the second row renders `/images/placeholder.png`
- AND no row throws or shows a blank image

