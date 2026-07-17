# Design: DEBT-03 — Orders malformed-but-200 → service 502

> SDD design artifact (hybrid). Mirrors Engram topic `sdd/debt-03-orders-malformed-payload-502/design`.
> Implements the proposal approach (single try/catch per service, reused 502 family) and conforms to the two delta specs.

## Technical Approach

Add ONE wrapping `try { … } catch { … }` **after** the existing post-`.json()` parse in each service, around the entire block that today runs unwrapped (`.find` → `normalizeStrapiOrder` → IDOR/status/return). The catch reuses the service's existing inline 502 shape verbatim — no new strings, no helper extraction, no edits to existing branches. Strict TDD: one new RED scenario per suite is written first.

## Architecture Decisions

| # | Decision | Choice | Tradeoff | Rationale |
|---|----------|--------|----------|-----------|
| 1 | Where the catch starts | Immediately **after** the existing `try { payload = await response.json() }` block, on the `payload` line that follows | Wrapping the `.json()` call would double-catch the JSON-parse 502 path and risk shifting its response shape | Additive-only: existing L54-64 / L62-72 blocks stay byte-identical; spec's `byte-identical 502` claim holds |
| 2 | Where the catch ends (detail) | After `return { data: normalized }` at L93 — the success `return` lives INSIDE the `try` | Slightly wider scope than necessary | Symmetry with how the route's own try works; the success path does not throw so no behaviour change |
| 3 | Where the catch ends (cancellation) | **Before** the second `fetch` (L132). Wrap L74-127 ONLY. | The PUT leg already has its own dedicated 502 boundaries at L133-153 / L155-162 | Wrap remains GET-leg-scoped; the 502 family across GET and PUT still uses the same verbatim string but each leg's catches remain independent |
| 4 | 502 builder reuse | Inline literal, BY COPY — `NextResponse.json({ error: '<existing verbatim string>' }, { status: 502, headers: { 'X-Trace-Id': traceId } })` | A `buildServiceError()` helper would deduplicate but would force editing the existing 502 paths' call sites — violates additive-only | Existing code achieves single-source-of-truth by string copy (3 sites in detail, 5 in cancellation). Follow the existing pattern. |
| 5 | Catch param shape | `catch (err: unknown)` (TS 5 strict mode already on); body intentionally does NOT touch `err` | A `catch (err) { console.error(err) }` would be nice but changes log surface mid-fix | Minimal additive change; no new log channels introduced in DEBT-03 (logging is out of scope) |
| 6 | Catch does NOT silently swallow | The catch returns the 502; it never returns a success-shaped value | Some would argue a swallowed malformed element could `.filter(Boolean)` → return 404 instead | Returning 404 would violate RES-001 (masking as "not found") — explicit in proposal non-goals |
| 7 | Verbatim strings (do not paraphrase) | detail = `'No pudimos cargar tu pedido. Inténtalo de nuevo.'` · cancellation = `'No pudimos enviar la solicitud. Inténtalo de nuevo.'` | — | Specs require byte-identical to existing 502 paths |
| 8 | X-Trace-Id threading | Carried into the catch by closure (same `traceId` local in scope) | — | Matches existing 502 response pattern; required by `api-traceability` |

## Data Flow (cancellation service, GET leg)

```
fetch(url, headers)               ──try/catch──▶ 502 (existing)
   │ ok?
   ▼
lookupResponse.ok?                ──if !ok────────▶ 502 (existing)
   │
await lookupResponse.json()       ──try/catch──▶ 502 (existing)
   │
   ▼   ←── NEW WRAP BEGINS HERE (after L72) ──────────────────────┐
payload.data ?? []                                                   │
   │                                                                │
orders.find(o => normalizeStrapiOrder(o).orderId === orderId)       │
   │   └─ null/undefined element → normalizeStrapiOrder(null)       │
   │      → 'raw.attributes' on null → TypeError → bubbles ──┐       │
   ▼                                                            │
matchingOrder? not-found ─▶ 404 (existing 404 path, untouched) │       │
   │                                                            │       │
normalizeStrapiOrder(matchingOrder) ─ also throws? ────────────┼──────▶│
   │                                                            │       │
IDOR / status checks ───────────── also throw? ───────────────┘       │
   │                                                            │       │
return { data: { success: true, ... } } OR PUT leg ◀────────────┘       │
                          ── NEW CATCH ──────────────────────────────▶ 502
                                                                       (reused
                                                                       inline
                                                                       shape)
```

The catch is positioned so the `.find` throw — occurring BEFORE `matchingOrder` is assigned — is caught. For `payload.data = [null, <valid-other>]`, the first array element's malformed form fires TypeError inside `.find`; the array is never iterated to the valid sibling; result is 502, not 404.

## File Changes

| File | Action | Why |
|------|--------|-----|
| `src/features/orders/services/getOrderByIdService.ts` | Modify (add ~10 lines around L66-93) | Insert one try { … } catch { … } wrapping `payload.data ?? []` → return-success |
| `src/features/orders/services/requestCancellationService.ts` | Modify (add ~10 lines around L74-127) | Same pattern, GET-leg only |
| `src/features/orders/services/__tests__/getOrderByIdService.test.ts` | Extend (1 new scenario + edge-case) | Strict-TDD RED for `{ data: [null] }` → 502 |
| `src/features/orders/services/__tests__/requestCancellationService.test.ts` | Extend (1 new scenario + edge-case) | Strict-TDD RED for same on GET-leg |
| `src/features/orders/services/normalizeStrapiOrder.ts` | **No change** | Out of scope; spec non-goal |

No new files. No deletions.

## Interfaces / Contracts

No new public interfaces. The function signatures of `getOrderByIdService` / `requestCancellationService` / `normalizeStrapiOrder` are unchanged. The return type unions `{ data: … } | { error: NextResponse }` are unchanged — the new branch only adds one more occurrence of the existing `{ error: NextResponse }` variant (already allowed by the union).

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit (RED first, per Strict TDD) | `{ data: [null] }` → 502 + exact Spanish body + `X-Trace-Id` | `mockResolvedValueOnce({ ok: true, json: async () => ({ data: [null] }) })`; assert `status === 502`, `body.error === '<exact string>'`, `headers.get('X-Trace-Id') === 'trace-xyz'` |
| Unit (RED first, edge case) | `{ data: [null, <valid-other-order>] }` → 502 (not 404) | Same mock shape with valid other order after the null; assert 502 status (NOT 404) |
| Regression (must stay green) | The 3 existing 502 scenarios per file (network reject, non-ok, JSON parse fail); for cancellation also the 2 PUT-leg 502s | No edit; running `npx vitest run --maxWorkers=2` (MANDATORY worker limit) keeps them byte-identical |

Run: `npx vitest run --maxWorkers=2 -- src/features/orders/services/__tests__/`.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is touched. The change is two service-file diffs inside one feature folder.

## Migration / Rollout

No migration required. No feature flag, no schema change, no public API change. Rollback boundary: revert the single inserted try/catch per file (and the two new test scenarios). Behaviour prior to the change is restored exactly.

## Open Questions

None. Every decision above is locked by either the proposal (catch position, byte-identical strings) or the delta specs (verbatim Spanish, `X-Trace-Id`, edge-case assertion).
