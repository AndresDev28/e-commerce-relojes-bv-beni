# Design: bug-cart-persistence

## Technical Approach

Replace the global localStorage key `'bv-beni-cart'` with `bv-beni-cart-${userId ?? 'guest'}` and remove `clearCart()` from `AuthContext.logout()`. `CartProvider` consumes `useAuth().user` and re-hydrates on `user.id` change, mirroring `FavoritesProvider` (`src/features/favorites/context/FavoritesContext.tsx:32-40`). On first authenticated login post-deploy, a one-shot migration moves the legacy payload into the per-user key; on the first null→user transition, the guest cart merges using per-product max-quantity. The exported `useCart` API is preserved (19 callers unaffected). **Capability delta = 0** — no backend, schema, or API contract change; closes `BUG-CART-PERSISTENCE` and the latent cross-user leak.

## Architecture Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Per-user key template | `bv-beni-cart-${String(userId ?? 'guest')}` | `AuthUser.id` is `number` (`AuthContext.tsx:15`), `Product.id` is `string` (`types/index.ts:11`). Explicit `String()` prevents silent drift (`#1634`). |
| 2 | Guest→login merge | Pure `mergeGuestCartInto(userCart, guestCart)`: per-product max-quantity, dedupe by `id`, sort by `id` | Spec requires max-quantity. Pure = unit-testable in isolation. |
| 3 | Legacy migration | `migrateLegacyKey(targetKey)` reads `bv-beni-cart`, writes to `targetKey`, deletes legacy; one-shot on first authenticated transition | Spec requires legacy-key removal. Keeps storage surface clean. |
| 4 | Hydration effect deps | `[user?.id]` (not `[]`) — re-hydrate on auth transitions | Spec requires re-hydration. Multi-tab desync out of scope. |
| 5 | `clearCart()` discipline | Remove from `AuthContext.logout()` ONLY; preserve in `useCreateOrder.ts:69` | Logout is the bug; payment success must still empty cart. |
| 6 | `useCart` API stability | No signature change; internal storage keying only | 19 callers + tests = high blast radius. Internal-only = single PR. |

## Data Flow

```
addToCart / removeFromCart / updateQuantity / clearCart
                          │
                          ▼
                    setCartItems(state)
                          │
                          ▼
              useEffect on [cartItems, isHydrated]
                          │
                          ▼
       localStorage.setItem(getStorageKey(user?.id), JSON)
                          ▲
                          │
              useAuth().user changes → re-key
                          │
                          ▼
              useEffect on [user?.id, isHydrated]
                          │
                          ├── read new key
                          ├── merge guest cart if user: null → id
                          ├── migrateLegacyKey once (first login)
                          └── setIsHydrated(true)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/cart/context/CartContext.tsx` | Modify | Replace `CART_STORAGE_KEY` constant with `getStorageKey(userId)`; add `useAuth()` consumption; extend hydration deps to `[user?.id]`; add `mergeGuestCartInto()` + `migrateLegacyKey()` helpers; clear guest key after merge. |
| `src/context/AuthContext.tsx` | Modify | Remove `clearCart()` call at line 138 inside `logout()`'s `finally` block. Drop the `useCart()` import if unused elsewhere. |
| `src/__tests__/context/CartContext.test.tsx` | Modify | Add ~6 RED tests: persistence round-trip, per-user isolation, guest→login merge, legacy migration, hydration on auth transitions, preserved payment-success clear. |
| `tests/e2e/cart-persistence.spec.ts` | Create (optional) | Playwright regression spec using modern cookie-session auth pattern from `uxw01-regression-sweep.spec.ts`. |
| `docs/roadmapToProduction.md:98-117` | Modify | Correct the "root cause probable" line from in-memory/swagger claim to the actual cause (`AuthContext.logout()` → `clearCart()` + global key). |

## Interfaces / Contracts

- `useCart()` public API: **unchanged** — same shape (`{ cartItems, isHydrated, addToCart, removeFromCart, updateQuantity, clearCart }`).
- `CartItem.id`: stays `string` (extends `Product`).
- `getStorageKey(userId?: number | null): string` → `bv-beni-cart-${String(userId ?? 'guest')}`.
- `mergeGuestCartInto(userCart: CartItem[], guestCart: CartItem[]): CartItem[]` — pure, deterministic sort by `id`.
- `migrateLegacyKey(targetKey: string): void` — reads `bv-beni-cart`, writes to `targetKey`, deletes legacy; no-op if absent/empty.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Vitest unit | Persistence round-trip; per-user isolation; guest→login merge (max-quantity, dedupe); legacy migration (present + no-op); hydration on `user.id` change; `clearCart` still fires from payment path | T0 RED → GREEN with `npx vitest run --maxWorkers=2`; `beforeEach` clears localStorage; mock `useAuth()` via wrapper provider (same pattern as `FavoritesContext.test.tsx`). |
| Vitest unit | AuthContext changes do NOT wipe cart | Test under `src/context/__tests__/AuthContext.test.tsx` wrapping `CartProvider`, asserting `cartItems` survives `logout()`. |
| Playwright e2e (optional) | `add → logout → login → cart persists` | Modern cookie-session auth pattern from `uxw01-regression-sweep.spec.ts`; independent of `TEST-INFRA-E2E-LEGACY-AUTH`. |
| Manual smoke | Real repro against Strapi `:1337` + Next `:3000` | `add → logout → login → cart persists` per Engram `#1626`. |
| Quality gates | `npx tsc --noEmit`, `npm run lint`, `npx vitest run --maxWorkers=2` exit 0 | Pre-merge. |

## Threat Matrix

**N/A** — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary changes. Local to two React contexts and one test file.

## Migration / Rollout

- **Data migration**: none in the Strapi/backend sense. Frontend-only: legacy `bv-beni-cart` migrated to `bv-beni-cart-${String(userId)}` on first authenticated login post-deploy.
- **Feature flag**: none (single deploy).
- **Phased rollout**: none — fits the 400-line review budget.
- **Rollback**: revert PR. Users who never logged in post-deploy see no change. Users who logged in have items in `bv-beni-cart-${userId}`; post-revert the legacy key is empty so reads return `[]` (acceptable, low impact — cart is non-critical, no corruption, no schema). Multi-tab desync remains out of scope.

## Open Questions

None. All 7 user assumptions locked in via the orchestrator-provided context (`#1633`, `#1635`, `#1634`).
