# Cart Management Specification

## Purpose

Define cart state across sessions, auth transitions, and per-user boundaries on shared browsers. Cart is purely frontend (localStorage, no backend endpoint). The `useCart` API MUST remain stable (19 callers); only storage keying and hydration may change.

## Requirements

### Requirement: Cross-Session Persistence

When an authenticated user logs out and logs back in as the same user, cart items and quantities MUST be restored. The logout flow MUST NOT clear the cart.

#### Scenario: Items survive logout/login

- GIVEN an authenticated user with 2 items at different quantities
- WHEN the user logs out and logs back in as the same user
- THEN the cart displays the same 2 items with same quantities

### Requirement: Per-User Cart Isolation

When multiple users share the same browser, each authenticated user MUST see only their own cart. Guest carts MUST be isolated from users' carts.

#### Scenario: Two users on one browser

- GIVEN user A (id=1) has item X
- WHEN user A logs out and user B (id=2) logs in
- THEN user B's cart is empty
- AND user B's cart key is distinct from A's

#### Scenario: Guest cart does not leak

- GIVEN an anonymous visitor has item X in the guest cart
- WHEN the visitor logs in
- THEN the authenticated user's cart does not include item X

### Requirement: Guest to Login Cart Merge

When an anonymous visitor with items authenticates, the guest cart MUST merge into the user's cart using per-product max-quantity, deduped by product id. After merge, the guest cart storage MUST be cleared.

#### Scenario: Same product in both carts

- GIVEN a guest cart with 1× product X and the user's cart with 3× product X
- WHEN the user logs in
- THEN the resulting cart has 3× product X
- AND the product is not duplicated

#### Scenario: Product present only in guest cart

- GIVEN a guest cart with 2× product Y and the user's cart with no product Y
- WHEN the user logs in
- THEN the resulting cart includes 2× product Y

### Requirement: Legacy Key Migration on First Login

When a user logs in for the first time after this fix is deployed, items stored under the legacy global key `bv-beni-cart` MUST be migrated to the per-user key, and the legacy key MUST be removed from storage.

#### Scenario: Items migrated and legacy key cleared

- GIVEN the legacy key `bv-beni-cart` has 3 items
- WHEN the user logs in for the first time post-fix
- THEN the per-user key contains those 3 items and the legacy key is removed

#### Scenario: Empty legacy key is a no-op

- GIVEN the legacy key is absent or empty
- WHEN the user logs in
- THEN no error is raised and the per-user key remains unchanged

### Requirement: Cart Hydration on Authentication Transitions

When the authenticated user's id changes, the cart provider MUST re-hydrate from localStorage using the key bound to the new user. The `isHydrated` flag MUST cycle to prevent stale UI.

#### Scenario: Re-hydration on login

- GIVEN a guest user logs in and the per-user key has 2 items
- WHEN authentication completes
- THEN the cart displays those 2 items
- AND `isHydrated` is true

#### Scenario: Re-hydration on logout

- GIVEN a user with id=1 logs out after adding items
- WHEN logout completes
- THEN the cart UI reflects the guest cart or is empty
- AND the previous user's items remain in their per-user key

### Requirement: Payment Success Clears Cart

When an order is created successfully, the cart MUST be cleared.

#### Scenario: Successful checkout empties the cart

- GIVEN a user with items completes checkout successfully
- WHEN the order creation API returns success
- THEN the cart storage is cleared and the cart UI is empty post-redirect
