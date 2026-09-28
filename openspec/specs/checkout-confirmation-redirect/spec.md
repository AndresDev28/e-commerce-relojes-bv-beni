# Specification: checkout-confirmation-redirect

## Purpose

Define the post-checkout redirect contract for the `CheckoutPage` flow. After a successful PUT upsert the user MUST land on `/order-confirmation?orderId=<server-order-id>`. The competing empty-cart redirect to `/tienda` MUST be suppressed while an order is in flight. The `/tienda` redirect is reserved exclusively for the cart-empty-at-mount case.

This capability closes the v1.8.0 regression introduced by the `sprint-5-stripe-upsert` rewrite of `useCreateOrder`.

## Requirements

### Requirement: Order-In-Flight Guard

`CheckoutPage` MUST track an order-in-flight latch and MUST suppress the empty-cart `useEffect` redirect while the latch is set. The latch MUST be set synchronously before `useCreateOrder.createOrder()` is called, so the cart-clearing render never observes an unset guard.

The latch MUST be ref-based, readable by the empty-cart effect and the success callback without waiting for a re-render. A render-state mirror MAY exist for UI reads, but the effect MUST consult the latch, not render state. The success handler MUST be idempotent: while the latch is set, duplicate `onSuccess` callbacks MUST NOT trigger another `createOrder`.

The latch MUST be reset only when `orderError` becomes truthy. It MUST NOT be reset on success (it must outlive the final render) or on unmount (mount-scoped lifetime prevents stale-flag).

The latch MUST NOT be consulted by the render early-return (`page.tsx:74`); the early-return MUST remain gated solely on empty cart, keeping the processing modal (`page.tsx:194-206`) reachable during the PUT.

(Previously: the flag was consulted in two places — the empty-cart effect AND the render early-return, `spec.md:15-17` — which encoded F2's W1 defect (processing modal unreachable); that clause is removed.)

#### Scenario: Successful PUT suppresses /tienda race

- GIVEN a populated cart, a payment intent that resolves successfully, and the latch set before `createOrder()`
- WHEN the PUT returns 200 with an `orderId` and `clearCart()` empties the cart synchronously
- THEN the empty-cart `useEffect` MUST NOT push `/tienda`
- AND the final URL MUST be `/order-confirmation?orderId=<server-order-id>`

#### Scenario: Duplicate onSuccess is ignored

- GIVEN the latch is already set from a first success callback
- WHEN a duplicate `onSuccess` fires
- THEN exactly ONE `createOrder` call and ONE PUT MUST occur
- AND the final URL MUST be `/order-confirmation?orderId=<server-order-id>`

#### Scenario: Fast cart-clear with late empty-cart effect

- GIVEN the latch (useRef) is set before `createOrder()`
- WHEN `clearCart()` commits before the confirmation push and the empty-cart effect runs late
- THEN the effect MUST read the latch and MUST NOT push `/tienda`

#### Scenario: orderError resets the latch

- GIVEN the latch is set and the PUT returns non-2xx
- WHEN `orderError` becomes truthy
- THEN the latch MUST reset
- AND the banner MUST render, the URL MUST remain `/checkout`, and the cart MUST remain populated

#### Scenario: Success never resets the latch

- GIVEN the PUT returned 200 and confirmation navigation completes
- WHEN the page unmounts
- THEN the latch MUST NOT have been reset by the success path

#### Scenario: Processing modal reachable during PUT

- GIVEN an order is in flight (latch set)
- WHEN `CheckoutPage` renders
- THEN the early-return MUST NOT fire and the processing modal MUST be visible

### Requirement: Cart-Empty-at-Mount Policy

`CheckoutPage` MUST redirect to `/tienda` ONLY when the cart is empty at the time the checkout page mounts. After a successful order the page MUST NOT redirect to `/tienda` regardless of cart state.

#### Scenario: Empty cart at mount

- GIVEN an anonymous or authenticated visitor with an empty cart navigating to `/checkout`
- WHEN the page mounts
- THEN the empty-cart `useEffect` MUST redirect to `/tienda`

#### Scenario: Cart emptied by successful order does NOT redirect to /tienda

- GIVEN a populated cart and a successful PUT upsert
- WHEN `clearCart()` runs and `cartItems` becomes `[]`
- THEN the page MUST NOT push `/tienda`
- AND the final URL MUST be `/order-confirmation?orderId=<server-order-id>`

### Requirement: Success URL Contract

After a 200 response from `PUT /api/orders/by-order-id/{orderId}` the final URL MUST be `/order-confirmation?orderId=<server-order-id>`. The `orderId` MUST match the `orderId` returned by the backend in the PUT response body. Verification MUST include an explicit final-URL assertion; PUT-count polling alone MUST NOT be accepted as proof of the redirect.

(Previously: same URL contract, but the only scenario used the mocked Strapi e2e, which today has NO final-URL assertion — only a PUT-count poll, `tests/e2e/checkout-order-upsert.spec.ts:184-188`.)

#### Scenario: E2E strict URL assertion (mocked Strapi)

- GIVEN the mocked Strapi payment-intent and PUT upsert flow runs end-to-end
- WHEN the user reaches the post-checkout state
- THEN `expect(page).toHaveURL(/\/order-confirmation\?orderId=/)` MUST pass
- AND the single-PUT assertion MUST be kept alongside it

#### Scenario: Live 4242 end-to-end URL assertion

- GIVEN a real Stripe test payment (card 4242) through ngrok against the live backend
- WHEN checkout completes and the PUT returns 200
- THEN the browser MUST land on `/order-confirmation?orderId=<server-order-id>`

### Requirement: Failure Path

After a non-2xx response from `PUT /api/orders/by-order-id/{orderId}` the page MUST display the friendly `orderError` banner (mapped via `checkoutOrderErrors`) and MUST NOT navigate to either `/order-confirmation` or `/tienda`.

#### Scenario: 4xx surfaces friendly error, no navigation

- GIVEN a populated cart and a PUT upsert that returns 400
- WHEN `useCreateOrder.createOrder()` resolves with the 400 response
- THEN the `orderError` banner MUST render with the mapped Spanish message
- AND the URL MUST remain `/checkout`
- AND the cart MUST remain populated

#### Scenario: 5xx surfaces friendly error, no navigation

- GIVEN a populated cart and a PUT upsert that returns 500
- WHEN `useCreateOrder.createOrder()` resolves with the 500 response
- THEN the `orderError` banner MUST render with the mapped Spanish message (raw "Internal Server Error" MUST NOT reach the UI)
- AND the URL MUST remain `/checkout`
- AND the cart MUST remain populated

### Requirement: Contract Preservation

The D-locked PUT wire body MUST remain `{ userId, paymentIntentId, items, subtotal, shipping, paymentInfo }`. The PUT MUST NOT include `orderId`, `orderStatus`, or `total` in the body. Every API call from `useCreateOrder` MUST carry the `X-Trace-Id` header (UUIDv4).

#### Scenario: D-locked wire body shape preserved

- GIVEN the checkout flow is exercised in unit or e2e tests
- WHEN `useCreateOrder.createOrder()` runs
- THEN the request body MUST match the D-locked schema
- AND the request headers MUST include `X-Trace-Id` as a valid UUIDv4

### Requirement: Error Mapping

All backend error responses MUST pass through `checkoutOrderErrors(status, body)` (introduced by `sprint-5-stripe-upsert`) before any error text reaches the UI.

#### Scenario: Raw 500 text never reaches user

- GIVEN the backend returns `{ error: "Internal Server Error" }` with status 500
- WHEN `checkoutOrderErrors(500, body)` is invoked
- THEN the UI MUST display the Spanish friendly message (e.g., "Hubo un problema al procesar tu pedido. Intentá nuevamente.")
- AND the raw `"Internal Server Error"` text MUST NOT appear in the DOM
