# Secure Route Authorization Specification

## Purpose

Protect sensitive API routes by validating JSON Web Tokens for authenticity, expiry, and authorization scope before processing requests.

## Requirements

### Requirement: JWT Validation in Orders Route

The `/api/orders` route MUST validate the JWT from the session cookie. The route MUST reject requests when the JWT is missing, invalid, or expired. The route MUST also ensure the `user` query parameter matches the user ID encoded in the JWT to prevent IDOR.

#### Scenario: Valid owner request

- GIVEN a request to `/api/orders?user=42` with a valid JWT for user 42
- WHEN the route handles the request
- THEN the request is forwarded to Strapi and the user's orders are returned

#### Scenario: Missing JWT

- GIVEN a request to `/api/orders` with no session cookie
- WHEN the route handles the request
- THEN the response status is 401 Unauthorized
- AND no Strapi call is made

#### Scenario: Tampered JWT

- GIVEN a request with a JWT that fails signature validation
- WHEN the route handles the request
- THEN the response status is 401 Unauthorized
- AND the response contains a friendly error message

#### Scenario: IDOR attempt

- GIVEN a request to `/api/orders?user=99` with a valid JWT for user 42
- WHEN the route handles the request
- THEN the response status is 403 Forbidden
- AND no orders for user 99 are returned

### Requirement: JWT Validation in Payment Intent Route

The `/api/create-payment-intent` route MUST validate that the JWT is present, syntactically valid, signed correctly, and not expired. Presence alone is insufficient.

#### Scenario: Authenticated checkout

- GIVEN a request with a valid, unexpired JWT cookie
- WHEN the route creates a payment intent
- THEN Stripe creates the intent and the client secret is returned

#### Scenario: Expired JWT

- GIVEN a request with a JWT that has expired
- WHEN the route handles the request
- THEN the response status is 401 Unauthorized
- AND no payment intent is created

#### Scenario: Invalid JWT format

- GIVEN a request with a malformed JWT cookie
- WHEN the route handles the request
- THEN the response status is 401 Unauthorized
- AND the response body does not expose internal validation details

### Requirement: Consistent Authorization Errors

Authorization failures MUST return a friendly, non-technical message to the client. The response MUST NOT leak JWT contents, signing secrets, or stack traces.

#### Scenario: Rejected request

- GIVEN an authorization check fails
- WHEN the route responds
- THEN the body contains a friendly error message
- AND no JWT payload or secret is included
