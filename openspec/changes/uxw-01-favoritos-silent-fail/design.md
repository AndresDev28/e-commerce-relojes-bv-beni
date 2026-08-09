# Design: UXW-01 — Fix Favorites Silent Fail

## Technical Approach

Replace the three silent `if (!user) return` branches in `FavoritesContext` with a typed mutation result. Heart consumers (`ProductCard`, `ProductDetailClient`) read the result, show an inline auth prompt (`role="status"` / `aria-live="polite"`), and navigate to `/login?redirect={path}`. Authenticated paths and `/api/favorites` stay unchanged. L2 deferred. Maps to locked L1+L3 and the six `favorites` requirements.

## Architecture Decisions

| ID | Choice | Alternatives | Rationale |
|----|--------|--------------|-----------|
| **D1** signal | **B** — mutations return `FavoriteMutationResult`; consumers hold local `showAuthPrompt` | A global `needsAuth` (N-card fan-out on grid); C both (redundant) | Grid renders many `ProductCard`s; a context boolean would light every card. Return value scopes feedback to the tapped control. |
| **D2** feedback UI | **A** — inline `<span role="status" aria-live="polite">` + CTA button under/next to heart | B banner (layout noise); C `ErrorMessage` (**forbidden** — default `role="alert"`) | Matches spec a11y; fits card action row + detail heart without toast infra. |
| **D3** redirect | `usePathname()` + `router.push('/login?redirect=' + encodeURIComponent(pathname))` inside feature hook `useFavoriteAuthPrompt` | Inline duplicate in each consumer | Same pattern as `mi-cuenta/pedidos/[orderId]`. Hook keeps DRY. `/` and `/login` still encoded as-is. **Login does not honor `?redirect=`** (existing debt — out of scope). |
| **D4** auto-clear | `useEffect` in `useFavoriteAuthPrompt` watching `useAuth().user` → `setShowAuthPrompt(false)` when `user` becomes non-null | Clear only in provider | Prompt state is local (D1.B); clear must live with that state. |
| **D5** tests | RED-first; AuthProbe + `renderHook` wrappers copied from `AuthContext.test.tsx` / `CartContext.test.tsx` | Ad-hoc mounts | Strict TDD; existing shapes already mock `next/navigation` + providers. |
| **D6** backend | **Non-decision** — no server changes | — | `/api/favorites` already 401 via `requireUser`; covered by `route.test.ts`. |

## Data Flow

```
Anon user taps heart
        │
        ▼
ProductCard / ProductDetailClient
        │  useFavoriteAuthPrompt()
        ▼
useFavorites().addToFavorites|remove|clear
        │
        ▼
FavoritesContext  ── if (!user) → { ok:false, reason:'unauthenticated' }
        │                 (no fetch)
        │  if (user) → updateFavorites → PUT /api/favorites → { ok:true }
        ▼
result.ok === false?
   yes → setShowAuthPrompt(true) → re-render
         [role=status] "Iniciá sesión para guardar favoritos"
         [button] Iniciar sesión
              │
              ▼
         router.push('/login?redirect=' + encodeURIComponent(pathname))
   no  → heart state updates (authed path)

user signs in → useAuth().user set → useEffect clears showAuthPrompt
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/favorites/context/FavoritesContext.tsx` | Modify | Typed mutation results; replace silent returns L41/49/60 |
| `src/features/favorites/hooks/useFavoriteAuthPrompt.ts` | Create | Local prompt state, clear-on-auth, login redirect |
| `src/features/favorites/components/FavoriteAuthPrompt.tsx` | Create | Presentational status + CTA (shared by catalog hearts) |
| `src/features/favorites/index.ts` | Modify | Export prompt hook/component + result type |
| `src/features/catalog/components/ProductCard.tsx` | Modify | Wire prompt + toggle via hook (L47–54) |
| `src/features/catalog/components/ProductDetailClient.tsx` | Modify | Wire prompt + toggle via hook (L43–69) |
| `src/features/favorites/components/FavoriteItemRow.tsx` | None (behavior) | Tests only; still authed-only path |
| `src/features/favorites/context/__tests__/FavoritesContext.test.tsx` | Create | Context anon + authed matrix |
| `src/features/favorites/hooks/__tests__/useFavorites.test.ts` | Create | Hook throw-outside-provider + surface |
| `src/features/favorites/hooks/__tests__/useFavoriteAuthPrompt.test.ts` | Create | Prompt show/clear/redirect |
| `src/features/favorites/components/__tests__/FavoriteItemRow.test.tsx` | Create | Remove + a11y smoke |
| `src/features/favorites/components/__tests__/FavoriteAuthPrompt.test.tsx` | Create | `role=status`, CTA href/nav |
| `/api/favorites`, login page, services | None | Out of scope |

## Interfaces / Contracts

```ts
type FavoriteMutationResult =
  | { ok: true }
  | { ok: false; reason: 'unauthenticated' }

// FavoritesContextType mutations become:
addToFavorites(product: Product): Promise<FavoriteMutationResult>
removeFromFavorites(productId: string): Promise<FavoriteMutationResult>
clearFavorites(): Promise<FavoriteMutationResult>
// + existing: favorites, isFavorite, isLoading, error

// useFavoriteAuthPrompt():
{
  showAuthPrompt: boolean
  handleToggleFavorite: (product: Product) => Promise<void>
  goToLogin: () => void  // pushes /login?redirect=…
}
```

Authed no-ops (already favorite / not present) still return `{ ok: true }` — not an auth signal. Anon never calls `updateFavorites`.

Copy (ES): prompt `"Iniciá sesión para guardar favoritos"`; CTA `"Iniciar sesión"`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit — context | Anon add/remove/clear → `{ ok:false, reason:'unauthenticated' }`, no fetch; authed add/remove/clear/no-op → `{ ok:true }` + fetch; `isFavorite` false when empty/anon | `AuthProbe` + mocked `useAuth` / `useFavoritesApi` (AuthContext.test shape) |
| Unit — `useFavorites` | Throws outside provider; returns context inside | `renderHook` |
| Unit — `useFavoriteAuthPrompt` | Anon toggle sets `showAuthPrompt`; `goToLogin` pushes encoded path; user→non-null clears prompt | Mock `usePathname`/`useRouter`/`useAuth` |
| Unit — `FavoriteAuthPrompt` | `role="status"` + `aria-live="polite"`; CTA fires `onLogin` | RTL |
| Unit — `FavoriteItemRow` | Authed remove calls `removeFromFavorites`; renders product | RTL + mocked favorites/cart |
| Integration | Existing `route.test.ts` 401/200 — **no new server tests** | Already green |
| E2E | Optional later; not required this change | — |

**RED order:** (1) `FavoritesContext.test` asserts result shape (fails on `void` silent return) → (2) prompt hook tests → (3) `FavoriteAuthPrompt` a11y → (4) `FavoriteItemRow` → (5) implement GREEN. Command: `npx vitest run --maxWorkers=2`.

**Coverage ↔ requirements**

| Requirement | Primary tests |
|-------------|----------------|
| Anonymous visible feedback | Context result + prompt hook + `FavoriteAuthPrompt` |
| Login redirect preserves origin | `useFavoriteAuthPrompt` (`/tienda`, `/tienda/{slug}`) |
| Authenticated mutation persists | Context authed add/remove/clear/no-op |
| `isFavorite` anon contract | Context |
| Server 401 contract | Existing `route.test.ts` (unchanged) |
| Test coverage requirement | Three feature areas + prompt helpers above |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary changes. Client UI + context only; login URL shape already used elsewhere.

## Migration / Rollout

No migration. No feature flag. Deploy is additive client UX. Rollback: revert context returns to silent `void`, remove prompt hook/component wiring and new tests.

## Open Questions

None — L1+L3 locked; `/login?redirect=` honor is deferred debt; L2 deferred.
