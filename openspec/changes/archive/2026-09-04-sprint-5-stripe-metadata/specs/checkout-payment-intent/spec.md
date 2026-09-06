# checkout-payment-intent Specification

## Purpose

Define server-authoritative PaymentIntent creation during checkout. The flow MUST inject `metadata.orderId` and `metadata.userId` into every Stripe `paymentIntents.create` call so backend reconciliation can match Stripe events to orders. The same server-generated `orderId` MUST flow into metadata and response.

## Requirements

### Requirement: PaymentIntent Reconciliation Metadata

The create-payment-intent flow MUST include `metadata.orderId` and `metadata.userId` in every `paymentIntents.create` call. Existing `metadata.itemsCount`, `metadata.subtotal`, and `metadata.shipping` MUST be preserved. If either field is unavailable, the flow MUST fail closed: return an error and MUST NOT call Stripe.

#### Scenario: Happy path populates both metadata fields

- GIVEN an authenticated session and a valid cart payload
- WHEN the flow invokes `paymentIntents.create`
- THEN the call MUST carry `metadata.orderId` and `metadata.userId`
- AND retain `metadata.itemsCount`, `metadata.subtotal`, `metadata.shipping`

#### Scenario: Missing metadata fails closed

- GIVEN the flow cannot resolve `orderId` or `userId`
- WHEN the flow would otherwise invoke `paymentIntents.create`
- THEN the flow MUST return an error
- AND NOT call the Stripe API

### Requirement: Server-Authoritative orderId Generation

The `orderId` MUST be generated server-side BEFORE `paymentIntents.create` using the existing server-safe `generateOrderId()`. The SAME id MUST flow into metadata and response.

#### Scenario: orderId generated before Stripe call

- GIVEN an authenticated request to create-payment-intent
- WHEN the flow runs
- THEN `orderId` MUST be available before any Stripe API call
- AND the same value MUST appear in `metadata.orderId` and the response body

#### Scenario: Two requests produce different orderIds

- GIVEN two sequential authenticated requests
- WHEN both flows execute
- THEN the two PaymentIntents MUST carry different `metadata.orderId` values

### Requirement: userId Derived from Server Session Only

The `userId` in PaymentIntent metadata MUST come exclusively from the authenticated server session (`requireUser()`). The flow MUST NOT read `userId` from request body, query, headers, or any client-supplied field.

#### Scenario: Authenticated request populates userId

- GIVEN a request with a valid authenticated session
- WHEN the flow runs
- THEN `metadata.userId` MUST equal the session-derived user id

#### Scenario: Missing or invalid session rejects the request

- GIVEN a request with no valid session or expired/invalid auth token
- WHEN the flow runs
- THEN the flow MUST reject the request with an error
- AND NOT invoke `paymentIntents.create`

#### Scenario: Client-supplied userId is ignored

- GIVEN a request that includes `userId` in body or query
- WHEN the flow runs
- THEN `metadata.userId` MUST equal the session-derived id, NOT the client value

### Requirement: orderId Surfaced in Response

The create-payment-intent response MUST include the server-generated `orderId` so downstream code can persist it as the canonical id.

#### Scenario: Response carries orderId

- GIVEN a successful `paymentIntents.create` call
- WHEN the flow returns its response
- THEN the response MUST include `orderId` equal to the metadata value

### Requirement: Client Consumes Server orderId

The client checkout hook (`useCreateOrder`) MUST consume the `orderId` returned by create-payment-intent. It MUST NOT call `generateOrderId()` locally.

#### Scenario: Hook consumes server orderId

- GIVEN a successful create-payment-intent response containing `orderId`
- WHEN `useCreateOrder` builds the order submission
- THEN the order payload MUST use the response `orderId` verbatim

#### Scenario: Local generation removed

- GIVEN the checkout flow source
- WHEN the hook is invoked
- THEN the hook MUST NOT call `generateOrderId()` or any local id generator

### Requirement: Stripe Errors Map to Friendly UI Messages

Stripe errors raised during PaymentIntent creation MUST be mapped to friendly Spanish messages via the existing `checkout-error-display` capability. Raw Stripe codes or English text MUST NOT leak to the client.

#### Scenario: card_declined maps to localized alert

- GIVEN Stripe raises a `card_error` with `code: 'card_declined'`
- WHEN the flow handles the failure
- THEN the response MUST surface the mapped Spanish string
- AND MUST NOT contain the raw code or English message

#### Scenario: Stripe API failure degrades gracefully

- GIVEN Stripe raises an `api_error`, network, or timeout failure
- WHEN the flow handles the failure
- THEN the response MUST surface a friendly fallback message
- AND NOT crash, hang, or leak Stripe internals

## Dependencies

- `checkout-error-display` provides the Spanish mapping reused here.
- Strict TDD ACTIVE per `openspec/config.yaml`; apply MUST use `npx vitest run --maxWorkers=2`.