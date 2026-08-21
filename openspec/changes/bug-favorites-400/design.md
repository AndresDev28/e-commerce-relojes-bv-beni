# Technical Design — `bug-favorites-400`

> **SDD Phase:** Design (4/6) · **Date:** 2026-08-21 · **Author:** orchestrator (manual bypass — see `discovery/bug-favorites-400-dispatch-latched-second-occurrence`)
> **Source artifacts:** `openspec/changes/bug-favorites-400/proposal.md` (#1650) · `openspec/changes/bug-favorites-400/specs/favorites/spec.md` (#1652) · smoke evidence (#1651) · scope decisions (#1649)
> **Capability:** `favorites` (existing spec at `openspec/specs/favorites/spec.md`, UXW-01 untouched)

## 1. Goal

Eliminate the `/api/favorites` 400 that fires after login when a user with one or more persisted favorites adds or removes a second favorite, while preserving the UXW-01 `FavoriteMutationResult` discriminated union, the anonymous auth-prompt flow, and the existing error messages.

The root cause is **not** just ID-type coercion at egress (the original Shape A proposal). Smoke evidence #1651 confirms it: the favorites state holds **raw Strapi objects** with `id: number`, `documentId: string`, and partial field coverage. The canonical `Product` shape (`src/types/index.ts:10-19`) requires `id: string` plus `name`, `price`, `images?`, `href`, `description`, `category?`, `stock`. The 400 fires because the existing type lie (`{ favorites: unknown[] }`) lets numeric IDs through `useFavoritesApi.updateFavorites` (`useFavorites.ts:58`) and into the `validateFavoritesList` strict-string check (`updateFavoritesService.ts:24-28`).

## 2. Architecture decision

Three-layer fix, ordered by trust:

1. **Ingestion normalization (canonical)** — convert every raw Strapi favorite to a canonical `Product` *before* the list reaches React state. New pure helper `normalizeFavorites` lives next to `getFavoritesService` and is the only place that knows the Strapi favorite shape.
2. **Egress coercion (defense in depth)** — `useFavoritesApi.updateFavorites` coerces every ID to string before assembling the PUT body, even if a non-canonical object somehow bypasses ingestion.
3. **Strict-equality defensive coercion (last line)** — `FavoritesContext` membership checks coerce both sides of the comparison to string, so a numeric source ID and a string catalog ID always match.

This mirrors the catalog boundary pattern at `src/features/catalog/hooks/useProducts.ts:33-65` (`formatProduct`) where Strapi objects are converted to canonical `Product` at the feature edge.

## 3. Component changes

### 3.1 NEW: `src/features/favorites/services/normalizeFavorite.ts`

Pure helper, no I/O, no React, no hooks. Two exported functions:

```ts
// src/features/favorites/services/normalizeFavorite.ts
import type { Product } from '@/types'

/**
 * Map one raw Strapi favorite to a canonical Product.
 * Returns null when the raw value is not a usable object
 * (lets the caller drop the entry instead of crashing the whole list).
 */
export function normalizeFavorite(raw: unknown): Product | null

/**
 * Map a list of raw Strapi favorites to canonical Products.
 * Silently drops entries that fail normalizeFavorite.
 * Returns an empty array for any non-array input.
 */
export function normalizeFavorites(raw: unknown): Product[]
```

**Field mapping rules** (each Strapi field has a defensive fallback):

| Canonical `Product` field | Strapi source | Fallback if missing |
|----------------------------|---------------|---------------------|
| `id` | `raw.id` (number) | `String(raw.documentId ?? '')` if id is absent; null entry if both absent |
| `name` | `raw.name` (string) | `'Sin nombre'` |
| `price` | `raw.price` (number) | `0` |
| `images` | n/a — Strapi `populate=favorites` does not return images (H2 out of scope per #1649) | `[]` |
| `href` | `raw.href` (string) — only present on Strapi v4 setups | `''` |
| `description` | `raw.description` (string\|StrapiBlock[]) | `''` (StrapiBlock[] falls back to `''` because the UI does not render Strapi blocks) |
| `category` | not returned by Strapi `populate=favorites` | `undefined` |
| `stock` | `raw.stock` (number) | `0` |

Notes:
- `id` is the canonical anchor. Always coerced with `String(...)`. `documentId` is a Strapi v5 convenience; the canonical id is still the Strapi primary key because the backend route at `src/app/api/favorites/route.ts:50-60` validates string IDs and the catalog sends `strapiProduct.id.toString()` (`useProducts.ts:56`).
- The helper **does not** normalize StrapiBlock `description` content. Out of scope. UI consumers (`FavoriteItemRow`, `ProductCard`) already handle the string fallback.
- Null entries are dropped, never silently coerced to `{ id: '' }`. An empty id would never match a catalog product anyway.

### 3.2 EDIT: `src/features/favorites/services/getFavoritesService.ts`

Three precise line-level changes:

| Line | Current | New |
|------|---------|-----|
| 1 (imports) | `import { NextResponse } from 'next/server'` + `import { API_URL } from '@/lib/constants'` | Add `import type { Product } from '@/types'` and `import { normalizeFavorites } from './normalizeFavorite'` |
| 11 (return type) | `Promise<{ favorites: unknown[] } \| { error: NextResponse }>` | `Promise<{ favorites: Product[] } \| { error: NextResponse }>` |
| 54 (return) | `return { favorites: payload.favorites ?? [] }` | `return { favorites: normalizeFavorites(payload.favorites ?? []) }` |

**Line 42 (`payload: { favorites?: unknown[] }`) stays as-is.** The `unknown[]` here describes the **JSON parse boundary** (we don't trust the wire shape) — that is honest and stays. The type lie removed in line 11 is the one that leaked into the React state via `useFavorites.ts:44`.

**Error paths are NOT touched** (502 handling at lines 24-40 stays byte-identical — the existing tests `getFavoritesService.test.ts:53-114` are regression guards).

### 3.3 EDIT: `src/features/favorites/services/updateFavoritesService.ts`

**No production code changes.** `validateFavoritesList` (lines 15-30) is the UXW-01 contract — `invalid_item` on non-string is the desired rejection. The fix is to send valid bodies, not to relax validation.

**Test tightening** (see §4.3).

### 3.4 EDIT: `src/features/favorites/hooks/useFavorites.ts`

One precise line change:

| Line | Current | New |
|------|---------|-----|
| 58 | `const favoriteIds = newFavorites.map(f => f.id)` | `const favoriteIds = newFavorites.map(f => String(f.id))` |

This is the defense-in-depth egress coercion. Even if a future code path bypasses the ingestion normalizer and feeds a non-string ID into `updateFavorites`, the body still contains only strings and the validator accepts.

The state type `useState<Product[]>([])` at line 17 stays. The hook still trusts its input — but the service now provides a typed list (`Product[]` from §3.2), so the trust is no longer misplaced.

### 3.5 EDIT: `src/features/favorites/context/FavoritesContext.tsx`

Four precise line changes for defensive coercion. `String(p.id)` on the left handles any historical non-canonical entry that survives ingestion normalization; `String(productId)` on the right handles any caller that passes a number-typed ID by mistake.

| Line | Current | New |
|------|---------|-----|
| 44 | `if (favorites.some(p => p.id === product.id))` | `if (favorites.some(p => String(p.id) === String(product.id)))` |
| 53 | `if (!favorites.some(p => p.id === productId))` | `if (!favorites.some(p => String(p.id) === String(productId)))` |
| 55 | `const updated = favorites.filter(p => p.id !== productId)` | `const updated = favorites.filter(p => String(p.id) !== String(productId))` |
| 61 | `favorites.some(p => p.id === productId)` | `favorites.some(p => String(p.id) === String(productId))` |

The `useEffect` at lines 36-40 and `clearFavorites` (lines 63-67) stay unchanged — they do not compare IDs.

### 3.6 UNCHANGED: UXW-01 contract

`src/features/favorites/types.ts` stays exactly:

```ts
export type FavoriteMutationResult =
  | { ok: true }
  | { ok: false; reason: 'unauthenticated' }
```

The auth-prompt flow in `useFavoriteAuthPrompt`, the "No se pudieron actualizar tus favoritos" error mapping at `useFavorites.ts:71,77`, and the `FavoriteItemRow` image fallback are not touched.

### 3.7 UNCHANGED: provider nesting

`src/app/layout.tsx:39-48` nesting (`AuthProviderWrapper > CartProvider > FavoritesProvider`) stays. The cart-cycle reorder (commit `5b06371`) already established the correct nesting. The verify-phase boot check (§5.3) is the regression guard for any future nesting bug.

## 4. Test strategy (Strict TDD, mocks reflect real Strapi)

All tests run with `npx vitest run --maxWorkers=2` (per `AGENT.md` hardware constraint). Mock data uses the **real Strapi response shape** — objects with numeric `id`, not string arrays. This is the explicit guard from the spec verification note ("string-ID-only mocks are prohibited").

### 4.1 NEW: `src/features/favorites/services/__tests__/normalizeFavorite.test.ts`

Unit tests for the normalizer:

| Scenario | Input | Expected |
|----------|-------|----------|
| Numeric `id` from Strapi is stringified | `{ id: 42, name: 'X', price: 100, stock: 5 }` | `{ id: '42', name: 'X', price: 100, images: [], href: '', description: '', category: undefined, stock: 5 }` |
| `documentId` fallback when `id` is absent | `{ documentId: 'ab12cd', name: 'Y' }` | `{ id: 'ab12cd', name: 'Y', ... }` |
| Null entry dropped from list | `[{ id: 1 }, null, { id: 2 }]` | `[Product(id='1'), Product(id='2')]` |
| Non-array input → empty array | `null`, `undefined`, `'string'`, `{}` | `[]` |
| All fields fallback applied | `{ name: null, price: undefined, stock: null }` | `{ id: '...', name: 'Sin nombre', price: 0, stock: 0 }` |
| Already-string `id` passes through unchanged | `{ id: 'p-1', name: 'Z' }` | `{ id: 'p-1', name: 'Z', ... }` |
| Existing `images`/`href`/`description`/`category` preserved when present | `{ id: 5, name: 'X', images: [...], href: '/h', description: 'd', category: 'cat' }` | All present in output |

### 4.2 EDIT: `src/features/favorites/services/__tests__/getFavoritesService.test.ts`

Update the success-path mock (lines 117-143) to use the **real Strapi object shape**:

```ts
vi.mocked(global.fetch).mockResolvedValueOnce({
  ok: true,
  json: async () => ({
    favorites: [
      { id: 1, documentId: 'p-1', name: 'Casio LA670WEA-1EF', price: 3990, stock: 5 },
      { id: 2, documentId: 'p-2', name: 'Casio LA670WEA-8AEF', price: 4590, stock: 3 },
    ],
  }),
} as Response)
```

Add new assertions to the existing `200 — success` describe block:

- `result.favorites` is `Product[]` (not `unknown[]`) — type narrowing passes without cast.
- Every `result.favorites[i].id` is `typeof 'string'`.
- `name`, `price`, `stock` flow through.
- `images`, `href`, `description` fall back to safe defaults.

The existing `URL and headers` test (lines 30-50) and `502` tests (lines 53-114) stay byte-identical. They are regression guards for the surface contract — only the success shape changes.

### 4.3 EDIT: `src/features/favorites/services/__tests__/updateFavoritesService.test.ts`

No production change in §3.3, but tighten the body assertion at line 52-54 to enforce **canonical string types**:

```ts
const body = JSON.parse(init?.body as string)
expect(body.favorites).toEqual(['p-1', 'p-2', 'p-3'])
expect(body.favorites.every((id: unknown) => typeof id === 'string')).toBe(true)
```

The existing `validateFavoritesList` tests (lines 123-179) stay — `invalid_item` on `['p-1', 42, 'p-3']` is still the correct rejection (the validator guards the contract; we send it the right input).

### 4.4 EDIT: `src/features/favorites/context/__tests__/FavoritesContext.test.tsx`

Add new test cases inside the existing `describe('authenticated user', ...)` block:

- **`isFavorite matches a favorite persisted with numeric source ID`** — fixture sets the initial GET response to a raw Strapi object `{ id: 42, documentId: 'p-1', name: 'X', ... }`. After mount + ingestion, assert `isFavorite('42') === true` and `addToFavorites` for catalog `{ id: '42', ... }` is a no-op (no PUT).
- **PUT body contains only string IDs after mixed add/remove** — start with one normalized favorite ingested from numeric source, add one catalog string-ID favorite, assert the PUT body captured at line 210-213 contains only strings (`typeof === 'string'` for every entry).
- **Remove with string `productId` matches a numeric-source favorite** — same fixture; `removeFromFavorites('42')` succeeds and the PUT body is `[]` (or `['<other-id>']`).

Existing tests stay byte-identical (they use canonical-string fixtures and continue to pass).

### 4.5 NOT EDITED

`src/app/api/favorites/__tests__/route.test.ts` (route-level integration test) and `src/features/favorites/types.ts` (UXW-01 contract) are not touched.

## 5. Verification (verify phase — non-negotiable)

### 5.1 Static checks

```bash
npx tsc --noEmit          # exit 0
npm run lint              # exit 0
npx vitest run --maxWorkers=2  # exit 0
```

### 5.2 Test command

Per AGENT.md, **always** `npx vitest run --maxWorkers=2`. Running without `--maxWorkers=2` is prohibited on this hardware.

### 5.3 Real dev-server boot check (merge gate)

The fix touches the Context provider surface (`useFavorites` → `FavoritesContext`). Per playbook #1645-2 and spec scenario 6, strict-TDD mocks cannot catch provider-nesting regressions. The verify phase MUST run:

```bash
curl -s -m 15 -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/
# → must print: HTTP 200

curl -s -m 15 http://localhost:3000/ | grep -i "useFavorites must be used"
# → must exit 1 (no match in body)
```

Both must hold simultaneously. Any failure blocks merge.

### 5.4 Manual smoke (user-runs, against real Strapi)

```bash
# terminal A
cd ../e-commerce-relojes-bv-beni-api && npm run develop   # Strapi at :1337

# terminal B
npm run dev                                                # Next.js at :3000
```

Then in browser:

1. Log in with a test user; add at least one favorite.
2. Log out, log back in.
3. Tap the heart on a **second** product card on `/tienda` — must succeed (HTTP 200, no "No se pudieron actualizar tus favoritos" toast).
4. Repeat with the same product (no-op) — must not trigger a PUT.
5. Tap the heart on the **first** product to remove it — must succeed.
6. Capture DevTools network tab: confirm the PUT body is `["<string-id-1>", "<string-id-2>"]` with `typeof === "string"` for every entry.

User runs this, not the orchestrator (per playbook #1645-5).

## 6. Task breakdown (for sdd-tasks, strict TDD order)

The work splits into **six reviewable commits** along the strict-TDD sequence T0 RED → T2 GREEN → T3 GREEN → T4 GREEN → T5 GREEN → T6 SWEEP, plus a final verify commit. Each commit is independently reviewable per `work-unit-commits`.

| # | Phase | Description | Files | Diff est. |
|---|-------|-------------|-------|-----------|
| 1 | T0 RED | Add failing test: `normalizeFavorite.test.ts` with numeric-ID Strapi shape | `normalizeFavorite.test.ts` (new) | +60 |
| 2 | T0 RED | Add failing test: `getFavoritesService.test.ts` updated mock + canonical assertion | `getFavoritesService.test.ts` | +30 |
| 3 | T0 RED | Add failing test: `FavoritesContext.test.tsx` numeric-source membership + PUT body string assertion | `FavoritesContext.test.tsx` | +50 |
| 4 | T2 GREEN | Implement `normalizeFavorite.ts` (pure helper, no I/O) | `normalizeFavorite.ts` (new) | +50 |
| 5 | T3 GREEN | Wire `normalizeFavorites` into `getFavoritesService` + change return type to `Product[]` | `getFavoritesService.ts` | +5 / -5 |
| 6 | T4 GREEN | Add `String(f.id)` egress coercion in `useFavoritesApi` | `useFavorites.ts` | +1 / -1 |
| 7 | T5 GREEN | Add defensive `String()` coercion in `FavoritesContext` membership checks | `FavoritesContext.tsx` | +4 / -4 |
| 8 | T6 SWEEP | Tighten `updateFavoritesService.test.ts` body assertion + edge case regression guards | `updateFavoritesService.test.ts` | +15 |
| 9 | VERIFY | Boot check script in `scripts/check-favorites-boot.sh` (optional helper) + CI doc | `scripts/...` (optional) | +20 |

**Total diff estimate: ~200 lines** (within the 400-line budget). Single PR, no chained.

## 7. Out of scope

- **H2 — populate query for `/favoritos` images**: separate ticket `BUG-FAVORITES-IMAGES-401` (per #1649, smoke evidence #1651 confirms H2 is real).
- **H3 — cross-user race on auth transition**: refuted by smoke #1651; the `useFavoritesApi` state persists correctly across logout/login. No fix.
- **Backend Strapi changes**: out of scope. The backend route at `src/app/api/favorites/route.ts:50-60` validates string IDs as the contract; the fix is to send valid bodies.
- **Provider reordering in `src/app/layout.tsx`**: nesting already correct (post `5b06371`).
- **`getFavoritesService` Strapi populate query** (changing `populate=favorites` to `populate[favorites][populate]=*`): out of scope per H2.

## 8. Risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Real Strapi returns additional fields not in the normalizer mapping (e.g., `slug`, `publishedAt`) | Low | Normalizer is permissive — unknown fields are ignored. Strict `Product` type ensures only canonical fields reach React state. |
| Type signature change (`unknown[]` → `Product[]`) breaks a caller not yet updated | Low | Callers audited: `useFavoritesApi.ts:44` (only consumer; updated implicitly via service change). `route.ts:6-29` calls `getFavoritesService` and forwards `{ favorites }` to JSON — `Product[]` is JSON-serializable, no break. No callers in tests beyond the ones updated. |
| Mock drift between test and real Strapi | Med | New tests use the exact Strapi shape captured in smoke #1651 (numeric `id`, `documentId`, `name`, `price`, `stock`). |
| Provider nesting regression (cart-cycle lesson) | Med | Mandatory boot check (§5.3) in verify phase. |
| `Product.id` future API accepts `string \| number` and defensive `String()` becomes wrong | Low | `Product.id` is `string` per `src/types/index.ts:11` and the catalog enforces `strapiProduct.id.toString()`. Defensive `String()` is a guard, not a behavior change. |
| Boot check requires dev server up — flaky in CI | Low | Verify phase runs locally with `npm run dev`. CI gating on boot is a follow-up; this cycle does not block on it. |

## 9. Review workload forecast

| Field | Value |
|-------|-------|
| Production LOC | 12-20 (1 new file ~50 LOC + 5 surgical edits) |
| Tests LOC | ~155 (new + edits across 4 files) |
| Total diff | ~200 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | `ask-on-risk` (already cached) |
| Files touched | 6 (1 new, 5 edited) + optional script |

## 10. Rollback plan

Revert the PR. Pure frontend normalization — no schema, migration, or persisted-format change. Pre-fix behavior (400 on mixed body) returns. No data corruption risk; users revert to the current broken state, which is non-destructive. The `validateFavoritesList` strict-string check is unchanged and remains the acceptance gate.

## 11. Authoring note (for sdd-tasks / sdd-verify)

This design was written manually after `sdd-design` sub-agent dispatch failed with `sdd_task_result_empty` (twice in a row across sessions, see `discovery/bug-favorites-400-dispatch-latched-second-occurrence`). The content is grounded in proposal #1650, spec #1652, smoke evidence #1651, scope decisions #1649, and direct reading of the source files `getFavoritesService.ts`, `updateFavoritesService.ts`, `useFavorites.ts`, `FavoritesContext.tsx`, `types.ts` (UXW-01), `src/types/index.ts` (Product/StrapiProduct types), `src/features/catalog/hooks/useProducts.ts` (canonicalization reference), and the three existing test files. All line numbers above are accurate as of `2026-08-21`.

`sdd-tasks` and `sdd-verify` MUST consume this design as if authored by `sdd-design`. The phased task list in §6 is the contract; do not re-derive it.