# Order Cancellation Service Spec

> Established domain. Originally created in `orders-services-refactor` (archived 2026-07-15). Amended by `debt-03-orders-malformed-payload-502` (2026-07-17) — MODIFIED `requestCancellationService Contract` to catch malformed-but-200 payloads as service 502, ADDED `Malformed-Payload 502 Test Coverage` requirement. `requestCancellationService` (server, Strapi-direct) is DISTINCT from the existing client wrapper `requestOrderCancellation` in `requestCancellation.ts` — both remain, untouched. `api-traceability` and `secure-route-authorization` are preserved byte-identically. All externally observable behavior of `POST /api/orders/[orderId]/request-cancellation` MUST be byte-identical to the pre-refactor route EXCEPT the Modified reason-length policy below **and** the malformed-payload case (500 → service 502).

## ADDED Requirements

### Requirement: requestCancellationService Contract

The feature layer MUST expose `requestCancellationService({ user, jwtToken, traceId, orderId, reason }): Promise<{ data: { success: true; message: string } } | { error: NextResponse }>` in `src/features/orders/services/requestCancellationService.ts`, exported from `src/features/orders/index.ts`. The service MUST own both Strapi calls (GET lookup + PUT update), URL construction, `Authorization`/`Content-Type`/`X-Trace-Id` headers on both calls, `normalizeStrapiOrder` unwrapping, IDOR ownership check, cancellable-status validation against the relocated `CANCELLABLE_STATUSES`, update-body construction, and friendly error mapping. The post-JSON-parse block of the GET leg — `payload.data ?? []`, `.find((o) => normalizeStrapiOrder(o).orderId === orderId)`, `normalizeStrapiOrder(matchingOrder)`, the IDOR check, the `orderId !== param` check, the status check, and onward to the PUT — MUST run inside a single try/catch that maps ANY thrown error (incl. a malformed-but-200 Strapi payload like `{ data: [null] }` or `{ data: [undefined] }`) to the SAME service-level 502 used by the GET-leg fetch / non-ok / JSON-parse failure paths. The service MUST NOT make `normalizeStrapiOrder` null-safe; the catch MUST fire BEFORE any route-level 500.
(Previously: the `Strapi failure — 502 byte-identical` scenario asserted every 502 was byte-identical to the pre-refactor route. Malformed-but-200 payloads were NOT covered — they leaked to the route's top-level 500 `'Ocurrió un error inesperado. Inténtalo de nuevo.'`. Supersedes the byte-identical claim for the malformed-payload scenario ONLY, mirroring the `Cancellation Reason Length Policy` MODIFIED precedent.)

#### Scenario: Cancellable order — 200 (two-call flow) (KEPT)
- GIVEN an authenticated owner of a `pending`/`paid`/`processing` order sends a valid reason
- WHEN the service runs
- THEN it performs a GET lookup then a PUT setting `orderStatus='cancellation_requested'`
- AND both calls carry the same `X-Trace-Id`, and `{ data: { success: true, message } }` is returned

#### Scenario: Network / non-ok / JSON-parse failure — 502 byte-identical (KEPT)
- GIVEN Strapi `fetch` rejects, returns non-`ok`, OR JSON body fails to parse (GET or PUT leg)
- WHEN the service handles it
- THEN it returns 502 `"No pudimos enviar la solicitud. Inténtalo de nuevo."` + `X-Trace-Id`, byte-identical to before

#### Scenario: Malformed-but-200 payload — 502 (NEW, MODIFIED)
- GIVEN Strapi's GET lookup returns `ok:true` with a malformed JSON body such as `{ data: [null] }` or `{ data: [undefined] }`
- WHEN the service runs the `.find` → `normalizeStrapiOrder` block
- THEN it returns 502 `"No pudimos enviar la solicitud. Inténtalo de nuevo."` + `X-Trace-Id`
- AND MUST NOT leak a route 500 `"Ocurrió un error inesperado. Inténtalo de nuevo."`

#### Scenario: Edge-case ordering — malformed first => 502 not 404 (NEW)
- GIVEN Strapi's GET lookup returns `ok:true` with `payload.data = [null, <valid-other-order>]`
- WHEN `orders.find((o) => normalizeStrapiOrder(o).orderId === orderId)` runs
- THEN `normalizeStrapiOrder(null)` throws INSIDE `.find` BEFORE `matchingOrder` is assigned
- AND the catch fires on the first malformed candidate → 502 (NOT 404) + `"No pudimos enviar la solicitud. Inténtalo de nuevo."` + `X-Trace-Id`

#### Scenario: Non-owner or missing order — 404 (IDOR, no disclosure) (KEPT)
- GIVEN the resolved order's owner differs from `user.id`, no order matches, or `orderId !==` the param
- WHEN ownership resolves
- THEN it returns 404 `"Pedido no encontrado"` + `X-Trace-Id`
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

## ADDED Requirements

### Requirement: Malformed-Payload 502 Test Coverage (Strict TDD)

`src/features/orders/services/__tests__/requestCancellationService.test.ts` MUST add EXACTLY ONE new "malformed-but-200 → 502" scenario using `mockResolvedValueOnce({ ok:true, json: async () => ({ data: [null] }) })` for the GET lookup, asserting `status === 502`, `body.error === "No pudimos enviar la solicitud. Inténtalo de nuevo."`, and `X-Trace-Id`. The same scenario MUST include (or be co-located with) the `[null, <valid-other>]` ordering edge-case assertion. The EXISTING 502 scenarios (network, non-ok, json-parse on GET and PUT legs) MUST remain present and byte-identical. The service MUST NOT gain a dedicated `normalizeStrapiOrder.test.ts` in this change.

#### Scenario: One new scenario, existing kept byte-identical
- GIVEN the suite runs under `npx vitest run --maxWorkers=2`
- WHEN the malformed-200 scenario is added
- THEN exactly one new GET-leg 502 case runs and passes
- AND existing 502 cases (network, non-ok, json-parse on GET and PUT) stay byte-identical and pass
- AND the `[null, <valid-other>]` edge-case asserts 502 (NOT 404)