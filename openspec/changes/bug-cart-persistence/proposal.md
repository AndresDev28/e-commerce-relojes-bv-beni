# Proposal: Fix BUG-CART-PERSISTENCE — Cart Lost on Logout/Login

## Intent

Cart items vanish after `logout → login` roundtrip (manual repro 2026-08-13, `docs/roadmapToProduction.md:98-117`). Roadmap diagnosis is wrong: cart IS persisted. **Root cause**: `AuthContext.logout()` calls `clearCart()` at `src/context/AuthContext.tsx:138`; save-effect persists `[]`. **Secondary defect**: key `'bv-beni-cart'` is global, leaking carts across users on shared browsers.

## Scope

### In Scope
- Per-user localStorage key: `bv-beni-cart-${userId ?? 'guest'}`
- Remove `clearCart()` call from `AuthContext.logout()`
- Legacy-key migration on first login
- Guest→login merge: max-quantity, dedupe by `id`
- Vitest RED tests (persistence, isolation, merge, migration)
- Optional Playwright regression spec

### Out of Scope
- Multi-tab desync, backend cart (no `ApiCart*` in Strapi), and unrelated bugs/followups (BUG-FAVORITES-400, BUG-IMAGES-400, BUG-E2E-UXW01-CHROMIUM-FLAKE, TEST-INFRA-E2E-LEGACY-AUTH)

## Capabilities

### New Capabilities
- `cart-management`: cross-session persistence, per-user localStorage isolation, guest→login merge, hydration across auth transitions, legacy-key migration.

### Modified Capabilities
- None.

## Approach

**Capability delta = 0** (frontend only).

`CartProvider` consumes `useAuth().user`, re-keys on `user.id` — mirrors `FavoritesContext.tsx:33-40`. Hydration deps include `user.id`; `isHydrated` cycles.

**Preserve** `useCreateOrder.ts:69` `clearCart()` (payment success, not logout).

**Strict TDD**: T0 RED → T1 RED → T2 RED → GREEN → T4 SWEEP.

LOC: ~16-30 net.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/cart/context/CartContext.tsx` | Modified | User-scoped key; hydration deps + `user.id`; merge + migration |
| `src/context/AuthContext.tsx:138` | Modified | Remove `clearCart()` from logout |
| `src/__tests__/context/CartContext.test.tsx` | Modified | Add ~6 RED tests |
| `docs/roadmapToProduction.md:98-117` | Modified | Correct root cause |
| `openspec/changes/bug-cart-persistence/` + Engram `#1631` | Evidence | Trail |

## Risks

- **`clearCart()` removal breaks payment** — Low. `useCreateOrder.ts:69` calls it.
- **Hydration race on user switch** — Med. Tests assert `isHydrated`.
- **Cross-user leak via legacy key** — Med. Migration deletes legacy.
- **Merge policy loses intent** — Low. Max-quantity, dedupe by `id`.
- **Cart tests break on key change** — Med. `beforeEach` clears localStorage.
- **Multi-tab desync** — Med. Out of scope.

## Rollback Plan

Revert PR. Migration no-op for users who never logged in post-deploy. Users who logged in: items moved `bv-beni-cart` → `bv-beni-cart-${userId}`; post-revert reads legacy key, items invisible. Low impact (cart non-critical), no corruption, no schema.

## Dependencies

None external. `useAuth()` pattern (`FavoritesContext` proven).

## Success Criteria

- [ ] Vitest: cart survives `user` `null → 1 → null → 1`
- [ ] Vitest: no cross-user leak (A's items invisible to B)
- [ ] Vitest: guest→login merge (max-quantity, dedupe by `id`)
- [ ] Vitest: legacy key migrated on first login
- [ ] Playwright `cart-persistence.spec.ts` green (optional)
- [ ] Manual smoke: `add → logout → login → cart persists`
- [ ] `tsc --noEmit`, `npm run lint`, `npx vitest run --maxWorkers=2` exit 0
