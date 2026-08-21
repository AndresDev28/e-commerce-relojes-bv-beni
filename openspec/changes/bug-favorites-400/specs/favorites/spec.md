# Delta Spec: bug-favorites-400

`bug-favorites-400` delta — adds 1 requirement, modifies 0, removes 0.

> **Change**: `bug-favorites-400` — Fix `/api/favorites` 400 After Login
> **Source**: `openspec/changes/bug-favorites-400/proposal.md` (proposal Engram #1650, scope #1649, smoke #1651)
> **Capability**: `favorites` (existing spec at `openspec/specs/favorites/spec.md`)
> **Modified Capabilities**: `favorites` (one ADDED requirement)
> **Removed Capabilities**: None
> **New Capabilities**: None

## ADDED Requirements

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

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
