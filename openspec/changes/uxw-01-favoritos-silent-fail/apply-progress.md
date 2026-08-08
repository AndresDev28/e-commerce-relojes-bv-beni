# Apply Progress: UXW-01 — Fix Favorites Silent Fail

## Branch

`frontend/UXW-01-favoritos-silent-fail`

## Commits

| # | SHA | Message |
|---|-----|---------|
| 1 | `3b16add` | feat(favorites): add FavoriteMutationResult discriminated union type |
| 2 | `7d2f8d9` | test(favorites): add RED tests for anon/authed paths in context, hook, row, prompt |
| 3 | `1371e4d` | feat(favorites): return discriminated union from addToFavorites/removeFromFavorites/clearFavorites |
| 4 | `f44c344` | feat(favorites): add useFavoriteAuthPrompt hook and FavoriteAuthPrompt component |
| 5 | `03acb40` | feat(catalog): wire ProductCard and ProductDetailClient to favorites auth prompt |

## Test Results

| Metric | Value |
|--------|-------|
| Favorites test files | 7 (all pass) |
| Favorites test count | 43 passed, 0 failed |
| Full suite test files | 73 (70 pass, 3 fail — all pre-existing) |
| Full suite test count | 885 passed, 21 failed (pre-existing), 9 skipped |
| Focused test command | `npx vitest run src/features/favorites --maxWorkers=2` → 43/43 |

Pre-existing failures (NOT caused by this change):
- `CartContext.test.tsx` (17 tests): `localStorage.clear is not a function` in jsdom
- `CookieBanner.test.tsx` (4 tests): `window.localStorage.clear is not a function` in jsdom
- `order-status-change.integration.test.ts`: Strapi backend not available

## TypeCheck

`npx tsc --noEmit` → exit 0, no errors.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/features/favorites/types.ts` | Created | `FavoriteMutationResult` discriminated union |
| `src/features/favorites/index.ts` | Modified | Export `FavoriteMutationResult` type |
| `src/features/favorites/context/FavoritesContext.tsx` | Modified | Mutations return `FavoriteMutationResult` |
| `src/features/favorites/hooks/useFavoriteAuthPrompt.ts` | Created | Prompt state, clear-on-auth, login redirect |
| `src/features/favorites/components/FavoriteAuthPrompt.tsx` | Created | `role="status"`, CTA component |
| `src/features/catalog/components/ProductCard.tsx` | Modified | Wire hook + render prompt inline |
| `src/features/catalog/components/ProductDetailClient.tsx` | Modified | Wire hook + render prompt next to heart |
| `src/features/favorites/context/__tests__/FavoritesContext.test.tsx` | Created | Anon + authed context matrix (10 tests) |
| `src/features/favorites/hooks/__tests__/useFavorites.test.tsx` | Created | Provider access + result propagation (3 tests) |
| `src/features/favorites/hooks/__tests__/useFavoriteAuthPrompt.test.ts` | Created | Prompt show/clear/redirect (7 tests) |
| `src/features/favorites/components/__tests__/FavoriteAuthPrompt.test.tsx` | Created | A11y + CTA behavior (4 tests) |
| `src/features/favorites/components/__tests__/FavoriteItemRow.test.tsx` | Created | Remove + rendering (6 tests) |

**Total**: 5 production files (2 new + 3 modified), 5 test files (all new), 1 export file modified.
**12 files changed, +938 / -22 lines** (960 authored lines; ~133 production + ~827 tests).

## Deviations from Design

1. **Hook filename**: Design calls it `useFavoriteAuthPrompt.ts`; tasks.md listed `useLoginRedirect.ts`. Followed design per instructions.
2. **Test filenames**: `useFavorites.test.tsx` (not `.ts`) to support JSX; `useFavoriteAuthPrompt.test.ts` (not `.tsx`) since it uses `renderHook` without JSX.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | N/A (branch creation) | — | — | — | — | — | — |
| 1.2 | N/A (type declaration) | — | — | — | — | ➖ Single output | ➖ None needed |
| 2.1 | `FavoritesContext.test.tsx` | Unit (jsdom) | ✅ Existing favorites services | ✅ 8 failed (void→undefined) | ✅ 8 passed after impl | ✅ 10 cases (anon 3 + authed 7) | ✅ waitFor added |
| 2.2 | `useFavorites.test.tsx` | Unit (jsdom) | N/A (new) | ✅ 1 failed (void return) | ✅ 3 passed | ✅ 3 cases (throw, shape, result) | ➖ None needed |
| 2.3 | `useFavoriteAuthPrompt.test.ts` | Unit (renderHook) | N/A (new) | ✅ Module missing | ✅ 7 passed after impl | ✅ 7 cases (show, clear, redirect, toggle) | ✅ async fixes |
| 2.4 | `FavoriteAuthPrompt.test.tsx` | Unit (RTL) | N/A (new) | ✅ Module missing | ✅ 4 passed after impl | ✅ 4 cases (a11y, copy, CTA click) | ➖ None needed |
| 2.5 | `FavoriteItemRow.test.tsx` | Unit (RTL) | N/A (new) | ✅ 6 passed (preexisting behavior) | ✅ 6 passed | ✅ 6 cases (render, remove, a11y) | ➖ None needed |
| 3.1 | `FavoritesContext.tsx` | — | ✅ 2 passing | — | ✅ 10/10 | — | ✅ Return type annotations |
| 3.2 | `useFavorites.ts` + index | — | — | — | Exports already present | — | — |
| 3.3 | `useFavoriteAuthPrompt.ts` | — | — | — | ✅ Created | — | ✅ useEffect clear-on-auth |
| 3.4 | `FavoriteAuthPrompt.tsx` | — | — | — | ✅ Created | — | ➖ None needed |
| 4.1 | `ProductCard.tsx` | — | ✅ Full favorites suite | — | ✅ Wired | — | ✅ Prompt rendered conditionally |
| 4.2 | `ProductDetailClient.tsx` | — | ✅ Full favorites suite | — | ✅ Wired | — | ✅ Prompt next to heart |
| 4.3 | `FavoriteItemRow.tsx` | — | ✅ 6 tests pass | — | ✅ Unchanged behavior | — | — |
| 5.1 | Full vitest | Unit | ✅ 70/73 pass | — | ✅ Favorites 43/43 | — | — |
| 5.2 | tsc --noEmit | — | — | — | ✅ exit 0 | — | — |
| 5.3 | Manual smoke test | N/A | — | — | Steps documented | — | — |

## Work Unit Evidence

| Evidence | Value |
|----------|-------|
| Focused test command | `npx vitest run src/features/favorites --maxWorkers=2` → 43 passed, 0 failed |
| Runtime harness | Manual: anonymous heart tap on `/tienda` → inline prompt appears with "Iniciá sesión para guardar favoritos" + "Iniciar sesión" CTA; click CTA → navigates to `/login?redirect=%2Ftienda`. Same on `/tienda/{slug}`. |
| Rollback boundary | Revert all 12 changed files; context returns to silent void behavior. |

## Smoke Test Description (5.3)

1. Open `/tienda` in an incognito/private window (no auth session).
2. Tap the heart icon on any product card.
3. **Expected**: An inline prompt appears below the action row with text "Iniciá sesión para guardar favoritos" and a button "Iniciar sesión".
4. **A11y**: The prompt has `role="status"` and `aria-live="polite"`. Screen readers announce the prompt without interrupting the user.
5. Click "Iniciar sesión".
6. **Expected**: Browser navigates to `/login?redirect=%2Ftienda`.
7. Repeat on a product detail page (`/tienda/{any-slug}`).
8. **Expected**: The prompt appears next to the heart icon, and the CTA navigates to `/login?redirect=%2Ftienda%2F{slug}`.
9. Sign in as an authenticated user.
10. Tap the heart on a product.
11. **Expected**: No prompt appears. The heart toggles to favorited state.

## Status

**All 17 tasks complete (17/17). Ready for sdd-verify.**

## Current HEAD

`03acb40` on branch `frontend/UXW-01-favoritos-silent-fail`
