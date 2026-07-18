# Tasks: Orders Services Refactor

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1460 (Slice A ~725 | Slice B ~685) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR-1 Slice A -> PR-2 Slice B (each slice > 400 -> size:exception or finer sub-split) |
| Delivery strategy | ask-always |
| Chain strategy | pending (user team choice: stacked-to-main / feature-branch-chain / size:exception) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| A1 | getOrderByIdService + RED tests (route untouched) | PR-1 | `npx vitest run --maxWorkers=2 src/features/orders/services/__tests__/getOrderByIdService.test.ts` | N/A pure unit | drop service + test + barrel export |
| A2 | Slim [orderId] route + re-anchor 878-line suite (behavior byte-identical) | PR-1 | `npx vitest run --maxWorkers=2 src/app/api/orders/[orderId]/__tests__/route.test.ts` | N/A refactor, byte-identical | git revert route.ts + route.test.ts |
| B1 | requestCancellationService + RED tests + CANCELLABLE_STATUSES relocate | PR-2 | `npx vitest run --maxWorkers=2 src/features/orders/services/__tests__/requestCancellationService.test.ts` | N/A pure unit | drop service + test + barrel export |
| B2 | Cancellation route slim + GREENFIELD test + NEW 500-char cap (only external delta) | PR-2 | `npx vitest run --maxWorkers=2 src/app/api/orders/[orderId]/request-cancellation/__tests__/route.test.ts` | staging: POST a cancellable order with >500 char reason -> expect 400 Spanish message | git revert request-cancellation/route.ts + its test |

## Phase 1: Slice A - order-detail-service (getOrderById)

- [x] A1.1 RED - create `src/features/orders/services/__tests__/getOrderByIdService.test.ts`: mock `global.fetch`; assert single fetch with Strapi URL + `Authorization`/`Content-Type`/`X-Trace-Id`; byte-identical `"No pudimos cargar tu pedido. Inténtalo de nuevo."` (502) + `"Pedido no encontrado"` (404); IDOR non-owner 404 (never 403); 200 returns `normalizeStrapiOrder`-shaped data; X-Trace-Id on every response. RED (file missing).
- [x] A1.2 GREEN - create `src/features/orders/services/getOrderByIdService.ts` mirroring `getOrdersService`; contract `({user,jwtToken,traceId,orderId}) => Promise<{data}|{error:NextResponse}>`; add export to `src/features/orders/index.ts`. GREEN. [orderId] route untouched.
- [x] A2 REFACTOR - slim `src/app/api/orders/[orderId]/route.ts` to transport-only (~25 lines): `getTraceId` -> `requireUser` -> await params -> delegate -> `if('error' in result) return result.error` -> success+X-Trace-Id -> 500 catch. Re-anchor `src/app/api/orders/[orderId]/__tests__/route.test.ts` (878 lines): mock `getOrderByIdService` not `global.fetch`; MIGRATE fetch-with-X-Trace-Id/Authorization assertions into A1.1 service test; PRESERVE every original status/string/shape assertion. Migrate test batches one chunk at a time with vitest per chunk. GREEN.

## Phase 2: Slice B - order-cancellation-service (requestCancellation)

- [x] B1.1 RED - create `src/features/orders/services/__tests__/requestCancellationService.test.ts`: mock `global.fetch`; assert BOTH calls (GET lookup + PUT update) carry `Authorization`/`Content-Type`/`X-Trace-Id` (same traceId); 200 `{data:{success:true, message:"Solicitud de cancelación enviada correctamente"}}`; 502 `"No pudimos enviar la solicitud. Inténtalo de nuevo."` either call; 404 `"Pedido no encontrado"` (IDOR no 403); 400 `"No se puede cancelar un pedido en estado: {status}"` non-cancellable; 400 double-click on `cancellation_requested` KEPT (NOT 200). Import `CANCELLABLE_STATUSES=['pending','paid','processing']` from service. RED.
- [x] B1.2 GREEN - create `src/features/orders/services/requestCancellationService.ts` per design Two-Call Sequence; export `CANCELLABLE_STATUSES`; add exports to `src/features/orders/index.ts`. Cancellation route still inline. GREEN.
- [x] B2.1 RED - create `src/app/api/orders/[orderId]/request-cancellation/__tests__/route.test.ts` (GREENFIELD): mock `requestCancellationService`. Cover 200; 400 missing reason `"Indícanos el motivo de la cancelación."` (KEPT); 400 invalid body `"Solicitud inválida."`; 400 reason-too-long NEW (>500 -> 400 verbatim Spanish 2-sentence message, NO PUT); 500 at-boundary accepted/stored; 400 non-cancellable KEPT; 404 IDOR KEPT; 502; X-Trace-Id on responses. RED.
- [x] B2.2 GREEN - slim `src/app/api/orders/[orderId]/request-cancellation/route.ts` to transport+validation (~30 lines): validate reason-present + reason-cap-500 (NEW Spanish message) BEFORE delegating to service; DELETE inline `CANCELLABLE_STATUSES` ATOMICALLY (now from service); `if('error' in result) return result.error` -> success -> 500 catch. GREEN. Only externally-observable behavior change in the whole refactor.

## Phase 3: Verification

- [x] V1 - `npx vitest run --maxWorkers=2` full suite green; grep route files assert ZERO references to `fetch`, `normalizeStrapiOrder`, `CANCELLABLE_STATUSES` (cancellation route); routes contain only transport + validation (cancellation). ✅ 213/213 orders tests pass, tsc clean, route purity confirmed (see verify-report #1233).
- [x] V2 - confirm byte-identity of 200/401/404/502 statuses + all Spanish strings + response shapes for BOTH routes match pre-refactor EXCEPT the NEW 500-char reason cap. ✅ Byte-identity confirmed (see verify-report #1233 V2 table).