```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:6bbd2c9e37e0bda969bfc1f1881035d7534bb23386eb291fc1e2d0e489ff92cf
verdict: pass
blockers: 0
critical_findings: 0
requirements: 6/6
scenarios: 7/7
test_command: npx vitest run --maxWorkers=2
test_exit_code: 0
test_output_hash: sha256:6ad0f93a710e723eb30c0d7d663a0faf599a0b7e18aa4eabe7c3de581e8f0579
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:25917a53b3b527f7d0f0880f35d436ebb1bf1a2a9f53a4a0ac78a1a9293971ba
```

# Verification Report — F3 catalog CORS BFF (FULL CHANGE, FINAL)

**Change**: follow-ups-sprint-5-stripe-upsert/F3-cors-over-ngrok
**Version**: v1.10.0 (release relojes-bv-beni 1.10.0)
**Mode**: Strict TDD (per `openspec/config.yaml` `strict_tdd: true`)
**Branch**: `main` @ `2b67540` — both PRs merged: PR #136 (PR1, server-side routes) + PR #138 (PR2, origin-aware routing + e2e + env) + release-please PR #139.
**Scope**: FULL CHANGE final verification. This report SUPERSEDES the mid-chain PR1 report previously stored at this path (verdict `fail`, 5/6 requirements, 4/7 scenarios — correct mid-chain state, now outdated) and the post-PR1-merge status confirmation (Engram #1876).

**Commits under review** — PR1: `86f705d`, `b363ef3`, `cacf346`, `f63123a`, `ed0c635` (merged via #136). PR2: `be3b272`, `ecabdd6`, `ccac245`, `8d00c05` (merged via #138). Release: `8c717af` (v1.10.0), merge `2b67540`.

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total (active) | 12 |
| Tasks complete (PR1: A1, A2, B1, B2, B3, B4, C1 + PR2: D1, D2, E1, E2, E3, F1) | 12 |
| Tasks incomplete | 0 |

All 12 tasks are checked in `tasks.md`; PR1 completion cross-checks against Engram #1872 apply-progress and PR2 completion against the `8d00c05` checkpoint body. Every claimed artifact was independently re-verified on main HEAD in this run.

## Build & Tests Execution (triple gate on main HEAD `2b67540`)

**Tests (full suite)**: ✅ 1123 passed / 0 failed / 0 skipped — 91 files, exit 0
```text
$ npx vitest run --maxWorkers=2
Test Files  91 passed (91)      Tests  1123 passed (1123)      Duration 50.95s
exit 0 · output sha256 6ad0f93a710e723eb30c0d7d663a0faf599a0b7e18aa4eabe7c3de581e8f0579
```
The pre-existing network-dependent `test/integration/image-allowlist.test.ts` flake (documented in PR1/PR2 gates) PASSED in this run (3/3) — the documented tolerance was not needed. F3 surfaces confirmed inside the suite: products route 9/9, categories route 6/6, api-browser-origin 6/6, products-pagination 10/10, api-security 13/13, orders.public-api 2/2, useProducts + page tests green.

**Type-check**: ✅ `npx tsc --noEmit` → exit 0, empty output (hash of empty log: `sha256:e3b0c442…b855`)

**Build**: ✅ `npm run build` → exit 0; `/api/products` and `/api/categories` registered as Dynamic (ƒ) routes. Run twice during verification (first `sha256:49de23d1…d9594`, re-run after dev servers clobbered `.next`: `sha256:25917a53…9711ba` — identical source, both exit 0).

**E2E (catalog-origin spec, executed this run)**: ✅ 4/4 passed, twice consecutively
```text
$ npx playwright test tests/e2e/catalog-origin.spec.ts   (vs `next start` prod build + mock Strapi :1337)
4 passed (3.2s) · chromium ×2 + firefox ×2 · exit 0
output sha256 7e2cbe9a4fae32d7a5eb41bb188d5ab122b66f21be45c0caad6bbb9520973575
```
Both browsers assert via `waitForRequest` that `/api/products` and `/api/categories` requests start with the page origin and never contain `localhost:1337`. Browser-level behavior was additionally traced in a real Chromium session: same-origin requests observed at ~3.8s, both 200, products rendered (`loading=0`, results text present) — on a dev server as well as on the production build.

**⚠️ E2E dev-mode flake (investigated, root-caused, NOT an F3 defect)**: the first execution of this spec against a COLD `npm run dev` server (Playwright's configured `webServer`) failed 4/4 with `waitForRequest` 15s timeouts. Tracing showed a `PAGEERROR SyntaxError: Invalid or unexpected token` during dev chunk evaluation — the client subtree never hydrated, so NO client fetch fired at all (page frozen at SSR "Cargando productos..."). Subsequent runs (warm dev server, and prod build ×2) pass. The failure mode kills any client behavior, not specifically F3 routing; the spec's origin contract is proven on both dev and prod servers. Recorded as WARNING with suggestion below.

**Coverage**: ➖ Not run — coverage tooling broken in this environment per F2 precedent (`@vitest/coverage-v8` ESM/CJS clash); threshold is 0 and never blocking.

## Spec Compliance Matrix (6 requirements / 7 scenarios — authoritative recount from spec.md)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| R1 Same-origin products proxy | Visitor over ngrok sees real products | `src/app/api/products/__tests__/route.test.ts` (9 cases) + `catalog-origin.spec.ts` products test (chromium+firefox, 4/4×2 runs) + live trace (same-origin `/api/products?populate=*&pagination[...]` → 200 → products rendered) | ✅ COMPLIANT |
| R2 Same-origin categories proxy | Visitor over ngrok sees real categories | `src/app/api/categories/__tests__/route.test.ts` (6 cases) + `catalog-origin.spec.ts` categories test + live trace (`/api/categories?populate=*` → 200) | ✅ COMPLIANT |
| R3 Friendly error mapping | Upstream 500 surfaces friendly Spanish, no raw 500 in DOM | products/categories route tests: upstream 500 → `Error temporal del servidor…` via `mapApiError`, `not.toContain('Internal Server Error')`; catch-all → generic Spanish | ✅ COMPLIANT |
| R4 X-Trace-Id propagation | Browser without trace gets UUIDv4 generated | products "generates a UUIDv4 X-Trace-Id when absent" (UUIDv4 regex + upstream header + response echo) | ✅ COMPLIANT |
| R4 X-Trace-Id propagation | Browser with trace preserved end-to-end | products "preserves an incoming X-Trace-Id end-to-end" + categories trace case (upstream forward + echo asserted) | ✅ COMPLIANT |
| R5 (delta) Origin-aware fetchApiFull | Browser context produces relative URL | `api-browser-origin.test.ts` — 3 browser-context cases: `getProducts`/`getProductBySlug`/`getCategories` resolve to `/api/…` relative, `not.toContain('localhost:1337')`, call sites unchanged + X-Trace-Id UUID still sent | ✅ COMPLIANT |
| R6 (delta) Server callers unchanged | Server-side RSC fetch uses absolute URL | `api-browser-origin.test.ts` — 3 server-context cases (`vi.stubGlobal('window', undefined)`): absolute `http://localhost:1337/api/…` + encoding parity; plus full-suite kept-green (products-pagination 10/10, api-security 13/13, tienda page tests) | ✅ COMPLIANT |

**Compliance summary**: 7/7 scenarios compliant, 6/6 requirements complete. The two PARTIAL browser-level gaps and the UNTESTED R3 scenario from the mid-chain report are all closed by PR2.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Products proxy | ✅ Implemented | `src/app/api/products/route.ts` — allowlist prefixes `populate`, `pagination[`, `filters[`, `sort[` + exact `locale`, `publicationState`, `sort`; `getTraceId(request)`; `mapApiError`; `status: upstream.status` mirror; `no-store` on every branch |
| Categories proxy | ✅ Implemented | `src/app/api/categories/route.ts` — `populate`, `filters[` + exact `locale`; identical trace/error/cache semantics |
| `mapApiError` export | ✅ Implemented | `src/lib/api.ts:38` — same mapper, exported (PR1) |
| `getStrapiServerUrl()` (D4) | ✅ Implemented | `src/lib/api.ts:69` — env order preserved, shared by routes + `fetchApiFull` |
| `getApiBaseUrl()` origin-aware (PR2) | ✅ Implemented | `src/lib/api.ts:100` — `typeof window !== 'undefined'` → `''`, else `getStrapiServerUrl()`; wired into `fetchApiFull` via string concat (D5) |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| D2 — drop unknown query keys silently | ✅ Yes | `isAllowlisted` gate, no 400; pinned by drop-unknown tests on both routes |
| D3 — mirror upstream status exactly | ✅ Yes | `status: upstream.status` in error branch; 404-mirror tests |
| D4 — `getStrapiServerUrl()` single env point | ✅ Yes | shared by `fetchApiFull` and both route handlers |
| D5 — string concat, NOT `new URL(path, '')` | ✅ Yes | `fetchApiFull` at `api.ts:117-122` — concat with explicit D5 comment |
| D6 — jsdom + `vi.stubGlobal('window', undefined)` per call | ✅ Yes | `withServerContext` helper in `api-browser-origin.test.ts` |
| Option A — raw allowlisted forwarding | ✅ Yes | no envelope rebuild; routes never call `fetchApiFull` (standalone-green held) |
| Envelope `{data, meta}` unchanged / `no-store` | ✅ Yes | payload passthrough verbatim; `no-store` on all branches |

## File-by-File Scope Check (design list vs merged main)

| File | Expected | Present on main | Match |
|------|----------|-----------------|-------|
| `src/app/api/products/route.ts` | PR1 create | ✅ 109 lines, byte-identical since verified `ed0c635` (diff 0) | ✅ |
| `src/app/api/categories/route.ts` | PR1 create | ✅ 98 lines, byte-identical since `ed0c635` | ✅ |
| `src/lib/api.ts` | PR1 export/extract + PR2 `getApiBaseUrl` + wiring | ✅ both changes present (+43 lines in PR2 range) | ✅ |
| `src/app/api/products/__tests__/route.test.ts` | PR1 create (9 cases) | ✅ 9/9 pass | ✅ |
| `src/app/api/categories/__tests__/route.test.ts` | PR1 create (6 cases) | ✅ 6/6 pass | ✅ |
| `src/lib/api/__tests__/api-browser-origin.test.ts` | PR2 create | ✅ 164 lines, 6/6 pass | ✅ |
| `tests/e2e/catalog-origin.spec.ts` | PR2 create | ✅ 67 lines, 4/4 pass (prod), no `page.route` mocks | ✅ |
| `.env.example` | PR2 comment block | ✅ full STRAPI_API_URL vs NEXT_PUBLIC block + added `STRAPI_API_URL` line | ✅ |

PR2 code diff (4f64973..2b67540, excluding release-please manifest/lock and openspec chores) touches exactly `.env.example`, `src/lib/api.ts`, `api-browser-origin.test.ts`, `catalog-origin.spec.ts` — 302 insertions / 8 deletions, no unrelated files, no scope creep. `useProducts.ts` and `CatalogContent.tsx` untouched (R3 "callers MUST NOT need code changes" held).

## TDD Compliance (Strict)

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | PR1: full TDD Cycle Evidence table in apply-progress (Engram #1872). PR2: per-commit RED/GREEN evidence in `be3b272` (observed RED: 2 failed / 4 passed) and `ecabdd6` (observed GREEN per-file: 6/6, 10/10, 13/13, 2/2, 14/14) + `8d00c05` gate summary |
| All tasks have tests | ✅ | A1/A2/D1/D2 test files exist and pass; B*/E1/E2 refactors guarded by kept-green suites; E3 is documentation |
| RED confirmed (tests exist) | ✅ | PR1 RED empirically reproduced in detached worktree at `86f705d` (2 failed suites, exit 1 — prior report). PR2 RED observed in `be3b272` body (vitest: 2 failed browser-relative, 4 passed server-contract) |
| GREEN confirmed (tests pass) | ✅ | 21 unit + 4 e2e executions pass on main HEAD in THIS run |
| Triangulation adequate | ✅ | 9 + 6 route cases; 6 origin cases across both contexts; 2 e2e assertions × 2 browsers |
| Safety Net for modified files | ✅ | `api.ts` (both PRs) guarded by products-pagination (10), api-security (13), orders.public-api (2) — all green |

**TDD Compliance**: 6/6 checks passed

## Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit (handler-direct + origin) | 21 | 3 | vitest + jsdom |
| Integration | 0 | 0 | — (route handlers need none) |
| E2E | 2 tests (4 browser executions) | 1 | Playwright (chromium, firefox) |
| **Total** | **23** | **4** | |

## Changed File Coverage

➖ Coverage analysis skipped — coverage tooling broken in this environment (F2 precedent); threshold 0, informational only, never blocking.

## Assertion Quality

| File | Line | Assertion | Issue | Severity |
|------|------|-----------|-------|----------|

**Assertion quality**: ✅ All assertions verify real behavior — handler-direct route tests invoke the real `GET` with constructed `NextRequest`; origin tests call the real exported call sites (`getProducts`, `getProductBySlug`, `getCategories`) and assert resolved URL values + UUIDv4 header; e2e uses `waitForRequest` on the real browser request with origin predicates and no mocks. No tautologies, no ghost loops, no smoke-only tests, no CSS-class coupling; mock/assert ratio healthy (1 stubbed global per file vs ~40 value assertions).

## Quality Metrics

**Linter**: ➖ Not configured as blocking in the gate
**Type Checker**: ✅ `npx tsc --noEmit` exit 0 — zero errors project-wide

## ⚠️ `--no-verify` Commit Disclosure (PR1; carried, honest status)

3 of 5 PR1 commits (`86f705d`, `b363ef3`, `cacf346`) skipped the project-wide `tsc --noEmit` pre-commit hook — a genuine tooling-vs-strict-TDD conflict (committed RED tests import route modules that do not exist yet), resolved in favor of TDD discipline.

- **Rationale in commit bodies**: ✅ `86f705d` documents it explicitly (names the hook, failure cause, and the vitest RED command). ❌ `b363ef3` and `cacf346` used `--no-verify` (per apply-progress) without an in-body rationale. **Disclosure gap stands as WARNING** — unchanged since the mid-chain report; the apply-progress overstated the documentation.
- **RED state empirically reproducible**: ✅ (detached-worktree reproduction at `86f705d`, prior report).
- **Main HEAD hook-clean**: ✅ `tsc --noEmit` exit 0 on `2b67540` (this run).
- **PR2**: zero `--no-verify` — `be3b272` explicitly states the hook stayed green; no escape hatch needed.
- Assessment: honest engineering under a tooling constraint, not a work-quality defect. The skipped hook is re-satisfied by the triple gate on main HEAD.

## Drift vs tasks.md / design

1. **All 12 tasks implemented and verified** — PR1 (A1, A2, B1, B2, B3, B4, C1) and PR2 (D1, D2, E1, E2, E3, F1) artifacts all exist on main and pass.
2. **Commit order** (PR1): `test → refactor → feat → feat` instead of the tasks.md subject list order — forced by strict-TDD RED-before-GREEN; justified (carried from mid-chain).
3. **LOC drift**: PR1 567 authored lines vs ~267 forecast (carried WARNING). PR2 302 insertions vs ~132 forecast (test file 164 vs 65, e2e 67 vs 35, `.env.example` 30 vs 8) — same documentation-fidelity bias, within the pre-approved chain; per-PR review budgets held (PR2 ≤ 400). Forecasting for future changes should account for this systematic underestimate.

## Edge-Case / New-Risk Scan

- **`NEXT_PUBLIC_STRAPI_API_URL` consumers**: `src/lib/constants.ts` (`API_URL`) feeds orders/favorites/auth services — all server-side behind existing BFF routes; `env-validator.ts` and `createPaymentIntentService.ts` are server-side. No browser-side catalog consumer remains on the absolute URL; `src/lib/images/url.ts` still resolves image URLs against the env host in the browser — known, explicitly out of scope per proposal (media proxying excluded).
- **Proxy pattern elsewhere**: auth, favorites, orders, payment-intent, webhooks already have same-origin BFF routes; products + categories were the only missing public GET surfaces — F3 closes the set. No further proxy candidates found.
- **Docs drift (new finding, suggestion-level)**: `README.md:133`, `CLAUDE.md:84`, `docs/build-and-deployment.md:38`, `docs/setup-production.md:33,131` still document `NEXT_PUBLIC_STRAPI_API_URL` as "the Strapi backend URL" without the BFF split that `.env.example` now explains. Spec only mandated `.env.example`, so this is not a compliance gap.
- **E2E harness reliability (new finding, WARNING)**: `playwright.config.ts` `webServer` runs `npm run dev`; cold dev-server runs can hit a chunk-evaluation `SyntaxError` that prevents hydration and times out `waitForRequest` (observed 1 fail / 3 pass across this session). See suggestion below.
- **No scope creep**: PR2 diff exact to the 4 designed files; PR1 byte-identical since merge.

## AGENT.md Compliance (both PRs)

- Conventional commits, zero AI attribution — grep over all PR1+PR2 commit bodies: clean ✅
- `X-Trace-Id` on all proxied calls (`getTraceId`) and on `fetchApiFull` (api-security 13/13) ✅
- Friendly Spanish error mapping via `mapApiError`; raw `Internal Server Error` never returned ✅
- Atomic Design: no new components ✅
- TypeScript: typed handler signatures, `as const` allowlists, typed test helpers ✅
- Vitest always `--maxWorkers=2` ✅ (all runs in this verification)
- Screaming Architecture: routes under `src/app/api/`, helpers under `src/lib/` ✅

## Issues Found

**CRITICAL**: None.

**WARNING**:
1. E2E dev-mode flake: `catalog-origin.spec.ts` timed out 4/4 on a cold `npm run dev` server (chunk `SyntaxError` prevented hydration; no client fetch at all). Passes on warm dev and on the production build (4/4, twice). Not an F3 code defect; harness reliability issue.
2. PR1 `--no-verify` rationale documented in only 1 of 3 affected commit bodies (`86f705d` yes; `b363ef3`, `cacf346` no) — carried disclosure gap.
3. PR1 authored size (567 lines) exceeded design forecast (~267) and the single-PR 400-line budget — carried; per-PR chain still held.

**SUGGESTION**:
1. Point the Playwright `webServer` at a production build (`next build` + `next start`) or add retries/timeout headroom, so the origin spec is not exposed to dev-server cold-compile chunk races.
2. Sync `README.md`, `CLAUDE.md`, `docs/build-and-deployment.md`, `docs/setup-production.md` with the `.env.example` explanation of `STRAPI_API_URL` vs `NEXT_PUBLIC_STRAPI_API_URL`.
3. Backlog note: product images still resolve to the env host in the visitor's browser (`src/lib/images/url.ts`) — broken over ngrok until media proxying is addressed (explicitly out of F3 scope).

## Verdict

**PASS** — full-change verification on main `2b67540` (v1.10.0): 6/6 requirements and 7/7 scenarios compliant with passing runtime evidence (21 unit + 4 e2e browser executions + triple gate all exit 0); all 12 tasks complete; design decisions D2–D6 and Option A honored; AGENT.md clean; the three warnings are non-blocking (harness flake + carried disclosure/size notes) and none contradicts spec evidence.

**Recommendation**: ready for `sdd-archive`.
