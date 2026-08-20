# Exploration: bug-cart-persistence

## Current State

The cart is a purely-frontend construct — **no backend cart exists**.

### Cart architecture

- **Provider**: `CartProvider` lives at `src/features/cart/context/CartContext.tsx:30`. State is `useState<CartItem[]>([])`; mutations are `addToCart`, `removeFromCart`, `updateQuantity`, `clearCart`.
- **Persistence**: writes/reads `localStorage['bv-beni-cart']` (line 28). A `useEffect` on mount hydrates (lines 38-51); a second `useEffect` on `[cartItems, isHydrated]` persists (lines 55-59). An `isHydrated` flag gates persistence to skip SSR.
- **Public API**: `src/features/cart/index.ts` re-exports `CartItemRow` and everything from `CartContext`. There is **no `services/`** in this feature (the `hooks/` directory exists but is empty); the entire cart is the single context file.
- **Consumers**: `Navbar`, `CartItemRow`, `OrderSummary`, `CheckoutForm`, `ProductCard`, `CartPage` (`src/app/carrito/page.tsx`). Checkout calls `clearCart()` only on successful payment (`useCreateOrder.ts:69`).
- **Layout**: `CartProvider` is mounted globally in `src/app/layout.tsx` (2 callers per codegraph).

### Backend SSOT (no cart endpoint exists)

- Strapi `contentTypes.d.ts` lists: `ApiCategoryCategory`, `ApiOrderOrder`, `ApiOrderStatusHistoryOrderStatusHistory`, `ApiProductProduct`, `Admin*`. **No `ApiCart*`** schema. Confirmed: Strapi has no cart content-type.
- `src/lib/api.ts` is purely a Strapi catalog wrapper (`fetchApiFull<T>`). No `cart` helper. No `/api/cart`, `/api/users/me/cart` route handler in `src/app/api/`.
- `src/lib/auth/session.ts` confirms session = httpOnly cookie `bv_session` (`maxAge: 604800`). Session carries a JWT; the user object is fetched server-side.

### AuthContext coupling (the smoking gun)

`src/context/AuthContext.tsx:138` — `AuthProvider.logout()` **calls `clearCart()` in its `finally` block**:

```tsx
const logout = async () => {
  setIsLoading(true)
  try {
    await fetch('/api/auth/logout', { ... })
  } catch {
  } finally {
    clearCart()    // ← WIPES THE CART
    setUser(null)
    setIsLoading(false)
    router.push('/')
  }
}
```

The cart context's save-effect (lines 55-59) then writes `[]` to localStorage. **This is the actual root cause.** The roadmap's diagnosis ("cart state in memory/session, not persisted") is wrong: persistence to localStorage exists; the wipe-on-logout is what produces the empty-cart symptom.

### Secondary defect (privacy/correctness)

The localStorage key is **not user-scoped** (`'bv-beni-cart'` constant, line 28). Even if `clearCart()` were removed from logout, multiple users on the same browser would see each other's carts. This is also a real bug — not theoretical — because the existing app already lets users register, log in, and log out on shared devices.

### Existing test coverage — bug scenario is NOT covered

`src/__tests__/context/CartContext.test.tsx` has **17 unit tests** across: Initial State, `addToCart` (3), `removeFromCart` (3), `updateQuantity` (5), `clearCart` (2), Edge Cases (2), Calculated Values (1). **None of them** exercises:

- localStorage round-trip across mounts
- logout preserving the cart
- per-user cart isolation
- guest→login cart merge

`tests/e2e/` has 14 spec files. The 7 C3 legacy-auth specs (per Engram #1608: cancellation-flow, checkout-happy-path, checkout-mobile, empty-states, order-tracking, payment-errors, +1) almost certainly include cart-add in their flows but currently fail on C3 (auth-mock drift), not on cart persistence. So e2e has zero effective coverage of the bug scenario today.

## Affected Areas

- `src/features/cart/context/CartContext.tsx` — single source of cart state; the storage key constant and the two effects need rework. ~10 LOC change site.
- `src/context/AuthContext.tsx:138` — `logout()` calls `clearCart()`. **This call must be removed or gated**. Single line, blast radius is "the entire logout flow." Coupling is the bug.
- `src/features/cart/index.ts` — public API surface; no change needed if we keep `useCart` shape stable, but new exports may land if we extract a `useCartStorage()` hook for testability.
- `src/__tests__/context/CartContext.test.tsx` — add RED tests for the bug scenario. ~6 new test cases (T0 surface).
- `tests/e2e/` — at minimum one regression spec (e.g., `cart-persistence.spec.ts`) covering `add → logout → login → cart still has item`. Requires the legacy-auth followup (`TEST-INFRA-E2E-LEGACY-AUTH`) to land first, or written independently against the new pattern.
- `docs/roadmapToProduction.md:98-103` — update the BUG-CART-PERSISTENCE entry. The "root cause probable" line is wrong; the actual cause is the `clearCart()` call in `AuthContext.logout()`.

## Approaches

### 1. Per-user localStorage key + remove logout `clearCart()` call (recommended)

Make `CART_STORAGE_KEY` dynamic: `bv-beni-cart-${userId ?? 'guest'}`. Watch `useAuth().user` and switch the active key on user changes. On logout, the **previous user's** cart stays at `bv-beni-cart-<prevUserId>`; the active key switches back to `bv-beni-cart-guest`. On login, read the new user's bucket (existing items restored) and optionally merge any guest items.

Concretely:
- `CART_STORAGE_KEY` becomes a function `(userId: number | null) => string`.
- `CartProvider` consumes `useAuth().user` (already a sibling provider, so no prop drilling) and re-keys on user change.
- Remove `clearCart()` call from `AuthContext.logout()`; the cart's own rehydration handles the transition.
- Add `mergeGuestCartInto(userCart, guestCart)` if guest has items at login — defaults: per-product max-quantity, dedupe by `id`.
- RED tests: T0 — add item → simulate logout (re-render with `user=null`) → cart still in localStorage under per-user key; T1 — login as different user → cart for that user only, no leak; T2 — guest adds → login as user → guest items merged into user cart.

- **Pros**: Capability delta = 0 (frontend only). No Strapi schema migration. ~16-30 LOC net (within roadmap's 8-16 estimate, slightly over). No backend roundtrip → fast UX. Keeps existing localStorage architecture intact.
- **Cons**: localStorage is per-browser (no cross-device). Multi-tab desync unless we add `storage` event listener (out of scope). Merge semantics need a clear policy decision (overwrite vs. sum).
- **Effort**: **Low**.

### 2. Server-side cart via Strapi (overkill for this bug)

Add a `Cart` content-type in Strapi linked to `plugin::users-permissions.user`. New endpoint `GET/PUT /api/users/me/cart`. Frontend reads/writes via the API; localStorage removed.

- **Pros**: Cross-device sync. True per-user isolation. Backend has audit trail of cart contents.
- **Cons**: Capability delta **> 0** (new schema, new controller, new endpoint, frontend rewrite of cart context). The roadmap's "8-16 LOC" estimate is wildly wrong for this scope; reality is 200-400 LOC + Strapi migration + new tests. Significantly larger blast radius. Sprint 4 carryover BUG-FAVORITES-400 already needs the favorites API to behave — adding more endpoints is more risk surface.
- **Effort**: **High**.

### 3. Hybrid — localStorage cache + Strapi source of truth

localStorage as fast cache (current behavior); every cart mutation also POSTs to `/api/users/me/cart`. On mount, fetch from server, overlay localStorage.

- **Pros**: Best UX (instant render from cache, server durability).
- **Cons**: Sync conflicts (offline → reconnects). Largest capability delta. Highest test surface (race conditions, network failures, optimistic concurrency). Likely 400+ LOC. **Exceeds review budget** → must use chained PRs.
- **Effort**: **High** + chained PR complexity.

## Recommendation

**Approach 1 (per-user localStorage + remove `clearCart()` from logout).**

Rationale:
- **Capability delta = 0** keeps this in pure-frontend territory, matching the roadmap's intent ("independiente de TEST-INFRA-VITEST/E2E ya cerrados").
- ~16-30 LOC fits the 400-line review budget comfortably (single PR).
- Closes BOTH the reported symptom (`add → logout → login → cart empty`) AND the latent cross-user leak (per-user key).
- Reuses the existing localStorage architecture — no new abstractions to maintain.
- Matches PII constraint in `AGENT.md`: cart items (products + quantities) are not personal data, and per-user key suffix is a key, not stored PII.
- Approach 2 and 3 are valid future enhancements (cross-device sync) but out of scope for "fix the lost-cart bug."

**Strict TDD sequence:**
1. **T0 RED**: write a vitest unit test in `src/__tests__/context/CartContext.test.tsx` that asserts cart survives a simulated logout/login roundtrip (auth user changes from `null` → `1` → `null` → `1`). Test must fail because current `clearCart()` call wipes it.
2. T1 RED: write a unit test asserting no cross-user leak (user A's items must not appear under user B's key).
3. T2 RED: write a unit test for guest→login cart merge semantics (policy decision: per-product max-quantity sum).
4. Implement Approach 1; all RED → GREEN.
5. Optional: add a Playwright spec `tests/e2e/cart-persistence.spec.ts` covering the manual scenario from the roadmap. **Note**: this spec will need the modern cookie-session auth mocking pattern from `uxw01-regression-sweep.spec.ts`; can ship alongside `TEST-INFRA-E2E-LEGACY-AUTH` followup or independently.

**Capability delta**: 0 (frontend only).

## Risks

1. **AuthContext coupling is the bug, not CartContext alone.** Fixing the localStorage key without removing the `clearCart()` call in `AuthContext.logout()` would still wipe the cart. Both must change together. If the spec/proposal splits them, the fix is incomplete.
2. **Guest→login merge policy is a product decision, not a technical one.** Three options: (a) replace guest cart with user's saved cart (loses guest intent), (b) merge per-product with max-quantity (most generous), (c) merge per-product with sum (over-stocking risk). Need user direction. Default proposal: (b) max-quantity, with a UI prompt if guest cart is non-empty at login.
3. **Multi-tab desync.** localStorage doesn't propagate across tabs without a `storage` event listener. Not addressed by Approach 1. Out of scope for this bug; surface as future work.
4. **Hydration race during user switch.** The hydration effect currently runs once on mount. If user changes mid-session, we need to re-hydrate from the new key. The fix must re-run hydration on `user.id` change, not just on mount.
5. **`isHydrated` flag semantics.** Today `isHydrated` is set true once on mount. After re-keying, the flag must be re-evaluated for SSR consistency on `/carrito` (which redirects if `!isHydrated`). Easy to miss; tests must assert `isHydrated` cycles correctly across user transitions.
6. **No backend involvement means no audit trail.** Cart contents disappear if user clears browser data. Acceptable for a watch store; surface in proposal as a known limitation.
7. **E2E coverage gap remains.** The 7 C3 legacy-auth specs still fail. This bug fix can land without addressing them, but the regression spec for the manual scenario (`cart-persistence.spec.ts`) should use the modern cookie-session auth pattern, NOT the legacy `localStorage.jwt` + `/api/users/me` mocks.

## Ready for Proposal

**Yes.** The orchestrator can proceed to `sdd-propose` with the following framing for the user:

> BUG-CART-PERSISTENCE root cause is NOT what the roadmap says (in-memory state) — the cart IS persisted to localStorage. The actual cause is `AuthContext.logout()` calling `clearCart()` at `src/context/AuthContext.tsx:138`, plus a secondary latent bug: the localStorage key is global, not per-user. Recommended fix is frontend-only (capability delta = 0): per-user localStorage key + remove the wipe-on-logout call. ~16-30 LOC, single PR, fits the 400-line review budget. Need one product decision before spec: guest→login cart merge policy (max-quantity vs. sum vs. replace). E2E regression spec is independent of this fix and should use the modern cookie-session auth pattern.
