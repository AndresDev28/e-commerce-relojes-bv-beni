# Tasks: UXW-01 — Fix Favorites Silent Fail

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200–280 LOC |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Not needed (single PR) |
| Delivery strategy | ask-on-risk |
| Chain strategy | N/A (single PR, no chain) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Full L1+L3 fix with tests | PR 1 | `npx vitest run src/features/favorites --maxWorkers=2` | Manual anonymous heart tap on `/tienda` | Revert all new/modified files; heart returns to silent behavior |

## Phase 1: Foundation

- [x] 1.1 Create branch `frontend/UXW-01-favoritos-silent-fail` from `main`.
- [x] 1.2 Add `FavoriteMutationResult` union to `src/features/favorites/types.ts` and prepare exports in `src/features/favorites/index.ts`.

## Phase 2: RED Tests

- [x] 2.1 Write `FavoritesContext.test.tsx` with `AuthProbe` for anonymous add/remove/clear `{ ok:false }`, no API call, and authenticated persistence/no-op scenarios (Spec R1, R3, R4).
- [x] 2.2 Write `useFavorites.test.tsx` using `renderHook` to verify provider access and mutation result propagation (Spec R1, R3).
- [x] 2.3 Write `useFavoriteAuthPrompt.test.ts` for `/tienda` and `/tienda/{slug}` pathname encoding and router navigation (Spec R2).
- [x] 2.4 Write `FavoriteAuthPrompt.test.tsx` asserting `role="status"`, `aria-live="polite"`, copy, and the “Iniciar sesión” CTA (Spec R1).
- [x] 2.5 Write `FavoriteItemRow.test.tsx` verifying authenticated removal and product rendering (Spec R3, R6).

## Phase 3: GREEN Core Implementation

- [x] 3.1 Update `src/features/favorites/context/FavoritesContext.tsx` mutations to return `FavoriteMutationResult`, preserving authenticated PUTs and anonymous no-fetch behavior.
- [x] 3.2 Update `src/features/favorites/hooks/useFavorites.ts` and exports so consumers receive the typed context contract.
- [x] 3.3 Implement `src/features/favorites/hooks/useFavoriteAuthPrompt.ts` with `usePathname()` and encoded `/login?redirect=` navigation.
- [x] 3.4 Implement `src/features/favorites/components/FavoriteAuthPrompt.tsx` as the inline status/CTA component.

## Phase 4: UI Integration

- [x] 4.1 Wire `src/features/catalog/components/ProductCard.tsx` to show the tapped-heart prompt and trigger login redirect.
- [x] 4.2 Wire `src/features/catalog/components/ProductDetailClient.tsx` similarly; clear local prompt state when auth becomes available.
- [x] 4.3 Verify `src/features/favorites/components/FavoriteItemRow.tsx` retains authenticated-only remove behavior.

## Phase 5: Verification

- [x] 5.1 Run `npx vitest run --maxWorkers=2` and confirm all six requirements’ scenarios pass.
- [x] 5.2 Run `npx tsc --noEmit`.
- [x] 5.3 Smoke-test anonymous hearts on `/tienda` and `/tienda/[slug]`: inline prompt appears and CTA navigates to `/login` with redirect.
