# Proposal: follow-ups/sprint-5-stripe-upsert/F3-cors-over-ngrok

## Intent

When developers or QA demo the BV Beni frontend over an ngrok HTTPS tunnel, the visitor's browser fetches products and categories from `http://localhost:1337` (the `NEXT_PUBLIC_STRAPI_API_URL` build-time value) — which the visitor's machine cannot reach. The result: empty `tienda` data with CORS errors that mask the reachability problem.

This proposal introduces **two same-origin Next.js proxy routes** (`GET /api/products` and `GET /api/categories`) and makes `fetchApiFull` **origin-aware**: browser context uses a relative base (`api/products`), server context uses the existing absolute `STRAPI_API_URL`. Browser catalog fetches stay same-origin; server-side callers (RSC, route handlers, services) are unchanged.

## Scope

### In Scope

- New route handler `src/app/api/products/route.ts` — GET, allowlist of Strapi query keys, trace propagation, friendly Spanish error mapping, `no-store` caching header.
- New route handler `src/app/api/categories/route.ts` — same pattern, simpler allowlist.
- `src/lib/api.ts` modification: export `mapApiError`, extract `getStrapiServerUrl()` helper, add `getApiBaseUrl()` origin-aware resolver.
- Unit tests for both route handlers (`src/app/api/products/__tests__/route.test.ts`, `src/app/api/categories/__tests__/route.test.ts`).
- Unit test for origin-aware `fetchApiFull` (`src/lib/api/__tests__/api-browser-origin.test.ts`).
- E2E test asserting browser catalog fetches stay same-origin (`tests/e2e/catalog-origin.spec.ts`).
- `.env.example` comment block distinguishing `NEXT_PUBLIC_STRAPI_API_URL` (build-time browser) from `STRAPI_API_URL` (server runtime).

### Out of Scope

- Backend CORS / Strapi config changes.
- Media `uploads` proxying or next/image changes (handled by existing CSP/image-allowlist).
- Authenticated-proxy refactors (orders, payments, auth already work).
- Cloudinary migration.
- Catalog pagination/sorting/types refactor (already in `catalog-load-more` spec).
- Caching headers on catalog responses (deferred).
- Ngrok documentation.
- Webhooks (already proxied).

## Capabilities

### New Capabilities

- `catalog-bff-proxy`: same-origin Next.js proxy routes for `api/products` and `api/categories`, browser-relative URL resolution in `fetchApiFull`, friendly Spanish error mapping, `X-Trace-Id` propagation.

### Modified Capabilities

- `catalog-load-more`: origin-aware base URL applied transparently; no behavior change to consumers.

## Approach

**Capability delta = 1 new + 1 modified** (frontend only).

**Server-side routes** clone the proven `api/orders/route.ts` pattern:
1. `getTraceId(request)` from `src/lib/trace.ts` (reuse-or-UUIDv4)
2. Forward allowlisted Strapi query keys to `${STRAPI_API_URL}/api/products?...`
3. Add `X-Trace-Id` upstream
4. Echo `X-Trace-Id` in response headers
5. Catch upstream errors → `mapApiError(status, statusText, body)` → 500 with friendly Spanish
6. Return Strapi's `{data, meta:{pagination}}` envelope unchanged
7. `no-store` cache header (mirrors current behavior)

**Origin-aware `fetchApiFull`**:
- `getApiBaseUrl()` returns `''` in browser (typeof window !== 'undefined'); returns `STRAPI_API_URL` chain in server context.
- Browser URL construction uses **string concatenation**, never `new URL(path, '')` (which throws on empty base).
- Query encoding parity preserved across both contexts.
- Zero call-site changes required — `getProducts`, `getProductBySlug`, `getCategories` all just work.

**Upstream URL construction** uses an allowlist of Strapi query keys. Unknown keys are dropped silently (no 400) — UX preference. Upstream status codes mirror Strapi exactly (Strapi 404 for missing slug surfaces as 404 to the client, not masked as 500).

## Affected Files

| File | Action |
|------|--------|
| `src/app/api/products/route.ts` | Create |
| `src/app/api/categories/route.ts` | Create |
| `src/lib/api.ts` | Modify — export `mapApiError`, extract `getStrapiServerUrl()`, add `getApiBaseUrl()` |
| `src/app/api/products/__tests__/route.test.ts` | Create |
| `src/app/api/categories/__tests__/route.test.ts` | Create |
| `src/lib/api/__tests__/api-browser-origin.test.ts` | Create |
| `tests/e2e/catalog-origin.spec.ts` | Create |
| `.env.example` | Modify |

## Delivery: Chained PRs (stacked-to-main)

User pre-approved chained PRs after the Review Workload Guard forecast exceeded 400 lines for a single PR:

- **PR1** — Server-side routes + tests + export `mapApiError`. ~267 lines. Standalone-green. Merges to main first.
- **PR2** — Client-side origin-aware routing + helper test + e2e origin assertion + env comment. ~132 lines. Depends on PR1's `mapApiError` export. Merges to main after PR1.

Chain strategy: `stacked-to-main`. Each PR is a separate, independently reviewable unit.

## Acceptance Criteria

1. With `NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1337` and frontend served over ngrok, `tienda` renders real products AND categories (not empty arrays), zero CORS/mixed-content errors in browser console.
2. Browser catalog fetches use relative `api/products` and `api/categories` (origin asserted via Playwright `waitForRequest`).
3. Server-side callers unchanged: `products-pagination`, `api-security`, page tests pass untouched.
4. `X-Trace-Id` (UUIDv4) propagates browser → proxy → Strapi; echoed in response headers.
5. Upstream failures surface friendly Spanish messages; raw `Internal Server Error` never reaches the DOM.
6. `npx vitest run --maxWorkers=2` + Playwright catalog suite green.
