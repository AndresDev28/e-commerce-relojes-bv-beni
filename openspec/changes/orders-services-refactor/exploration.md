# Exploration: orders-services-refactor

> Extract Strapi business logic out of the `orders` route handlers into dedicated feature services (`getOrderByIdService`, `requestCancellationService`), per Screaming Architecture.

## Current State

The `orders` feature exposes 3 Next.js route handlers under `src/app/api/orders/`. Two of them (`GET /api/orders` and `POST /api/orders`) already follow the project's service contract — they are THIN delivery layers that delegate to `getOrdersService` / `createOrderService` from `src/features/orders/services/`. Those services own the Strapi `fetch`, URL construction, `X-Trace-Id` header propagation, Strapi v4 `attributes` unwrapping, and friendly error mapping.

The third and fourth routes — `GET /api/orders/[orderId]` and `POST /api/orders/[orderId]/request-cancellation` — VIOLATE this convention. They contain inline Strapi-direct business logic: building the Strapi query URL, calling `fetch()` with auth + trace headers, unwrapping the `attributes` envelope via `normalizeStrapiOrder`, performing ownership/IDOR checks, and mapping Strapi failures to friendly Spanish responses. GGA correctly flagged this: that logic belongs in `getOrderByIdService` and `requestCancellationService` respectively, matching the established `getOrdersService` / `createOrderService` pattern.

A naming/colocation subtlety exists: `src/features/orders/services/requestCancellation.ts` ALREADY exists, but it is a CLIENT-side wrapper (`requestOrderCancellation`) that calls the internal Next.js API route (`/api/orders/${orderId}/request-cancellation`), NOT Strapi. The proposed `requestCancellationService` is a SERVER-side service that calls Strapi directly. These are different layers and must not collide.

## Affected Areas

- `src/app/api/orders/[orderId]/route.ts` — GET handler holds inline Strapi fetch + normalize + ownership + error mapping. Target: extract `getOrderByIdService`.
- `src/app/api/orders/[orderId]/request-cancellation/route.ts` — POST handler holds TWO Strapi fetches (lookup + PUT update), normalize, ownership, cancellable-status validation, error mapping. Target: extract `requestCancellationService`.
- `src/features/orders/services/getOrderByIdService.ts` — NEW service to create (does not exist).
- `src/features/orders/services/requestCancellationService.ts` — NEW server service to create (does not exist; distinct from client-side `requestCancellation.ts`).
- `src/features/orders/index.ts` — barrel exports; must export both new services.
- `src/app/api/orders/[orderId]/__tests__/route.test.ts` — 878-line test suite that currently mocks `global.fetch` directly because the route does the fetch inline. Test strategy must shift to mock the service.
- No tests exist for the `request-cancellation` route or for ANY orders service (getOrdersService, createOrderService, requestOrderCancellation, normalizeStrapiOrder).

## Route-by-Route Logic Inventory

### 1. `src/app/api/orders/[orderId]/route.ts` → `getOrderByIdService`

Current inline business logic to move into the service:
- Build Strapi lookup URL: `${API_URL}/api/orders?filters[orderId][$eq]=${orderId}&populate=*`
- `fetch()` with `{ Authorization: Bearer jwtToken, 'X-Trace-Id': traceId, Content-Type }`
- `response.ok` → map to 502 friendly "No pudimos cargar tu pedido. Inténtalo de nuevo."
- `response.json()` parse failure → 502
- Unwrap `payload.data` array, `normalizeStrapiOrder(o)`, find where `.orderId === orderId`
- Ownership (IDOR) check: `orderOwner.id !== user.id` → 404 "Pedido no encontrado" (deliberately does NOT reveal existence)
- Not found → 404 "Pedido no encontrado"
- Success → `{ data: normalized }`

Stays in route: `getTraceId`, `requireUser`, `await params`, `if ('error' in result) return result.error`, success `NextResponse.json(result.data, { headers: { 'X-Trace-Id': traceId } })`, top-level 500 catch.

Proposed signature (matches `getOrdersService`):
```ts
getOrderByIdService(params: {
  user: AuthUser; jwtToken: string; traceId: string; orderId: string
}): Promise<{ data: NormalizedOrder } | { error: NextResponse }>
```

### 2. `src/app/api/orders/[orderId]/request-cancellation/route.ts` → `requestCancellationService`

Current inline business logic to move into the service:
- Build Strapi lookup URL `${API_URL}/api/orders?filters[orderId][$eq]=${orderId}&populate=*`
- First `fetch()` (GET lookup), auth + trace headers, error → 502 "No pudimos enviar la solicitud. Inténtalo de nuevo."
- Unwrap `payload.data?.[0]`, `normalizeStrapiOrder`, ownership check (`orderId !== param || user mismatch`) → 404 "Pedido no encontrado"
- Cancellable-status validation: `CANCELLABLE_STATUSES = ['pending','paid','processing']`; non-cancellable → 400 "No se puede cancelar un pedido en estado: {status}"
- Build update: `documentId ?? String(id)`, second `fetch()` PUT to `${API_URL}/api/orders/${documentId}` with body `{ orderStatus: 'cancellation_requested', cancellationReason: reason.substring(0,1000), cancellationDate, statusChangeNote }`
- PUT failure → 502
- Success → `{ success: true, message }`

Stays in route: `getTraceId`, `requireUser`, `await params`, body parse, `reason` validation (400 "Indícanos el motivo..."), delegate to service, `if ('error' in result) return result.error`, success response, top-level 500 catch.

`CANCELLABLE_STATUSES` constant is business logic — it should live with the service (or the feature) and be exported, not in the route.

Proposed signature:
```ts
requestCancellationService(params: {
  user: AuthUser; jwtToken: string; traceId: string; orderId: string; reason: string
}): Promise<{ data: { success: true; message: string } } | { error: NextResponse }>
```

## Existing Services (src/features/orders/services/)

| File | Export | Layer | Status |
|------|--------|-------|--------|
| `getOrdersService.ts` | `getOrdersService` | server (Strapi) | ✅ pattern reference |
| `createOrderService.ts` | `createOrderService` | server (Strapi) | ✅ pattern reference |
| `normalizeStrapiOrder.ts` | `normalizeStrapiOrder`, `NormalizedOrder` | shared helper | ✅ reused by both new services |
| `requestCancellation.ts` | `requestOrderCancellation` | CLIENT wrapper → internal API route | ⚠️ name collision risk; do NOT rename/move; the new service is a separate concern at a different layer |

`index.ts` barrel currently exports: `getOrdersService`, `createOrderService`, `requestOrderCancellation`, `normalizeStrapiOrder`, `NormalizedOrder`. Both new services MUST be added here.

## Test Baseline

- `src/app/api/orders/__tests__/route.test.ts` — covers `GET/POST /api/orders` (the ALREADY-refactored routes).
- `src/app/api/orders/[orderId]/__tests__/route.test.ts` — 878 lines, 10+ tests. **Mocks `global.fetch` directly** because the route does the Strapi fetch inline. Covers: 401 (no/invalid token), 404 (not found / not owner / attack patterns / no info disclosure), 200 (owner success, structure), 502 (Strapi failure). Several tests assert `global.fetch` was called with `/api/users/me` + `X-Trace-Id`/`Authorization` headers — those assertions belong in SERVICE tests after extraction, not route tests.
- `src/features/orders/components/__tests__/RequestCancellation.integration.test.tsx` + `CancelOrderModal.test.tsx` — client-side; exercise `requestOrderCancellation` client wrapper. Unaffected by the SERVER service extraction, but verify the contract the internal route exposes stays identical.
- **No tests** for: `request-cancellation` route, `getOrdersService`, `createOrderService`, `requestOrderCancellation`, `normalizeStrapiOrder`.

Implication: this refactor is partially covered. The `[orderId]` route has heavy coverage but coupled to the inline-fetch implementation; after extraction those tests must be re-anchored (mock the service, not fetch). The `request-cancellation` route is a GREENFIELD test target — strict TDD (per openspec config `tdd: true`) means service tests come first.

## Convention Reference (cross-feature)

Service contract, consistent across `getOrdersService`, `createOrderService`, `createPaymentIntentService` (checkout):
- One service per file, named `verbNounService.ts`.
- Signature: `(params: { jwtToken/user, traceId, input }): Promise<{ data } | { error: NextResponse }>`.
- Service owns: Strapi/Stripe `fetch`, URL building, `X-Trace-Id` propagation on every request, Strapi v4 `attributes` unwrapping, and error mapping to stable statuses (400/403/404/502/500) with friendly Spanish messages + `X-Trace-Id` header in error responses.
- Route owns ONLY: `getTraceId`, `requireUser`, request/params parsing, input validation, `if ('error' in result) return result.error`, success response with trace-id header, top-level try/catch → 500.
- All services exported from feature `index.ts` barrel.

The two flagged routes are the ONLY order routes that break this contract. The refactor target is therefore surgical and well-precedented.

## Approaches

1. **Mirror-the-pattern (recommended)** — Create `getOrderByIdService.ts` and `requestCancellationService.ts` exactly mirroring `getOrdersService`/`createOrderService` signatures and return shapes. Rewrite the two flagged routes to thin delivery layers. Re-anchor `[orderId]` route tests to mock the service; add new service tests (mock `global.fetch`) and a `request-cancellation` route test.
   - Pros:最快 path to convention compliance; precedent already exists in the same feature; minimal API surface change (responses stay byte-identical).
   - Cons: re-anchoring the 878-line `[orderId]` test suite is the bulk of the effort; risk of behavior drift if normalization/ownership logic is subtly altered.
   - Effort: Medium.

2. **Thin service + keep normalize in route** — Move only the `fetch` calls into services, keep ownership/normalize/error-mapping in routes.
   - Pros: smaller diff; existing tests need fewer changes.
   - Cons: leaves business logic in routes → GGA still flags the routes; does NOT satisfy the refactor intent.
   - Effort: Low — but rejected; it does not achieve the goal.

## Recommendation

Approach 1. The pattern is already established inside the SAME feature by `getOrdersService` and `createOrderService`, so there is zero ambiguity about the target shape. `normalizeStrapiOrder` is already a shared helper — reuse it from both new services. Preserve byte-identical HTTP responses (status codes, Spanish error strings, `X-Trace-Id` headers, body shape) so the client-side `requestOrderCancellation` wrapper and `OrderDetail` UI are unaffected. Move `CANCELLABLE_STATUSES` into the service/feature layer.

## Risks

- **Traceability (X-Trace-Id)**: each extracted service MUST forward `traceId` into every Strapi `fetch` header AND into every error `NextResponse` header. Dropping the header on either side breaks the global traceability contract. Verify with assertions in service tests.
- **Error mapping / behavior preservation**: the `[orderId]` route deliberately returns 404 (not 403) for non-owner to prevent information disclosure — confirmed by the security test suite. The service MUST preserve this exact behavior. The `request-cancellation` route's two-step fetch + status-validation order must be preserved.
- **Test re-anchoring**: the 878-line `[orderId]` suite mocks `global.fetch`; after extraction those fetch-mock assertions migrate to the SERVICE test, and the route test mocks `getOrderByIdService` instead. Risk of leaving stale assertions. Strict TDD (`tdd: true`) applies.
- **Naming collision**: `requestCancellation.ts` (client) vs proposed `requestCancellationService.ts` (server) — different layers, similar names. Keep both, distinct file/exports; the client wrapper calls the internal route which calls the server service.
- **`CANCELLABLE_STATUSES` relocation**: moving it out of the route is correct, but any other importer must be checked (CodeGraph shows no other callers — safe).
- **No service tests today**: `getOrdersService`/`createOrderService` themselves are untested; this refactor is an opportunity to add service-level coverage without expanding scope too far.

## Ready for Proposal

Yes. The orchestrator should tell the user: the refactor target is confirmed and surgical (2 routes → 2 new services mirroring 2 existing siblings), responses stay byte-identical, the `[orderId]` test suite needs re-anchoring, and the `request-cancellation` route gains its first tests. Proceed to `sdd-propose`.