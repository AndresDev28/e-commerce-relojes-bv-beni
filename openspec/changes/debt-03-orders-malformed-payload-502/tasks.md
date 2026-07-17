# Tasks: DEBT-03 — Orders malformed-but-200 → service 502

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~90 (≤20 service ×2, ~70 test additions ×2) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-always |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Both services catch malformed-200 → 502 | PR 1 | `npx vitest run --maxWorkers=2 src/features/orders/services/` | `npx tsc --noEmit` | revert try/catch in both services + 2 test scenarios |

## Phase 1: Domain A — order-detail-service (RED)

- [x] A1.1 RED — Add "malformed-but-200 → 502" scenario to `src/features/orders/services/__tests__/getOrderByIdService.test.ts`: mock `{ ok:true, json: async () => ({ data: [null] }) }`; assert `status===502`, `body.error==='No pudimos cargar tu pedido. Inténtalo de nuevo.'`, `X-Trace-Id==='trace-xyz'`. Co-locate `[null, <valid-other-order>]` edge-case asserting 502 (NOT 404). Run `npx vitest run --maxWorkers=2 src/features/orders/services/__tests__/getOrderByIdService.test.ts` → expect FAIL (today leaks route 500).

## Phase 2: Domain A — order-detail-service (GREEN)

- [x] A2.1 GREEN — In `getOrderByIdService.ts`, wrap L66–93 (`const orders = payload.data ?? []` through `return { data: normalized }`) in ONE `try { … } catch (err: unknown) { return { error: NextResponse.json({ error: 'No pudimos cargar tu pedido. Inténtalo de nuevo.' }, { status: 502, headers: { 'X-Trace-Id': traceId } }) } }`. Catch starts AFTER existing json-parse catch (L54-64); do NOT wrap `await response.json()`. Body only returns; no logging, no helper, no success-swallow. Verify A1.1 now PASSES; existing 3×502 scenarios stay byte-identical.

## Phase 3: Domain B — order-cancellation-service (RED)

- [x] B1.1 RED — Add "malformed-but-200 → 502" scenario to `src/features/orders/services/__tests__/requestCancellationService.test.ts`: mock GET lookup `{ ok:true, json: async () => ({ data: [null] }) }`; assert `status===502`, `body.error==='No pudimos enviar la solicitud. Inténtalo de nuevo.'`, `X-Trace-Id==='trace-xyz'`. Co-locate `[null, <valid-other-order>]` edge-case asserting 502 (NOT 404). Run → expect FAIL.

## Phase 4: Domain B — order-cancellation-service (GREEN)

- [x] B1.2 GREEN — In `requestCancellationService.ts`, wrap L74–127 (`const orders = payload.data ?? []` through the cancellable-status `return 400` block, ending BEFORE the PUT `fetch` at L132) in ONE `try { … } catch (err: unknown) { return { error: NextResponse.json({ error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' }, { status: 502, headers: { 'X-Trace-Id': traceId } }) } }`. Catch starts AFTER existing GET json-parse catch (L62-72); ends BEFORE L132 PUT. Do NOT swallow PUT-leg errors; PUT's own 502 catches (L133-153, L155-162) stay byte-identical. Verify B1.1 PASSES; existing GET+PUT 502 scenarios stay byte-identical.

## Phase 5: Verify

- [x] V1 — Run `npx vitest run --maxWorkers=2 src/features/orders/services/` → all green.
- [x] V2 — Run `npx tsc --noEmit` → no new TS errors.
- [x] V3 — Assert the 3 existing 502 scenarios per suite (network, non-ok, json-parse) remain byte-identical and pass; assert new 502 carries exact Spanish string + `X-Trace-Id`; assert `[null,<valid>]` edge asserts 502 not 404. Do NOT make `normalizeStrapiOrder` null-safe (out of scope).