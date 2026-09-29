# Specification: checkout-confirmation-redirect

## Purpose

Define the post-checkout redirect contract for the `CheckoutPage` flow. After a successful PUT upsert the user MUST land on `/order-confirmation?orderId=<server-order-id>`. The competing empty-cart redirect to `/tienda` MUST be suppressed while an order is in flight. The `/tienda` redirect is reserved exclusively for the cart-empty-at-mount case.

This capability closes the v1.8.0 regression introduced by the `sprint-5-stripe-upsert` rewrite of `useCreateOrder`.

## Requirements

### Requirement: Order-In-Flight Guard

`CheckoutPage` MUST track an order-in-flight state and MUST suppress the empty-cart `useEffect` redirect while that state is set. The flag MUST be set synchronously, before `useCreateOrder.createOrder()` is called, so the cart-clearing render never observes `false`.

The flag MUST be consulted in two places:
- The empty-cart `useEffect` that pushes `/tienda`.
- The render early-return at `page.tsx:74` (mid-navigation guard).

The flag MUST be reset only when `orderError` becomes truthy. The flag MUST NOT be reset on success (it must outlive the final render) or on unmount (mount-scoped lifetime prevents stale-flag).

#### Scenario: Successful PUT suppresses /tienda race

- GIVEN a populated cart and a Stripe payment intent that resolves successfully
- WHEN `useCreateOrder.createOrder()` returns 200 with an `orderId`
- AND `clearCart()` empties the cart synchronously after the PUT
- THEN the empty-cart `useEffect` MUST NOT push `/tienda`
- AND `useCreateOrder` MUST push `/order-confirmation?orderId=<server-order-id>`
- AND the final URL MUST be `/order-confirmation?orderId=<server-order-id>`

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

After a 200 response from `PUT /api/orders/by-order-id/{orderId}` the final URL MUST be `/order-confirmation?orderId=<server-order-id>`. The `orderId` MUST match the `orderId` returned by the backend in the PUT response body.

#### Scenario: E2E strict URL assertion

- GIVEN the mocked Strapi payment-intent and PUT upsert flow runs end-to-end
- WHEN the user reaches the post-checkout state
- THEN `page.url()` MUST match `/\/order-confirmation\?orderId=FAKE_ORDER_ID/`

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
