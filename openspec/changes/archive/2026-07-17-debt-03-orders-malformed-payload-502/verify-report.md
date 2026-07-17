# Verify Report: DEBT-03 — Orders malformed-but-200 → service 502

> Change: `debt-03-orders-malformed-payload-502`
> Branch: `frontend/DEBT-03-orders-malformed-payload-502`
> Mode: Strict TDD (active)
> Verdict: **PASS**

## Completeness

| Dimension | Status | Notes |
|-----------|--------|-------|
| Task completion | ✅ 7/7 checked | A1.1, A2.1, B1.1, B1.2, V1, V2, V3 |
| Spec compliance | ✅ 13/13 scenarios | 7 detail + 6 cancellation |
| Design coherence | ✅ 8/8 decisions | All design decisions honored |
| TDD compliance | ✅ 6/6 checks | Full TDD cycle evidence |
| Route purity | ✅ No regression | Zero diff on route files |

## Build / Tests / Coverage Evidence

| Command | Exit | Hash |
|---------|------|------|
| `npx vitest run --maxWorkers=2 src/features/orders/services/` | 0 | `be2434556c9d6f23` |
| `npx tsc --noEmit` | 0 | `e3b0c44298fc1c14` (empty = clean) |

**Test counts**: 2 files, 34 tests, 34 passed, 0 failed (15 detail + 19 cancellation).

## TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | Found in apply-progress (table present) |
| All tasks have tests | ✅ | 4/4 tasks have test files |
| RED confirmed (tests exist) | ✅ | 4/4 test files verified on disk |
| GREEN confirmed (tests pass) | ✅ | 34/34 tests pass on execution |
| Triangulation adequate | ✅ | 2 cases per new scenario (single null + [null, valid-other]) |
| Safety Net for modified files | ✅ | 14/14 (detail) + 18/18 (cancellation) existing tests ran |

**TDD Compliance**: 6/6 checks passed

## Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 34 | 2 | vitest |
| Integration | 0 | 0 | — |
| E2E | 0 | 0 | — |
| **Total** | **34** | **2** | |

## Changed File Coverage

Coverage analysis skipped — no coverage tool configured in project.

## Assertion Quality

✅ All assertions verify real behavior.

- No tautologies (`expect(true).toBe(true)`)
- No orphan empty checks
- No type-only assertions without value assertions
- All assertions call production code (service functions invoked with real params)
- No ghost loops
- No smoke tests
- No implementation detail coupling (no CSS class or internal state assertions)
- Mock/assertion ratio: healthy (1 `vi.mock` per file, 3-6 `expect()` per test)

**Assertion quality**: 0 CRITICAL, 0 WARNING

## Spec Compliance Matrix

### Order Detail Service (`order-detail-service/spec.md`)

| # | Requirement / Scenario | Test File | Test Name | Status |
|---|----------------------|-----------|-----------|--------|
| 1 | Owner fetches own order — 200 (KEPT) | `getOrderByIdService.test.ts:275` | `returns {data: normalizedOrder}…` | ✅ PASS |
| 2 | Network / non-ok / JSON-parse — 502 byte-identical (KEPT) | `getOrderByIdService.test.ts:84,104,121` | 3 tests: not-ok, network, json-parse | ✅ PASS |
| 3 | Malformed-but-200 — 502 (NEW) | `getOrderByIdService.test.ts:143` (case 1) | `returns 502 when payload is malformed-but-200…` | ✅ PASS |
| 4 | Edge-case ordering — 502 not 404 (NEW) | `getOrderByIdService.test.ts:143` (case 2) | Same test, `[null, <valid-other>]` assertion | ✅ PASS |
| 5 | Non-owner or missing order — 404 (KEPT) | `getOrderByIdService.test.ts:203,221,240,258` | 4 tests: IDOR, no user, empty, different orderId | ✅ PASS |
| 6 | Trace header on every call (KEPT) | `getOrderByIdService.test.ts:329,342,355` | 3 tests: success, 502, 404 | ✅ PASS |
| 7 | Malformed-Payload Test Coverage (ADDED) | `getOrderByIdService.test.ts:143-199` | 1 new scenario + co-located edge case | ✅ PASS |

### Order Cancellation Service (`order-cancellation-service/spec.md`)

| # | Requirement / Scenario | Test File | Test Name | Status |
|---|----------------------|-----------|-----------|--------|
| 1 | Cancellable order — 200 (KEPT) | `requestCancellationService.test.ts:62` | `performs GET lookup then PUT update…` | ✅ PASS |
| 2 | Network / non-ok / JSON-parse — 502 byte-identical (KEPT) | `requestCancellationService.test.ts:179,203,222,246,275` | 5 tests: GET not-ok, GET network, GET json, PUT not-ok, PUT network | ✅ PASS |
| 3 | Malformed-but-200 — 502 (NEW) | `requestCancellationService.test.ts:300` (case 1) | `returns 502 when GET lookup payload is malformed-but-200…` | ✅ PASS |
| 4 | Edge-case ordering — 502 not 404 (NEW) | `requestCancellationService.test.ts:300` (case 2) | Same test, `[null, <valid-other>]` assertion | ✅ PASS |
| 5 | Non-owner or missing order — 404 (KEPT) | `requestCancellationService.test.ts:366,388,407,427` | 4 tests: IDOR, no user, empty, different orderId | ✅ PASS |
| 6 | Malformed-Payload Test Coverage (ADDED) | `requestCancellationService.test.ts:300-362` | 1 new scenario + co-located edge case | ✅ PASS |

## Design Coherence

| # | Decision | Status | Evidence |
|---|----------|--------|---------|
| 1 | Catch starts AFTER json-parse catch | ✅ | `getOrderByIdService.ts:66` (after L54-64); `requestCancellationService.ts:82` (after L62-72) |
| 2 | Catch ends after success return (detail) | ✅ | `getOrderByIdService.ts:95` wraps through L94 `return { data: normalized }` |
| 3 | Catch ends BEFORE PUT fetch (cancellation) | ✅ | `requestCancellationService.ts:144` catch ends; PUT fetch at L151 |
| 4 | Inline literal, no helper extraction | ✅ | Verbatim strings reused; no `buildServiceError()` helper |
| 5 | `catch (err: unknown)` | ✅ | Both files: L95 and L137 |
| 6 | Catch does NOT silently swallow | ✅ | Both catches return `{ error: NextResponse.json(…, 502) }` — never success-shaped |
| 7 | Verbatim Spanish strings | ✅ | `'No pudimos cargar tu pedido. Inténtalo de nuevo.'` (L98); `'No pudimos enviar la solicitud. Inténtalo de nuevo.'` (L140) |
| 8 | X-Trace-Id threading | ✅ | Both catches include `headers: { 'X-Trace-Id': traceId }` |

## Guardrails Verification

| Guardrail | Status | Evidence |
|-----------|--------|---------|
| Catch AFTER json-parse (not wrapping `await response.json()`) | ✅ | Detail L66 after L56; Cancellation L82 after L64 |
| Cancellation catch BEFORE PUT fetch | ✅ | Catch ends L144; PUT at L151 |
| No helper extraction | ✅ | Inline `NextResponse.json` in both catches |
| `catch (err: unknown)` | ✅ | L95 and L137 |
| `normalizeStrapiOrder` NOT null-safe | ✅ | `normalizeStrapiOrder.ts:23` — `raw.attributes` throws on null input |
| Verbatim Spanish strings literal in source | ✅ | L98 detail, L140 cancellation |
| `X-Trace-Id` on new 502 | ✅ | L99 detail, L141 cancellation |
| Existing 502 paths byte-identical | ✅ | Git diff shows no edits to L36-43, L45-52, L54-64 (detail) or L44-51, L53-60, L62-72, L163-170, L172-178 (cancellation) |
| Exactly ONE new scenario per suite | ✅ | Detail L143-199; Cancellation L300-362 |
| No edits to PUT-leg 502 catches | ✅ | Cancellation L163-178 unchanged in diff |

## Route Purity

| Route File | Direct `normalizeStrapiOrder` | Direct `fetch(` | Diff from main |
|------------|-------------------------------|-----------------|----------------|
| `src/app/api/orders/[orderId]/route.ts` | 0 | 0 | empty |
| `src/app/api/orders/[orderId]/request-cancellation/route.ts` | 0 | 0 | empty |

Routes remain transport-only. DEBT-03 did not touch route files.

## Byte-Identity of Existing 502 Paths

| Service | Existing 502 scenarios | Still present | Still pass | Diff touched |
|---------|----------------------|---------------|------------|--------------|
| getOrderByIdService | 3 (network L104, non-ok L84, json-parse L121) | ✅ | ✅ | No — additive only |
| requestCancellationService | 5 (GET network L203, GET non-ok L179, GET json L222, PUT non-ok L246, PUT network L275) | ✅ | ✅ | No — additive only |

## Diff Summary

```
11 files changed, 892 insertions(+), 61 deletions(-)
```

Code-only changes (excluding SDD artifacts):
- `getOrderByIdService.ts`: +30 -21 (try/catch wrap)
- `requestCancellationService.ts`: +57 -40 (try/catch wrap + orderData hoist)
- `getOrderByIdService.test.ts`: +58 (new scenario)
- `requestCancellationService.test.ts`: +64 (new scenario)

## Issues

| ID | Severity | Location | Claim | Evidence |
|----|----------|----------|-------|----------|
| — | — | — | No issues found | — |

## Quality Metrics

**Linter**: ➖ Not run (not in scope for this verify)
**Type Checker**: ✅ `npx tsc --noEmit` exit 0, no errors

## Final Verdict

**PASS** — All 34 tests pass, tsc clean, 13/13 spec scenarios compliant, 8/8 design decisions honored, TDD cycle evidence complete, route purity preserved, existing 502 paths byte-identical, edge-case ordering assertion present and passing.
