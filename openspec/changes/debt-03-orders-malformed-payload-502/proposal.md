# Proposal: DEBT-03 — Orders malformed-but-200 → service 502

SDD propose artifact (hybrid). Mirrored to Engram `sdd/debt-03-orders-malformed-payload-502/proposal`.

## Intent

Fix **RES-001** from archived `2026-07-15-orders-services-refactor`.
`normalizeStrapiOrder` runs outside every try/catch in both orders
services. A Strapi HTTP-200 with a malformed-but-JSON-parseable body
(e.g. `{ data: [null] }`) makes `.find` invoke
`normalizeStrapiOrder(null)` → TypeError → bubbles to the route's
generic 500. Catch at the service boundary; return existing friendly
service-level **502**.

## Decisions captured

1. Malformed 200 → service 502 (not 500, not silent skip).
2. Reuse existing verbatim friendly Spanish 502 strings.
3. One new "malformed 200 → 502" scenario per test suite;
   `normalizeStrapiOrder.test.ts` deferred.
4. **MODIFIED** requirement in both delta specs, superseding
   byte-identical — mirrors the 500-char reason cap precedent.

## Scope

**In:** wrap post-json-parse block in both services (~10 lines each);
1 new test scenario per suite; amend both delta specs.
**Out (non-goals):** DEBT-04; INF/SEO/SL tickets;
`normalizeStrapiOrder.test.ts` (deferred); making
`normalizeStrapiOrder` null-safe (would mask as misleading 404,
violates RES-001); fetch / `!ok` / json-parse 502 paths (byte-identical,
untouched); legacy `requestCancellation.ts` wrapper.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- **`order-detail-service`** — `openspec/specs/order-detail-service/spec.md`:
  split `Scenario: Strapi failure — 502 byte-identical` into (a)
  non-ok / json-parse (kept, byte-identical) and (b) malformed
  JSON-but-200 → 502 (NEW, **MODIFIED**, supersedes byte-identical).
- **`order-cancellation-service`** — `openspec/specs/order-cancellation-service/spec.md`:
  same split + **MODIFIED**; follows existing `Cancellation Reason
  Length Policy` MODIFIED block as precedent.

## Approach

Single `try { … } catch { service 502 }` wrapping `payload.data ?? []`
→ `.find(...)` → `normalizeStrapiOrder(...)` → IDOR/status block per
service. Reuse verbatim Spanish strings and `X-Trace-Id` header.

### Verbatim Spanish strings (do not change)
- Detail: `'No pudimos cargar tu pedido. Inténtalo de nuevo.'`
- Cancellation: `'No pudimos enviar la solicitud. Inténtalo de nuevo.'`

### Edge-case ordering rule (spec MUST capture)

Lookup returns `{ data: [null, <valid-other>] }` → malformed candidate
throws inside `.find` before `matchingOrder` is assigned → catch fires
on first malformed → **502**, not 404. Verify must assert this
ordering.

## Affected Areas

- **Modified** `src/features/orders/services/getOrderByIdService.ts` — wrap L66–91
- **Modified** `src/features/orders/services/requestCancellationService.ts` — wrap L74–127
- **Extended** `src/features/orders/services/__tests__/getOrderByIdService.test.ts` — 1 scenario
- **Extended** `src/features/orders/services/__tests__/requestCancellationService.test.ts` — 1 scenario
- **MODIFIED req** `openspec/specs/order-detail-service/spec.md` — new scenario + supersession
- **MODIFIED req** `openspec/specs/order-cancellation-service/spec.md` — same

## Risks / Mitigation
- 500→502 misread as regression → MODIFIED req carries "(Previously: …)" note
- `.find` throw short-circuits siblings → edge-case rule; verify asserts it
- Real file names forgotten → use `getOrderByIdService.ts` / `requestCancellationService.ts`
- Existing 502 paths changed → wrap is additive; no existing branch edited

## Rollback

Revert the single try/catch per file; tests revert; no schema, public
API, or migration impact.

## Success Criteria

- [ ] Both new scenarios pass under `npx vitest run --maxWorkers=2`
- [ ] Three existing 502 scenarios per suite stay byte-identical and pass
- [ ] New 502 carries exact Spanish string + `X-Trace-Id` header
- [ ] Both delta specs MODIFIED with "(Previously: …)" note
- [ ] Diff <60 lines
