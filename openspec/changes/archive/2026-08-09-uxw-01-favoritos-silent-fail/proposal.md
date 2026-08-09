# Proposal: UXW-01 — Fix Favorites Silent Fail

> **SDD Phase:** Propose (2/6) · **Slug:** `uxw-01-favoritos-silent-fail` · **Date:** 2026-08-08
> **Decision:** L1 (feedback + login redirect) + L3 (tests). L2 deferred.

## Intent

Anonymous users tap the heart on `/tienda` or `/tienda/[slug]` and nothing happens: `FavoritesContext.tsx` returns silently at lines 41/49/60 (`if (!user) return`). The heart is a dead control — confusing UX and lost conversion. The server contract is already solid (`/api/favorites` returns 401); the failure is purely client-side.

## Scope

### In Scope
- **L1**: Replace the 3 silent `if (!user) return` branches with an auth-needed signal; heart consumers show an inline prompt *"Iniciá sesión para guardar favoritos"* + redirect to `/login?redirect={path}`.
- **L3**: Tests for `FavoritesContext`, `useFavorites`, `FavoriteItemRow` (strict TDD per config).
- New `favorites` delta spec formalizing the contract.

### Out of Scope
- L2: localStorage persistence for anonymous favorites + merge on login (deferred).
- Making `/login` honor `?redirect=` (existing debt — `LoginForm` always pushes `/mi-cuenta`; separate ticket).
- Strapi/backend changes. Toast system (none exists; inline prompt instead).

## Capabilities

### New Capabilities
- `favorites`: favorite-interaction contract — anonymous heart actions surface an auth prompt and login redirect; authenticated behavior unchanged (server-synced via `/api/favorites`, `MAX_FAVORITES=200` enforced server-side).

### Modified Capabilities
- None. (`session-management` redirect debt noted above, not modified.)

## Approach

1. `FavoritesContext`: replace the 3 silent branches with an auth-needed signal; still no API call without a user.
2. `ProductCard` / `ProductDetailClient`: render the inline prompt and `router.push('/login?redirect={path}')`.
3. Tests copy existing patterns (`AuthContext.test.tsx` probe + mocks, `CartContext.test.tsx` renderHook). RED first; run `npx vitest run --maxWorkers=2`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/favorites/context/FavoritesContext.tsx` | Modified | Replace silent branches L41/L49/L60 |
| `src/features/catalog/components/ProductCard.tsx` | Modified | Prompt + redirect (L47-54) |
| `src/features/catalog/components/ProductDetailClient.tsx` | Modified | Prompt + redirect (L43-69) |
| `src/features/favorites/components/FavoriteItemRow.tsx` | None | Test coverage only; behavior unchanged |
| `src/features/favorites/**/__tests__/` | New | 3 test files (~310 LOC) |
| `openspec/changes/uxw-01-favoritos-silent-fail/specs/favorites/spec.md` | New | Delta spec (sdd-spec phase) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `/login` ignores `?redirect=` → user lands at `/mi-cuenta` | High (existing debt) | Accept — matches rest of app; follow-up ticket |
| SSR/hydration issue from new provider state | Low | Provider already `'use client'`; client-only state |
| Two-click feel vs. competitor stores | Low | Single inline prompt with direct login action |

## Rollback Plan

Revert the 3 context branches to `if (!user) return`, remove prompt/redirect code from the two consumers, delete the new test files. Heart reverts to silent (current broken state). No backend or data to unwind.

## Dependencies

- None. Backend untouched; `/api/favorites` 401 path already tested.

## Success Criteria

- [ ] `npx vitest run --maxWorkers=2` green, including new context/hook/component tests
- [ ] Typecheck clean
- [ ] Anonymous user on `/tienda` grid and `/tienda/[slug]` detail: heart shows the prompt; "Iniciar sesión" routes to `/login`
- [ ] Authenticated add/remove/sync behavior unchanged
- [ ] `favorites` delta spec validates (Given/When/Then, RFC 2119)
