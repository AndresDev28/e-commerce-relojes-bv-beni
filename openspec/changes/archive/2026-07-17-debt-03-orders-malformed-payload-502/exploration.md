# Exploration: DEBT-03 — Orders malformed-but-200 Strapi payload → service 502

> SDD explore artifact (hybrid mode). Mirrored to Engram under topic
> `sdd/debt-03-orders-malformed-payload-502/explore`. Read-only investigation; no
> code modified. The human brief proposed `explore.md`; the OpenSpec convention
> (`_shared/openspec-convention.md` line 31) names this file `exploration.md` —
> convention wins.

## Ticket
DEBT-03 — fix finding **RES-001** from the archived `orders-services-refactor`
change (see `openspec/changes/archive/2026-07-15-orders-services-refactor/archive-report.md`).

## Current State

The two orders API services each own a single Strapi `fetch` (lookup) plus, for
cancellation, a second `PUT`. Each service has THREE existing try/catch
boundaries that map Strapi failures to a friendly **502**:

1. `fetch(...)` rejects (network) → 502
2. `!response.ok` (non-2xx HTTP) → 502
3. `await response.json()` throws (malformed JSON body) → 502

AFTER those three boundaries, the normalized-payload handling runs **outside any
try/catch** in BOTH services:

- `orders = payload.data ?? []`
- `orders.find((o) => normalizeStrapiOrder(o).orderId === orderId)`  ← normalize call #1
- `normalizeStrapiOrder(matchingOrder)`                                ← normalize call #2
- IDOR ownership check, status check, etc.

`normalizeStrapiOrder` (defined in
`src/features/orders/services/normalizeStrapiOrder.ts:22`) dereferences its
argument unconditionally: `if (raw.attributes)`. If `payload.data` contains a
`null`/`undefined` element (e.g. `{ data: [null] }` — a 200 response with a
malformed body that nonetheless parses as JSON), `.find` invokes
`normalizeStrapiOrder(null)` → `null.attributes` → uncaught **TypeError**.
Because the service does not catch it, the TypeError propagates out of the
service into the thin delivery-layer route, which has a top-level
`try { … } catch { return 500 }`. So today the externally observable behavior is:

> malformed-but-200 Strapi payload → service throws → route 500
> `"Ocurrió un error inesperado. Inténtalo de nuevo."`

RES-001 wants the service to catch it and return service-level **502** with the
SAME friendly Spanish string already used by the fetch-failure 502 paths, plus
the `X-Trace-Id` header — so the malformed-payload case stops leaking as a
generic 500 and is observable as recoverable upstream-error (502).

## Affected Areas

- `src/features/orders/services/getOrderByIdService.ts` — normalize calls at
  lines 68-70 (inside `.find`) and line 81 sit OUTSIDE the fetch try/catch
  (lines 27-43 / 45-52 / 54-64). Wrap them.
- `src/features/orders/services/requestCancellationService.ts` — normalize
  calls at lines 76-78 (inside `.find`) and line 89 sit OUTSIDE the fetch
  try/catch blocks (lines 39-51 / 53-60 / 62-72 for the GET, lines 133-153 /
  155-162 for the PUT). Wrap them.
- `src/features/orders/services/normalizeStrapiOrder.ts:22` — the function that
  throws; NOT modified (out of scope to make it null-safe — that would mask the
  problem; the service should catch explicitly).
- `src/features/orders/services/__tests__/getOrderByIdService.test.ts` (310
  lines) — add a "malformed 200 → 502" scenario; existing 502 tests (network
  reject, non-ok, JSON parse fail) MUST stay byte-identical.
- `src/features/orders/services/__tests__/requestCancellationService.test.ts`
  (478 lines) — same.
- OpenSpec delta specs (amend in spec phase):
  - `openspec/specs/order-detail-service/spec.md` — its "Strapi failure — 502
    byte-identical" scenario (currently covers non-ok + JSON parse fail) must
    gain a NEW scenario: malformed-but-200 → 502; AND the byte-identical claim
    must be MODIFIED for this case (500→502 behavior change).
  - `openspec/specs/order-cancellation-service/spec.md` — same.

## Exact file paths (human brief was wrong on names)

The human brief named `order-detail.service.ts` and
`order-cancellation.service.ts`. The REAL files (confirmed on disk) are:

| Brief (wrong)                               | Actual path                                                       |
|---------------------------------------------|-------------------------------------------------------------------|
| `services/order-detail.service.ts`          | `src/features/orders/services/getOrderByIdService.ts`            |
| `services/order-cancellation.service.ts`    | `src/features/orders/services/requestCancellationService.ts`     |

A legacy client wrapper `src/features/orders/services/requestCancellation.ts`
also exists (33 lines) — it does NOT use `normalizeStrapiOrder`; it just POSTs
to the Next.js route and unwraps error.message. It is OUT OF SCOPE and untouched.

## Try/catch boundary relationship (RES-001 confirmed)

`getOrderByIdService.ts`:
- L27-43  try/catch `fetch`        → 502 "No pudimos cargar tu pedido…"
- L45-52  `if (!response.ok)`       → 502 "No pudimos cargar tu pedido…"
- L54-64  try/catch `response.json()` → 502 "No pudimos cargar tu pedido…"
- **L66-93 (find + normalize + IDOR) — UNWRAPPED** ← RES-001 site

`requestCancellationService.ts` (GET leg):
- L39-51  try/catch `fetch`         → 502 "No pudimos enviar la solicitud…"
- L53-60  `if (!lookupResponse.ok)` → 502 "No pudimos enviar la solicitud…"
- L62-72  try/catch `.json()`       → 502 "No pudimos enviar la solicitud…"
- **L74-127 (find + normalize + IDOR + status check) — UNWRAPPED** ← RES-001 site

`requestCancellationService.ts` (PUT leg):
- L133-153 try/catch `fetch`        → 502 …
- L155-162 `if (!updateResponse.ok)` → 502 …

RES-001 REPRODUCES. The normalize step is genuinely outside the existing 502
boundary in both services.

## Friendly Spanish 502 strings (verbatim, confirmed in current code)

- Detail service:  `'No pudimos cargar tu pedido. Inténtalo de nuevo.'`
  — `getOrderByIdService.ts:39, 48, 60`
- Cancellation:     `'No pudimos enviar la solicitud. Inténtalo de nuevo.'`
  — `requestCancellationService.ts:47, 56, 67, 149, 158`

The new malformed-payload 502 SHOULD reuse these exact strings verbatim so the
502 family stays uniform (deduplication across all 502 reasons in each service).
⚠️ Decision for the spec: reuse the SAME string (dedup) vs. introduce a
distinct "Strapi devolvió datos inválidos"-style message. Recommendation: reuse
the same string — the user-visible distinction between "upstream failed" and
"upstream returned garbage" adds no actionable UX, and it keeps the response
byte-identical to the existing 502 family (test assertion simplification).

Non-502 friendly strings already present (NOT to be touched):
- 404: `'Pedido no encontrado'`
- 400 non-cancellable: `` `No se puede cancelar un pedido en estado: ${status}` ``
- 500 route catch: `'Ocurrió un error inesperado. Inténtalo de nuevo.'`  ← the
  very string this change RETIRES for the malformed-payload path

## X-Trace-Id threading (confirmed)

- Every Strapi `fetch` carries `'X-Trace-Id': traceId` in its headers object
  (named `headers` in each service, built once at L29-33 in cancellation,
  inline at L30-34 in detail).
- Every `NextResponse.json(..., { status, headers: { 'X-Trace-Id': traceId } })`
  error response includes the trace header — confirmed in both service files for
  all 502/404/400 paths.
- The new malformed-payload 502 MUST follow the same pattern: `headers: { 'X-Trace-Id': traceId }`.

## Test file structure (for the later spec/apply)

Both suites live at `src/features/orders/services/__tests__/` and share an
identical harness:

- `vi.mock('@/lib/constants', () => ({ API_URL: 'http://localhost:1337' }))`
- `beforeEach`: `global.fetch = vi.fn()` (+ cancellation also spies
  `Date.prototype.toISOString`)
- Dynamic `await import('../<service>')` inside each test so the constants mock
  applies.
- `buildStrapiPayload(overrides)` helper returns a well-formed
  `{ data: [ { id, documentId, attributes: {…} } ] }` envelope.
- `afterEach`: `vi.unstubAllGlobals()`
- Existing 502 cases use `vi.mocked(global.fetch)` with
  `mockResolvedValueOnce({ ok:false, status:500 })` (non-ok),
  `mockRejectedValueOnce(new Error('network down'))` (fetch throw),
  and `mockResolvedValueOnce({ ok:true, json: async () => { throw new Error('invalid json') } })`
  (JSON parse fail).

Adding a malformed-200 → 502 scenario is a fourth, sibling 502 case using
`mockResolvedValueOnce({ ok:true, json: async () => ({ data: [null] }) })`
(or `{ data: [undefined] }`), asserting:
`status === 502`, `body.error === '<exact Spanish string>'`, and
`headers.get('X-Trace-Id') === 'trace-xyz'`. The three existing 502 tests stay
byte-identical — the wrapping only ADDS a catch around the already-unwrapped
normalize block; it does not alter the fetch/json/ok branches.

## Other callers / consumers of normalizeStrapiOrder

`codegraph_explore` blast radius reports 5 callers:
- `getOrderByIdService.ts` (2 call sites — the ones being wrapped)
- `requestCancellationService.ts` (2 call sites — the ones being wrapped)
- `src/features/orders/index.ts:12` — re-export only (no runtime call)

`normalizeStrapiOrder` has NO direct unit tests (⚠️ noted in codegraph blast
radius: "no covering tests found"). It is only exercised via the two service
suites. Wrapping it in try/catch inside the two services therefore has ZERO
impact on any other consumer — there are no others.

## OpenSpec spec domains to amend (for the proposal)

Two existing main-spec domains owned by the archived refactor:

- `openspec/specs/order-detail-service/spec.md` (56 lines) — Requirement
  "getOrderByIdService Contract" has scenario "Strapi failure — 502 byte-identical"
  covering non-ok + JSON parse fail. DEBT-03 ADDS a sibling scenario
  "malformed-but-200 → 502" AND MODIFIED the byte-identical claim (intentional
  500→502 behavior change for this case).
- `openspec/specs/order-cancellation-service/spec.md` (90 lines) — Requirement
  "requestCancellationService Contract" has scenario "Strapi failure — 502
  byte-identical". Same amendment pattern.

⚠️ Both spec files currently assert externally observable behavior MUST be
byte-identical to the pre-refactor route. DEBT-03 deliberately violates that
for the malformed-payload case — the spec MUST record a MODIFIED requirement
explicitly superseding the byte-identical claim for that scenario (mirroring how
the 500-char reason cap was recorded as MODIFIED in the cancellation spec).

## Approaches

### 1. Wrap ONLY the normalize + downstream block in a single try/catch
Wrap from `const orders = payload.data ?? []` through the IDOR/status/return
block in one `try { … } catch { return { error: NextResponse.json(...) 502 } }`.
- Pros: minimal diff (~8-10 lines per file); every 502 reason uses the same
  string; the fetch/json/ok 502 paths remain byte-identical and their tests
  pass unchanged; behavior change is precisely scoped to the malformed case.
- Cons: a 404 (order-not-found) branch is ALSO inside the wrapped block — if
  `normalizeStrapiOrder` ever throws AFTER a successful match (e.g. the found
  order is the malformed `null`), today's 404 would instead become 502. In
  practice the `.find` itself runs normalize on every candidate, so a single
  malformed candidate throws before any match is selected — so the 404 branch
  is not at risk. Acceptable.
- Effort: Low.

### 2. Wrap each normalize call individually
Two try/catch blocks per file.
- Pros: maximal precision.
- Cons: doubles the diff; two catch blocks must use the same string (duplication);
  the `.find` callback can't easily `return` a 502 from inside the catch — you'd
  have to refactor `.find` into a `for…of` loop. More invasive than the finding
  warrants.
- Effort: Medium.

### 3. Make `normalizeStrapiOrder` null-safe (return without throwing)
- Pros: removes the throw at the source.
- Cons: this MASKS the malformed payload as a benign 404 ("Pedido no
  encontrado") — arguably worse than a 502, since the user gets a misleading
  "your order doesn't exist" instead of "try again". Violates the RES-001 intent
  (meaningful 502 context). Out of scope for this change.
- Effort: Low but WRONG.

## Recommendation
Approach **1** — single try/catch around the post-json-parse block in each
service, returning the service's existing friendly 502 string + `X-Trace-Id`.
Reuses the byte-identical 502 family, ~10 lines per file, no new strings, no new
caller impact, fetch/json/ok tests stay byte-identical.

## Risks

- **CRITICAL — behavior change is unavoidable**: this change turns a 500 into a
  502 for the malformed-payload case (different Spanish string: "Ocurrió un
  error inesperado…" → "No pudimos cargar tu pedido…"). This is EXACTLY what
  RES-001 asked for, but the proposal/spec must declare it as a MODIFIED
  requirement, not a byte-identical fix — same shape as the 500-char reason cap
  in the archived cancellation spec.
- **WARNING — human file names were wrong**: brief said
  `order-detail.service.ts` / `order-cancellation.service.ts`; actual files are
  `getOrderByIdService.ts` / `requestCancellationService.ts`. Proposal must use
  the real names.
- **WARNING — `.find` callback throw semantics**: the malformed candidate
  throws DURING `.find`, before `matchingOrder` is assigned. The wrapped catch
  therefore fires on the first malformed candidate, short-circuiting any later
  valid-but-non-matching candidates. For `payload.data = [null, <valid-other>]`
  this means a 502 instead of a 404. Acceptable (a 200 with a null data element
  is itself an upstream contract violation → 502 is the correct semantic), but
  the spec should state it explicitly so verify can assert it.
- **Low — `normalizeStrapiOrder` has no direct unit tests**: wrapping only the
  two consumers leaves the helper's own behavior untested; that's pre-existing
  and out of scope. A future SDD change could add a `normalizeStrapiOrder.test.ts`.
- **None** — no callers beyond the two services; the legacy
  `requestCancellation.ts` client wrapper and `index.ts` re-export are
  unaffected.

## Ready for Proposal
Yes. The orchestrator should tell the user:
- RES-001 reproduces verbatim (normalize is outside every 502 try/catch in both
  services).
- Human file names were wrong; corrected above.
- This is a deliberate 500→502 behavior change, recorded as a MODIFIED
  requirement in both `order-detail-service` and `order-cancellation-service`
  delta specs (supersedes the byte-identical clause for the malformed-payload
  scenario).
- Recommended fix is ~10 lines of try/catch per file; friendly 502 strings and
  X-Trace-Id threading are already established and reused verbatim.