# Delta for Order Cancellation Service

> DEBT-03 — fix **RES-001**. Amends `openspec/specs/order-cancellation-service/spec.md` requirement `requestCancellationService Contract`. The `Strapi failure — 502 byte-identical` scenario is **SPLIT**: (a) network / non-ok / JSON-parse failures stay byte-identical 502 (KEPT); (b) malformed-but-HTTP-200 payloads (e.g. `{ data: [null] }`) that today leak as a route-level 500 `'Ocurrió un error inesperado. Inténtalo de nuevo.'` now return a **service-level 502** with the EXISTING verbatim Spanish string. Follows the SAME MODIFIED precedent as the existing `Cancellation Reason Length Policy` block. `requestCancellationService` (server, Strapi-direct) is DISTINCT from the client wrapper in `requestCancellation.ts` — untouched. `api-traceability` + `secure-route-authorization` stay byte-identical EXCEPT this malformed-payload case.
>
> **Non-goals (MUST NOT creep in):** making `normalizeStrapiOrder` null-safe (masks as misleading 404, violates RES-001); touching network / non-ok / JSON-parse 502 paths (byte-identical); a dedicated `normalizeStrapiOrder.test.ts` (deferred); DEBT-04; any INF/SEO/SL ticket; the legacy `requestCancellation.ts` client wrapper; the PUT-leg 502 paths.

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Malformed-Payload 502 Test Coverage (Strict TDD)

`src/features/orders/services/__tests__/requestCancellationService.test.ts` MUST add EXACTLY ONE new "malformed-but-200 → 502" scenario using `mockResolvedValueOnce({ ok:true, json: async () => ({ data: [null] }) })` for the GET lookup, asserting `status === 502`, `body.error === "No pudimos enviar la solicitud. Inténtalo de nuevo."`, and `X-Trace-Id`. The same scenario MUST include (or be co-located with) the `[null, <valid-other>]` ordering edge-case assertion. The EXISTING 502 scenarios (network, non-ok, json-parse on GET and PUT legs) MUST remain present and byte-identical. The service MUST NOT gain a dedicated `normalizeStrapiOrder.test.ts` in this change.

#### Scenario: One new scenario, existing kept byte-identical
- GIVEN the suite runs under `npx vitest run --maxWorkers=2`
- WHEN the malformed-200 scenario is added
- THEN exactly one new GET-leg 502 case runs and passes
- AND existing 502 cases (network, non-ok, json-parse on GET and PUT) stay byte-identical and pass
- AND the `[null, <valid-other>]` edge-case asserts 502 (NOT 404)