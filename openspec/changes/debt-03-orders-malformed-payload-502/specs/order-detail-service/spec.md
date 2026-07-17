# Delta for Order Detail Service

> DEBT-03 — fix **RES-001**. Amends `openspec/specs/order-detail-service/spec.md` requirement `getOrderByIdService Contract`. The `Strapi failure — 502 byte-identical` scenario is **SPLIT**: (a) network / non-ok / JSON-parse failures stay byte-identical 502 (KEPT); (b) malformed-but-HTTP-200 payloads (e.g. `{ data: [null] }`) that today leak as a route-level 500 `'Ocurrió un error inesperado. Inténtalo de nuevo.'` now return a **service-level 502** with the EXISTING verbatim Spanish string. `api-traceability` + `secure-route-authorization` stay byte-identical.
>
> **Non-goals (MUST NOT creep in):** making `normalizeStrapiOrder` null-safe (masks as misleading 404, violates RES-001); touching network / non-ok / JSON-parse 502 paths (byte-identical); a dedicated `normalizeStrapiOrder.test.ts` (deferred); DEBT-04; any INF/SEO/SL ticket; the legacy `requestCancellation.ts` client wrapper.

## MODIFIED Requirements

### Requirement: getOrderByIdService Contract

The feature layer MUST expose `getOrderByIdService({ user, jwtToken, traceId, orderId }): Promise<{ data: NormalizedOrder } | { error: NextResponse }>` in `src/features/orders/services/getOrderByIdService.ts`, exported from `src/features/orders/index.ts`. The service MUST own Strapi URL construction, the single `fetch` with `Authorization`, `Content-Type`, and `X-Trace-Id` headers, `attributes` unwrapping via `normalizeStrapiOrder`, IDOR ownership check, not-found handling, and friendly error mapping. The service MUST NOT depend on the route layer. The post-JSON-parse block — `payload.data ?? []`, `.find((o) => normalizeStrapiOrder(o).orderId === orderId)`, `normalizeStrapiOrder(matchingOrder)`, the IDOR check, and the return — MUST run inside a single try/catch that maps ANY thrown error (incl. a malformed-but-200 Strapi payload like `{ data: [null] }` or `{ data: [undefined] }`) to the SAME service-level 502 used by the fetch / non-ok / JSON-parse failure paths. The service MUST NOT make `normalizeStrapiOrder` null-safe; the catch MUST fire BEFORE any route-level 500.
(Previously: the `Strapi failure — 502 byte-identical` scenario asserted every 502 was byte-identical to the pre-refactor route. Malformed-but-200 payloads were NOT covered — they leaked to the route's top-level 500 `'Ocurrió un error inesperado. Inténtalo de nuevo.'`. Supersedes the byte-identical claim for the malformed-payload scenario ONLY.)

#### Scenario: Owner fetches own order — 200 (KEPT)
- GIVEN an authenticated owner requests their own `orderId` with valid `jwtToken` and `traceId`
- WHEN `getOrderByIdService` runs
- THEN Strapi is fetched once with `Authorization`, `Content-Type`, `X-Trace-Id`
- AND `{ data: normalizedOrder }` is returned for a 200 response

#### Scenario: Network / non-ok / JSON-parse failure — 502 byte-identical (KEPT)
- GIVEN Strapi `fetch` rejects, returns non-`ok`, OR JSON body fails to parse
- WHEN the service handles it
- THEN it returns 502 `"No pudimos cargar tu pedido. Inténtalo de nuevo."` + `X-Trace-Id`, byte-identical to before

#### Scenario: Malformed-but-200 payload — 502 (NEW, MODIFIED)
- GIVEN Strapi returns `ok:true` with a malformed JSON body such as `{ data: [null] }` or `{ data: [undefined] }`
- WHEN the service runs the `.find` → `normalizeStrapiOrder` block
- THEN it returns 502 `"No pudimos cargar tu pedido. Inténtalo de nuevo."` + `X-Trace-Id`
- AND MUST NOT leak a route 500 `"Ocurrió un error inesperado. Inténtalo de nuevo."`

#### Scenario: Edge-case ordering — malformed first => 502 not 404 (NEW)
- GIVEN Strapi returns `ok:true` with `payload.data = [null, <valid-other-order>]`
- WHEN `orders.find((o) => normalizeStrapiOrder(o).orderId === orderId)` runs
- THEN `normalizeStrapiOrder(null)` throws INSIDE `.find` BEFORE `matchingOrder` is assigned
- AND the catch fires on the first malformed candidate → 502 (NOT 404) + `"No pudimos cargar tu pedido. Inténtalo de nuevo."` + `X-Trace-Id`

#### Scenario: Non-owner or missing order — 404 (IDOR, no disclosure) (KEPT)
- GIVEN the resolved order's owner id differs from `user.id`, or no order matches `orderId`
- WHEN the service resolves ownership
- THEN it returns 404 `"Pedido no encontrado"` + `X-Trace-Id`
- AND MUST NOT return 403 — preserves `secure-route-authorization` non-disclosure intent

#### Scenario: Trace header on every call and every error (KEPT)
- GIVEN any invocation
- WHEN it issues its Strapi fetch or builds an error `NextResponse`
- THEN `X-Trace-Id` equals `traceId` on the fetch and on every 404/502 response, including the new 502

## ADDED Requirements

### Requirement: Malformed-Payload 502 Test Coverage (Strict TDD)

`src/features/orders/services/__tests__/getOrderByIdService.test.ts` MUST add EXACTLY ONE new "malformed-but-200 → 502" scenario using `mockResolvedValueOnce({ ok:true, json: async () => ({ data: [null] }) })`, asserting `status === 502`, `body.error === "No pudimos cargar tu pedido. Inténtalo de nuevo."`, and `X-Trace-Id`. The same scenario MUST include (or be co-located with) the `[null, <valid-other>]` ordering edge-case assertion. The three EXISTING 502 scenarios (network, non-ok, json-parse) MUST remain present and byte-identical. The service MUST NOT gain a dedicated `normalizeStrapiOrder.test.ts` in this change.

#### Scenario: One new scenario, three kept byte-identical
- GIVEN the suite runs under `npx vitest run --maxWorkers=2`
- WHEN the malformed-200 scenario is added
- THEN exactly one new 502 case runs and passes
- AND the three existing 502 cases stay byte-identical and pass
- AND the `[null, <valid-other>]` edge-case asserts 502 (NOT 404)