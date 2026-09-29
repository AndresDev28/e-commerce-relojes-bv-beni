# Design: follow-ups-sprint-5-stripe-upsert/F3-cors-over-ngrok

## Technical Approach

Two same-origin Next.js proxy routes (`GET /api/products`, `GET /api/categories`) + origin-aware `fetchApiFull` in `src/lib/api.ts`. Browser context uses relative base URLs; server context keeps the absolute `STRAPI_API_URL` env chain. Existing server-side callers (RSC, services, route handlers) are byte-identical to today.

**Capability delta = 1 new + 1 modified.** No backend, no schema, no CORS change.

### Open Decision: Closed

**Choice**: Option A — `api/products` and `api/categories` forward **raw allowlisted Strapi query keys**. Option B (re-map via `getProducts()`) was rejected because (a) `getProducts()` returns the unwrapped `{products, pagination}` shape, forcing an envelope rebuild, and (b) reusing `fetchApiFull` in the route would couple PR1 to PR2, breaking the standalone-green requirement.

**Accepted tradeoff**: allowlist duplicates Strapi query knowledge. Mitigated with prefix rules (`pagination[`, `filters[`, `sort[`, `populate`, `locale`, `publicationState`) — future Strapi filters/sorts flow through unchanged.

### Five Micro-Decisions (D2-D6)

| ID | Decision | Rationale |
|----|----------|-----------|
| D2 | Unknown query keys: drop silently (no 400) | UX preference; client never sends unknowns intentionally |
| D3 | Mirror upstream status code exactly | Strapi 404 for missing slug surfaces as 404, not masked 500 |
| D4 | Extract `getStrapiServerUrl()` helper | Single point of env resolution; shared between routes and existing `fetchApiFull` |
| D5 | Browser URLs: string concat, NOT `new URL(path, '')` | `new URL` throws on empty base; concat avoids the throw |
| D6 | Vitest unit project is jsdom-only (no `@vitest-environment node`); server-context tests use `vi.stubGlobal('window', undefined)` per call | Documented unit project constraint; server-context tests must explicitly stub |

## Architecture Decisions Table

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Proxy route surface | Two routes (products, categories) | Only two public GET surfaces missing from existing BFF |
| 2 | Query forwarding | Allowlist + prefix rules | Contract parity with Strapi; future-proof via prefix matching |
| 3 | Error mapping | `mapApiError(status, statusText, body)` exported from `src/lib/api.ts` | Reuses existing private mapper; export enables route reuse |
| 4 | Trace handling | `getTraceId(request)` from `src/lib/trace.ts` (reuse-or-UUIDv4) | Standardizes on existing helper instead of private `generateTraceId` |
| 5 | Origin detection | `typeof window !== 'undefined'` | Standard Next.js idiom; vitest jsdom provides browser env |
| 6 | Cache headers | `no-store` (mirrors current) | Defers caching decision until performance data justifies it |
| 7 | Response envelope | Strapi's `{data, meta}` unchanged | Zero consumer parsing changes |

## Data Flow

### Browser catalog fetch (post-F3)

```
Browser (jsdom or real)
  └── fetch('/api/products?populate=*&pagination[pageSize]=12')
        ↑ relative URL, same-origin
        ↓
Next.js route handler (src/app/api/products/route.ts)
  ├── getTraceId(request) → reuse or UUIDv4
  ├── fetch(`${STRAPI_API_URL}/api/products?populate=*&pagination[pageSize]=12`, {
  │     headers: { 'X-Trace-Id': traceId }
  │   })
  │     ↑ absolute URL, server-side
  │     ↓
  └── Strapi → response with {data, meta:{pagination}}
        ↑ response with X-Trace-Id header (echoed)
        ↓
Next.js route handler
  └── return NextResponse.json(envelope, { headers: { 'X-Trace-Id': traceId, 'Cache-Control': 'no-store' } })
        ↑ JSON response, same-origin
        ↓
Browser → getProducts() parses envelope (unchanged code)
```

### Server-side catalog fetch (post-F3, byte-identical to today)

```
RSC page (src/app/tienda/page.tsx)
  └── fetch(getStrapiServerUrl() + '/api/categories')
        ↑ absolute URL, server-side
        ↓
Strapi → response
```

## File-by-File Change List

### PR1 — Server-side routes + tests + export mapApiError (~267 lines)

| File | Action | ~Lines | Satisfies |
|------|--------|--------|-----------|
| `src/lib/api.ts` | Modify — export `mapApiError`, extract `getStrapiServerUrl()`; behavior-identical | 12 | (foundational) |
| `src/app/api/products/route.ts` | Create — GET, allowlist, trace, friendly errors, no-store | 65 | R1, R2, R5, R6 |
| `src/app/api/categories/route.ts` | Create — same pattern, simpler allowlist | 40 | R3, R5, R6 |
| `src/app/api/products/__tests__/route.test.ts` | Create — 9 cases (envelope, forward, drop, 500/404 mapping, catch-all, trace reuse/gen, no-store) | 90 | R1, R5, R6 |
| `src/app/api/categories/__tests__/route.test.ts` | Create — 6 cases (fixture omits `meta` per mock server) | 60 | R3, R5, R6 |

PR1 total: ~267 lines (target 230-300). Standalone-green: route tests call handlers directly, do not depend on `fetchApiFull` origin-awareness.

### PR2 — Client-side routing + origin assertion (~132 lines)

| File | Action | ~Lines | Satisfies |
|------|--------|--------|-----------|
| `src/lib/api.ts` | Modify — add `getApiBaseUrl()` origin-aware resolver, wire into `fetchApiFull` | 24 | R4, R6 |
| `src/lib/api/__tests__/api-browser-origin.test.ts` | Create — 5 cases (jsdom browser, server stub, encoding parity) | 65 | R4 |
| `tests/e2e/catalog-origin.spec.ts` | Create — Playwright `waitForRequest`, NO page.route mocks | 35 | R1, R3, R7 |
| `.env.example` | Modify — comment block STRAPI_API_URL vs NEXT_PUBLIC_ | 8 | docs |

PR2 total: ~132 lines (target 120-180). Depends on PR1's `mapApiError` export.

## Test Approach

### PR1 unit tests (handler-direct)

| Test | File | Scenario |
|------|------|----------|
| Returns 200 with Strapi envelope passthrough | products | happy path |
| Forwards allowlisted query keys verbatim | products | contract parity |
| Drops unknown query keys silently | products | UX preference |
| Maps upstream 500 to friendly Spanish | products | error mapping |
| Mirrors upstream 404 (does not mask) | products | status parity |
| Catch-all 500 returns generic Spanish | products | catch-all |
| Preserves incoming X-Trace-Id | products | trace reuse |
| Generates UUIDv4 X-Trace-Id when absent | products | trace generation |
| Sets Cache-Control: no-store | products | cache header |
| (similar set for categories, minus pagination cases) | categories | parity |

### PR2 unit tests (origin-aware)

| Test | File | Scenario |
|------|------|----------|
| Browser context returns relative URL | api-browser-origin | R4 |
| Server stub returns absolute URL | api-browser-origin | R4 |
| Query encoding parity | api-browser-origin | R4 |
| Both contexts covered with explicit `vi.stubGlobal('window', undefined)` | api-browser-origin | D6 |

### PR2 e2e (Playwright origin assertion)

| Test | File | Scenario |
|------|------|----------|
| `tienda` page issues `api/products` same-origin | catalog-origin | R1, R3 |
| `tienda` page issues `api/categories` same-origin | catalog-origin | R1, R3 |
| No page.route mocks used | catalog-origin | anti-pattern guard |

### Kept-green gate (must pass)

- `products-pagination.test.ts` (substring-only `toContain` assertions survive relative browser URLs in PR2)
- `api-security.test.ts` (same)
- `useProducts.test.ts`
- `src/app/__tests__/page.test.tsx`
- `src/app/tienda/__tests__/page.test.tsx`
- `src/app/tienda/[slug]/__tests__/page.test.tsx`
- All F2 unit tests (1106 baseline)

## AGENT.md Compliance Check

- **Screaming Architecture** — route handler under `src/app/api/`, helper under `src/lib/`. ✓
- **Atomic Design** — no new components. ✓
- **TypeScript interfaces** — route handler signature, request/response types, allowlist types. ✓
- **X-Trace-Id** — via `getTraceId(request)` from `src/lib/trace.ts`. ✓
- **Friendly error mapping** — `mapApiError` exported, mapped to Spanish. ✓
- **Vitest command** — `npx vitest run --maxWorkers=2` (already configured). ✓
- **Conventional commits** — no AI attribution. ✓

## Threat Matrix

All rows N/A — HTTP routing only, no shell/subprocess/VCS/PR automation surface touched. Proxy surface mitigated by fixed upstream path + env host + allowlist (D2).

## Risks + Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Broad `**/api/products*` e2e mocks mask origin regressions | Med | Tighten via Playwright `waitForRequest` origin assertion (R7) |
| `typeof window` detection fragile in edge runtimes | Low | Standard Next.js idiom; documented in code |
| Extra hop / double error mapping | Low | One canonical mapper server-side, `mapApiError` client safety net |
| PR sequencing coupling | Low | PR1 routes tested at handler level (not through `fetchApiFull`) |
| New `getApiBaseUrl` regresses server-side callers | Low | R6 + existing test gate (products-pagination substring assertions survive relative URLs) |
| Rollback | Very Low | PR1 revert = behavior-identical reversion (only adds routes + exports). PR2 revert = origin-aware added on top of stable routes |

## Out of Scope (Reaffirmation)

Backend CORS, media `uploads`, authenticated-proxy refactors, Cloudinary, catalog refactor, caching, ngrok docs, webhooks.

## Open Architectural Decisions

None remaining. Option A (raw allowlisted Strapi query forwarding) closes the last open decision.

## Size Estimate

- PR1: 267 lines (target 230-300) ✓ Low risk
- PR2: 132 lines (target 120-180) ✓ Low risk
- Both PRs merge to main sequentially via stacked-to-main chain strategy.
