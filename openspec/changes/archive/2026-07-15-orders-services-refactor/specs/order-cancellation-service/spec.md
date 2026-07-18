# Delta for Order Cancellation Service

> New domain — no prior `openspec/specs/order-cancellation-service`; this delta doubles as the full spec. `requestCancellationService` (server, Strapi-direct) is DISTINCT from the existing client wrapper `requestOrderCancellation` in `requestCancellation.ts` — both remain, untouched. `api-traceability` and `secure-route-authorization` are preserved byte-identically. All externally observable behavior of `POST /api/orders/[orderId]/request-cancellation` MUST be byte-identical to the pre-refactor route EXCEPT the Modified reason-length policy below.

## ADDED Requirements

### Requirement: requestCancellationService Contract

The feature layer MUST expose `requestCancellationService({ user, jwtToken, traceId, orderId, reason }): Promise<{ data: { success: true; message: string } } | { error: NextResponse }>` in `src/features/orders/services/requestCancellationService.ts`, exported from `src/features/orders/index.ts`. The service MUST own both Strapi calls (GET lookup + PUT update), URL construction, `Authorization`/`Content-Type`/`X-Trace-Id` headers on both calls, `normalizeStrapiOrder` unwrapping, IDOR ownership check, cancellable-status validation against the relocated `CANCELLABLE_STATUSES`, update-body construction, and friendly error mapping.

#### Scenario: Cancellable order — 200 (two-call flow)
- GIVEN an authenticated owner of a `pending`/`paid`/`processing` order sends a valid reason
- WHEN the service runs
- THEN it performs a GET lookup then a PUT setting `orderStatus='cancellation_requested'`
- AND both calls carry the same `X-Trace-Id`, and `{ data: { success: true, message } }` is returned

#### Scenario: Strapi failure — 502 byte-identical
- GIVEN the lookup or PUT call returns non-`ok` or fails to parse
- WHEN the service handles it
- THEN it returns a 502 `NextResponse` with `"No pudimos enviar la solicitud. Inténtalo de nuevo."` and the `X-Trace-Id` header

#### Scenario: Non-owner or missing order — 404 (IDOR, no disclosure)
- GIVEN the resolved order's owner differs from `user.id`, no order matches, or `orderId !==` the param
- WHEN ownership resolves
- THEN it returns a 404 `NextResponse` with `"Pedido no encontrado"` and the `X-Trace-Id` header
- AND MUST NOT return 403 — preserves `secure-route-authorization` non-disclosure intent

### Requirement: Cancellable Status Validation

`CANCELLABLE_STATUSES` MUST be `['pending','paid','processing']`, relocated out of the route into the feature/service layer and co-located with `requestCancellationService`. An order whose status is not in this set MUST yield a 400 `NextResponse` byte-identical to the current route: `"No se puede cancelar un pedido en estado: {status}"`, with the `X-Trace-Id` header, and MUST NOT perform the PUT.

#### Scenario: Non-cancellable status — 400 byte-identical
- GIVEN an owner of an order in any non-cancellable status
- WHEN the service validates before the PUT
- THEN it returns 400 with `"No se puede cancelar un pedido en estado: {status}"` and the `X-Trace-Id` header
- AND no PUT to Strapi is performed

#### Scenario: Double-click on already-cancellation_requested — 400 byte-identical (KEPT)
- GIVEN an order already in `cancellation_requested` and a second cancellation request arrives
- WHEN validation runs
- THEN the response is 400 (NOT 200/idempotent), byte-identical to the current route
- (Previously: unchanged — explicitly KEPT, not a behavior change)

### Requirement: Order Cancellation Route Thin Delivery Layer

`POST /api/orders/[orderId]/request-cancellation` MUST contain only `getTraceId`, `requireUser`, `await params`, body parsing, `reason` validation, delegation to `requestCancellationService`, `if ('error' in result) return result.error`, a success response, and a top-level `500` catch. It MUST NOT contain `fetch`, URL construction, `normalizeStrapiOrder`, ownership checks, or `CANCELLABLE_STATUSES` (relocated). All externally observable behavior MUST be byte-identical to the pre-refactor route EXCEPT the Modified reason-length policy.

#### Scenario: Route delegates success and errors unchanged (except reason policy)
- GIVEN the slimmed route receives a valid request
- WHEN it delegates to `requestCancellationService`
- THEN 200/400/404/502 responses match the pre-refactor route byte-for-byte, except the reason-length 400 (see below)
- AND the route source contains zero `fetch`/`normalizeStrapiOrder`/`CANCELLABLE_STATUSES` references

## MODIFIED Requirements

### Requirement: Cancellation Reason Length Policy

> **Deliberate behavior change — NOT byte-identical.** Supersedes proposal business rule #4. Inherits no formal prior requirement; this MODIFIED block records the change relative to the pre-refactor route behavior documented in `exploration.md`.

The cancellation `reason` MUST be hard-capped at **500 characters**. If the client sends a `reason` longer than 500 characters, the route/service MUST return **400** with a friendly Spanish validation message of 2-3 sentences giving context and a short explanation, plus the `X-Trace-Id` header. The system MUST NOT silently truncate the reason, and MUST NOT accept or store a reason longer than 500 characters.
(Previously: the route silently truncated via `reason.substring(0,1000)` before storing, returning no validation error.)

#### Scenario: Reason at boundary — 500 chars accepted
- GIVEN an owner sends a 500-character `reason` for a cancellable order
- WHEN the request is validated and processed
- THEN it is accepted (cancellation proceeds) and stored at 500 characters

#### Scenario: Reason over boundary — 400 with friendly Spanish message
- GIVEN an owner sends a 501-character `reason`
- WHEN the route/service validates
- THEN it returns 400 with a friendly Spanish message of 2-3 sentences explaining the 500-character limit, plus the `X-Trace-Id` header
- AND no PUT to Strapi is performed

#### Scenario: Missing reason — 400 byte-identical (KEPT)
- GIVEN the request body omits `reason`
- WHEN the route validates
- THEN it returns 400 with `"Indícanos el motivo..."` byte-identical to the current route
- (Previously: unchanged — KEPT)

## ADDED Requirements

### Requirement: Cancellation Route + Service First Tests (Strict TDD)

Under `tdd: true`, the first tests for `requestCancellationService` (mocking `global.fetch`) and the `request-cancellation` route (mocking the service) MUST be written before/with implementation, covering 200, 400-reason-too-long, 400 non-cancellable (kept), 404 non-owner (kept), 502, header presence on both Strapi calls, and byte-identical Spanish strings + body shapes.

#### Scenario: Service + route test coverage
- GIVEN the new service and route tests run under `npx vitest run --maxWorkers=2`
- WHEN they execute
- THEN both Strapi calls are asserted to carry `X-Trace-Id`
- AND 200/400/404/502 plus the 500-char reason boundary are each covered