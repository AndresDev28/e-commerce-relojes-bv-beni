# Exploration: follow-ups/sprint-5-stripe-upsert/F3-cors-over-ngrok

## Current State

When the frontend is accessed via an ngrok HTTPS tunnel, the visitor's browser cannot reach the developer's `localhost:1337` (the local Strapi backend). Browser-side fetches to `http://localhost:1337/api/products` and `http://localhost:1337/api/categories` fail with CORS errors (which mask the primary reachability problem) and produce empty `tienda` data.

### Root cause

`src/lib/api.ts:53-199` builds absolute Strapi URLs from `NEXT_PUBLIC_STRAPI_API_URL`. Browser-side callers use those absolute URLs directly, bypassing the existing same-origin Next.js BFF that already serves auth, favorites, orders, and payment-intent routes via `/api/...`. `NEXT_PUBLIC_*` env vars are inlined into the browser bundle at build time; they cannot be swapped at runtime.

### Affected areas

| File | Behavior |
|------|----------|
| `src/lib/api.ts:53-101,130-199` | URL construction + catalog fetches; exported `fetchApiFull` |
| `src/features/catalog/hooks/useProducts.ts` | Browser-side products + load-more |
| `src/app/tienda/CatalogContent.tsx` | Browser-side categories |
| `src/lib/constants.ts:4` | Module-level `API_URL` |
| `src/lib/images/url.ts:22-31` | Image base fallback |
| `src/features/checkout/services/createPaymentIntentService.ts:62-67` | Server-side stock lookup |
| `src/lib/stripe/env-validator.ts:157-177,264` | Validation and safe summary |
| `src/app/api/orders/route.ts` | Existing same-origin proxy pattern to clone |
| `src/app/api/favorites/route.ts` | Another proxy example |
| `tests/e2e/mock-strapi-server.mjs:60-79` | CORS preflight documented |

### Same-origin proxy coverage today

Existing route handlers (parent cycle):
- Auth: `api/auth/login`, `api/auth/register`, `api/auth/session`
- Favorites: `api/favorites` GET, PUT
- Orders: `api/orders` GET, POST, by-id GET, cancellation, UPSERT PUT
- Payments: `api/create-payment-intent`
- Webhooks: `api/send-order-email`, `api/refund-order`

**Missing**: `api/products` and `api/categories`. Only two new public GET proxy surfaces needed.

### Server-side vs browser-side callers

**Server-side** (preserve as-is, use absolute Strapi URL):
- `src/app/page.tsx:19-30`
- `src/app/tienda/page.tsx:19-45`
- `src/app/tienda/[slug]/page.tsx:10-18`

**Browser-side** (need origin-aware relative routing in F3):
- `src/features/catalog/hooks/useProducts.ts:87-180`
- `src/app/tienda/CatalogContent.tsx:45-60`

### Test coverage today

Covered (existing tests, must stay green):
- URL/query construction: `src/lib/api/__tests__/products-pagination.test.ts:26`, `api-security.test.ts:27`
- Client pagination: `src/features/catalog/hooks/__tests__/useProducts.test.ts`
- Page tests: `src/app/__tests__/page.test.tsx`, `src/app/tienda/__tests__/page.test.tsx`, `src/app/tienda/[slug]/__tests__/page.test.tsx`

Missing (F3 must add):
- Proxy route unit tests
- Browser/server origin assertion
- Ngrok-or-HTTPS-tunnel coverage

Existing Playwright mocks use broad patterns such as `**/api/products*` and `**/api/categories*`; they match any origin and do not prove same-origin correctness.

### Backend SSOT (no changes needed)

Strapi's native catalog endpoints work as-is. No backend CORS, schema, or auth changes required for F3. Strapi stays on `localhost:1337`; the frontend dev tunnels via ngrok only.

## Approaches Evaluated

1. **Same-origin catalog BFF** (selected): add `api/products` and `api/categories` proxies; origin-aware `fetchApiFull` browser-relative. Pro: zero backend changes. Con: extra hop, two routes to maintain.
2. **Public HTTPS Strapi URL** (rejected): requires backend CORS allowlist + public Strapi deployment.
3. **ngrok `--host` documentation** (rejected): doesn't solve the underlying problem.
4. **Second ngrok tunnel for Strapi** (rejected): operational complexity outside frontend scope.

## Out of Scope

- Backend CORS / Strapi config
- Media `uploads` proxying or next/image changes
- Authenticated-proxy refactors
- Cloudinary migration
- Catalog pagination/sorting/types refactor
- Caching headers
- Ngrok configuration documentation
- Webhooks (already proxied)
