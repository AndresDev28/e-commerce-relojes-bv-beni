# Proposal: Orders Services Refactor

## Intent

GGA flagged two routes for inline Strapi-direct business logic (fetch, URL, X-Trace-Id, attributes, IDOR, error mapping). Screaming Architecture wants this in `src/features/orders/services/`. Sibling routes already follow via `getOrdersService` / `createOrderService`. Surgical refactor: extract two new services mirroring the pattern. Responses stay byte-identical.

## Scope

In scope:
- NEW `getOrderByIdService.ts` — lookup + ownership + 404-on-non-owner + mapping
- NEW `requestCancellationService.ts` — two-call flow + `CANCELLABLE_STATUSES` + checks + mapping
- SLIM both routes to transport: `getTraceId` + `requireUser` + parsing + delegate + 500 catch
- EXPORT both from `src/features/orders/index.ts`
- Re-anchor 878-line `[orderId]` suite (mock service); add first tests for the cancellation route and both services
- Preserve byte-identical statuses, Spanish strings, body shapes, X-Trace-Id
- Preserve 404-not-403 IDOR per `secure-route-authorization`

Out of scope: new endpoints/features; any contract change; renaming `requestOrderCancellation`; tests for the existing services; other-feature migrations.

## Capabilities

**New**: None. **Modified**: None. Pure internal refactor; `api-traceability` and `secure-route-authorization` preserved byte-identically.

## Approach

Mirror siblings. Service signature: `(params): Promise<{ data } | { error: NextResponse }>`. Service owns fetch + URL + headers + unwrap + 400/403/404/502 mapping; route owns transport. Strict TDD: service tests first (mocked `global.fetch`), then route re-anchor, then barrel. Verify with `npx vitest run --maxWorkers=2`.

## Affected Areas

- **Modified** `src/app/api/orders/[orderId]/route.ts`
- **Modified** `src/app/api/orders/[orderId]/request-cancellation/route.ts`
- **New** `src/features/orders/services/getOrderByIdService.ts`
- **New** `src/features/orders/services/requestCancellationService.ts`
- **Modified** `src/features/orders/index.ts`
- **Modified** `src/app/api/orders/[orderId]/__tests__/route.test.ts`

## Risks + Mitigations

- **IDOR drifts** (Med) — exact Spanish strings + statuses in service; route tests assert byte-equality.
- **X-Trace-Id dropped** (Med) — assert header on every fetch + every NextResponse.
- **Re-anchor drift** (Med) — test-by-test, run `--maxWorkers=2` per chunk, preserve all original assertions.
- **Naming collision** (Low) — distinct files/exports; client wrapper unchanged.
- **`CANCELLABLE_STATUSES` callers** (Low) — CodeGraph confirms none.

## Rollback

`git revert <merge-sha>` restores inline-fetch. No data/schema/env changes. The 878-line suite asserts pre-refactor behavior, so revert restores green.

## Dependencies

Strapi backend is SSOT; no backend changes. If the cancellable-status list changes, error messages must be re-checked.

## Success Criteria

- [ ] Services mirror sibling contract
- [ ] Both routes <40 lines, zero fetch/normalize/CANCELLABLE_STATUSES
- [ ] `npm run build` + `npx vitest run --maxWorkers=2` green (878+ existing + new)
- [ ] Manual smoke: GET + POST byte-identical for owner / non-owner (404) / missing (404) / bad-JWT (401) / 502
- [ ] X-Trace-Id asserted on every fetch + every error response
- [ ] GGA no longer flags either route

## Clarifying Questions (product)

1. **Reason policy** — code silently truncates `reason.substring(0,1000)`. Keep truncation or add explicit 400 validation?
2. **Idempotency on already-cancellation_requested** — current check rejects with 400. After a double-click, want 400 or 200?
