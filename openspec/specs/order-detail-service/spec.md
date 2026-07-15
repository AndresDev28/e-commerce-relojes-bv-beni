# Delta for Order Detail Service

> New domain — no prior `openspec/specs/order-detail-service`. This delta doubles as the full spec. Cross-cutting specs `api-traceability` and `secure-route-authorization` are preserved byte-identically and are NOT modified here. Externally observable behavior of `GET /api/orders/[orderId]` MUST stay byte-identical to the pre-refactor route.

## ADDED Requirements

### Requirement: getOrderByIdService Contract

The feature layer MUST expose `getOrderByIdService({ user, jwtToken, traceId, orderId }): Promise<{ data: NormalizedOrder } | { error: NextResponse }>` in `src/features/orders/services/getOrderByIdService.ts`, exported from `src/features/orders/index.ts`. The service MUST own Strapi URL construction, the single `fetch` with `Authorization`, `Content-Type`, and `X-Trace-Id` headers, `attributes` unwrapping via `normalizeStrapiOrder`, IDOR ownership check, not-found handling, and friendly error mapping. The service MUST NOT depend on the route layer.

#### Scenario: Owner fetches own order — 200
- GIVEN an authenticated owner requests their own `orderId` with a valid `jwtToken` and `traceId`
- WHEN `getOrderByIdService` runs
- THEN Strapi is fetched once with `Authorization`, `Content-Type`, and `X-Trace-Id` headers
- AND `{ data: normalizedOrder }` is returned to the route for a 200 response

#### Scenario: Strapi failure — 502 byte-identical
- GIVEN Strapi returns non-`ok` or the JSON body fails to parse
- WHEN the service handles the response
- THEN it returns a 502 `NextResponse` with body `"No pudimos cargar tu pedido. Inténtalo de nuevo."` and the `X-Trace-Id` header

#### Scenario: Non-owner or missing order — 404 (IDOR, no disclosure)
- GIVEN the resolved order's owner id differs from `user.id`, or no order matches `orderId`
- WHEN the service resolves ownership
- THEN it returns a 404 `NextResponse` with `"Pedido no encontrado"` and the `X-Trace-Id` header
- AND it MUST NOT return 403 — preserves `secure-route-authorization` non-disclosure intent

#### Scenario: Trace header on every call and every error
- GIVEN any invocation
- WHEN it issues its Strapi fetch or builds an error `NextResponse`
- THEN the `X-Trace-Id` header equals the supplied `traceId` on the fetch and on every 404/502 response

### Requirement: Order Detail Route Thin Delivery Layer

`GET /api/orders/[orderId]` MUST contain only `getTraceId`, `requireUser`, `await params`, delegation to `getOrderByIdService`, `if ('error' in result) return result.error`, a success `NextResponse.json(result.data, { headers: { 'X-Trace-Id': traceId } })`, and a top-level `500` catch. The route MUST NOT contain `fetch`, URL construction, `normalizeStrapiOrder`, ownership checks, or `CANCELLABLE_STATUSES`. Status codes, Spanish strings, and body shapes MUST be byte-identical to the pre-refactor route.

#### Scenario: Route delegates success and errors unchanged
- GIVEN the slimmed route receives a request
- WHEN it delegates to `getOrderByIdService`
- THEN 200/401/404/502 responses match the pre-refactor route byte-for-byte
- AND the route source contains zero `fetch`/`normalizeStrapiOrder` references

### Requirement: [orderId] Route Test Re-anchoring

The existing 878-line `src/app/api/orders/[orderId]/__tests__/route.test.ts` suite MUST be re-anchored to mock `getOrderByIdService` instead of `global.fetch`. All original status-code, Spanish-string, and body-shape assertions MUST be preserved. Assertions that `global.fetch` was called with the Strapi URL and `X-Trace-Id`/`Authorization` headers MUST migrate into `getOrderByIdService` unit tests (mocking `global.fetch`).

#### Scenario: Route suite mocks the service
- GIVEN the re-anchored `[orderId]` suite
- WHEN it runs under `npx vitest run --maxWorkers=2`
- THEN it mocks `getOrderByIdService` and asserts byte-identical 200/401/404/502 responses
- AND no test in the route suite mocks `global.fetch` directly

#### Scenario: Service test owns fetch-with-trace assertions
- GIVEN a new `getOrderByIdService` unit test
- WHEN the service issues its fetch
- THEN it asserts `global.fetch` received the Strapi URL plus `Authorization` and `X-Trace-Id` headers