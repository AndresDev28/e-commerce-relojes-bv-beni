# Design: Orders Services Refactor

> Extends Screaming Architecture: two flagged route handlers shed Strapi business logic into two new server services that mirror `getOrdersService` / `createOrderService`. Externally observable behavior is byte-identical EXCEPT the new 500-char `reason` cap on the cancellation route (deliberate, see spec).

## Technical Approach

Mirror the sibling pattern. Each service owns `fetch` + URL + headers (`Authorization`, `Content-Type`, `X-Trace-Id`) + `attributes` unwrap via `normalizeStrapiOrder` + IDOR + friendly error mapping. Each route is reduced to transport only: `getTraceId` + `requireUser` + parse + delegate + `if ('error' in result) return result.error` + success + top-level 500 catch. Strict TDD per `openspec/config.yaml:tdd: true` — service tests first (mock `global.fetch`), then cancellation route test, then re-anchor the 878-line suite, then barrel.

## Architecture Decisions

| Decision | Choice |
|----------|--------|
| Service contract | `(params): Promise<{data} \| {error: NextResponse}>` (mirrors siblings) |
| `CANCELLABLE_STATUSES` location | Exported const from `requestCancellationService.ts` (grep: zero other callers) |
| `requestCancellationService` vs client `requestCancellation.ts` | Keep both, distinct files (server/Strapi vs client/internal route) |
| Reason policy | Hard 500-char cap + 400 (NEW; locked #1224; spec marks Modified) |
| Double-click on `cancellation_requested` | 400 (KEPT; locked #1224) |
| 500-char validation site | Route, before calling service (keeps service contract pure) |
| Re-anchor order | Service tests → cancellation route test → re-anchor 878-line suite → barrel |

## Data Flow — Two Strapi Calls (Cancellation)

```
route: getTraceId → requireUser → await params
      → body parse (fail → 400 'Solicitud inválida.')
      → reason missing/empty → 400 'Indícanos el motivo de la cancelación.'
      → reason.length > 500  → 400 NEW friendly Spanish (below)
      → requestCancellationService({user, jwtToken, traceId, orderId, reason})
            → CALL 1: GET  /api/orders?filters[orderId][$eq]=…&populate=*   (Auth, CT, X-Trace-Id)
                !ok / parse fail → 502 'No pudimos enviar la solicitud. Inténtalo de nuevo.'
                payload.data?.[0] missing → 404 'Pedido no encontrado'
                normalize → orderId !== param OR user mismatch → 404 'Pedido no encontrado'
                orderStatus NOT IN CANCELLABLE_STATUSES → 400 'No se puede cancelar un pedido en estado: {status}'
            → CALL 2: PUT  /api/orders/${documentId ?? String(id)}   (same headers)
                body: { data: { orderStatus:'cancellation_requested',
                                cancellationReason: reason,            // caller-capped ≤500
                                cancellationDate: ISO(now),
                                statusChangeNote: 'El cliente ha solicitado la cancelación del pedido. Motivo: ' + reason } }
                !ok / parse fail → 502 'No pudimos enviar la solicitud. Inténtalo de nuevo.'
            → {data: {success: true, message: 'Solicitud de cancelación enviada correctamente'}}
route: if ('error' in result) return result.error
      → NextResponse.json({success:true, message}, {headers:{'X-Trace-Id': traceId}})
```

GET `/api/orders/[orderId]` is the same pattern minus reason validation, with a single GET call, 502 message `No pudimos cargar tu pedido. Inténtalo de nuevo.`, and success body `{data: normalizedOrder}`.

## File Changes

| File | Action |
|------|--------|
| `src/features/orders/services/getOrderByIdService.ts` | Create |
| `src/features/orders/services/requestCancellationService.ts` | Create (exports `CANCELLABLE_STATUSES`) |
| `src/app/api/orders/[orderId]/route.ts` | Modify — slim to ~25 lines |
| `src/app/api/orders/[orderId]/request-cancellation/route.ts` | Modify — slim to ~30 lines |
| `src/features/orders/index.ts` | Modify — barrel exports |
| `src/app/api/orders/[orderId]/__tests__/route.test.ts` | Modify — re-anchor 878-line suite |
| `src/features/orders/services/__tests__/getOrderByIdService.test.ts` | Create |
| `src/features/orders/services/__tests__/requestCancellationService.test.ts` | Create |
| `src/app/api/orders/[orderId]/request-cancellation/__tests__/route.test.ts` | Create |

## Interfaces / Contracts

```ts
// getOrderByIdService
export async function getOrderByIdService(params: {
  user: AuthUser; jwtToken: string; traceId: string; orderId: string
}): Promise<{ data: NormalizedOrder } | { error: NextResponse }>

// requestCancellationService
export const CANCELLABLE_STATUSES = ['pending', 'paid', 'processing'] as const
export async function requestCancellationService(params: {
  user: AuthUser; jwtToken: string; traceId: string; orderId: string
  reason: string  // caller (route) guarantees length ≤ 500
}): Promise<{ data: { success: true; message: string } } | { error: NextResponse }>
```

## Spanish Strings — Byte-Identical Lock-Down

Quoted VERBATIM from current route source — do not modify.

| Status | Route | String |
|--------|-------|--------|
| 502 | `[orderId]` | `No pudimos cargar tu pedido. Inténtalo de nuevo.` |
| 502 | `[orderId]/request-cancellation` (both calls) | `No pudimos enviar la solicitud. Inténtalo de nuevo.` |
| 404 | both | `Pedido no encontrado` |
| 400 invalid body | cancellation | `Solicitud inválida.` |
| 400 missing reason | cancellation | `Indícanos el motivo de la cancelación.` |
| 400 non-cancellable status | cancellation | `No se puede cancelar un pedido en estado: {status}` |
| 200 cancellation success | cancellation | `Solicitud de cancelación enviada correctamente` |
| 500 top-level catch | both | `Ocurrió un error inesperado. Inténtalo de nuevo.` |

> The two 502 messages differ intentionally and MUST NOT collapse: `tu pedido` (fetching) vs `la solicitud` (submitting).

### NEW — Reason-Too-Long (proposed verbatim, apply uses this string)

```
El motivo de la cancelación no puede superar los 500 caracteres. Reduce el texto a 500 caracteres como máximo y vuelve a intentarlo para que podamos procesar tu solicitud.
```

Neutral tú-form imperative, consistent with existing "Inténtalo de nuevo" voice. Two sentences: context (limit exceeded) + action (reduce + retry).

## Cross-Cutting Guarantees

- **X-Trace-Id** — every `fetch` header AND every `NextResponse` header (200/400/404/500/502) carries `traceId`. Service tests assert fetch received `X-Trace-Id`; route tests assert response.headers['X-Trace-Id'].
- **IDOR 404-not-403** — both services return **404** `Pedido no encontrado` for missing order, non-owner, or `orderId !== param` (cancellation only). NEVER 403.
- **CANCELLABLE_STATUSES** — exported from `requestCancellationService.ts`; route file loses the constant; grep confirms zero external callers.

## Barrel Exports (`src/features/orders/index.ts`)

Add under `// Export service`:

```ts
export { getOrderByIdService } from './services/getOrderByIdService'
export { requestCancellationService } from './services/requestCancellationService'
```

`CANCELLABLE_STATUSES` is exported from the service file for internal feature use but NOT in the public barrel (internal contract).

## TDD Test Strategy (Strict TDD, order matters)

1. **Service tests first** — both services mock `global.fetch`. Own fetch-was-called-with-X-Trace-Id/Authorization assertions and byte-identical Spanish strings.
2. **Cancellation route test** — GREENFIELD. Mocks service. 200, 400 missing reason, 400 invalid body, 400 reason-too-long (NEW), 502, 404, success body `{success:true, message}`.
3. **Re-anchor 878-line `[orderId]` route suite** — switch from `global.fetch` mock to `getOrderByIdService` mock. Preserve every original status/string/shape assertion; fetch-mock assertions migrate to the new service test.

| Stays in `[orderId]` route suite | Migrates to `getOrderByIdService.test.ts` |
|----------------------------------|------------------------------------------|
| Status codes (200/401/404/502) | `global.fetch` called with Strapi URL |
| Spanish strings + body shapes | Headers: `Authorization`, `Content-Type`, `X-Trace-Id` |
| `X-Trace-Id` on response | Network/parse-failure → 502 mapping |
| requireUser / 401 behavior | |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration. Pure internal refactor; no schema/env changes. Rollback = `git revert <merge-sha>`; the 878-line route suite asserts pre-refactor behavior, so revert restores green.

## Natural Seam for Chained PRs (delivery decision deferred to sdd-tasks)

- **PR-1** — `getOrderByIdService` + `[orderId]/route.ts` slim + re-anchor 878-line suite. Read-only.
- **PR-2** — `requestCancellationService` + cancellation route slim + first tests + NEW 500-char behavior.

## Open Questions

None blocking. Both locked product decisions are recorded (#1224). Implementation order: service tests → cancellation route test → re-anchor → barrel.
