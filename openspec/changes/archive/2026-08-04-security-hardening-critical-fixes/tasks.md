# Tasks: Security Hardening Critical Fixes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 700–900 across all PRs |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (tracing/CSP) → PR 2 (auth) → PR 3a (session infra) → PR 3b (consumers) |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | X-Trace-Id, error map, single-fetch getProducts, log removal, CSP | PR 1 | No auth change; lowest risk |
| 2 | requireUser helper, JWT+IDOR in orders/payment routes (header-based) | PR 2 | Backward-compatible with current client |
| 3a | Cookie helpers, auth routes, AuthContext rewrite, vitest config | PR 3a | Session infrastructure; base for 3b |
| 3b | Route handlers → cookie, favorites proxy, drop jwtToken, consumer migration | PR 3b | Depends on 3a; largest slice |

## Phase 1: Tracing, Error Handling, Catalog, CSP (PR 1)

- [x] 1.1 Add `X-Trace-Id` generation and header injection to every fetch call in `src/lib/api.ts`
- [x] 1.2 Add friendly error mapping function in `src/lib/api.ts` replacing raw HTTP error text
- [x] 1.3 Fix `getProducts()` in `src/lib/api.ts` to issue exactly one paginated request with `sort[0]`/`sort[1]`
- [x] 1.4 Remove `console.log` leaks from `src/lib/api.ts` (Strapi URLs, state dumps)
- [x] 1.5 Remove auth/JWT `console.log` from `src/app/components/Navbar.tsx`
- [x] 1.6 Remove `console.log` leaks from `src/app/api/orders/route.ts` and `src/app/api/create-payment-intent/route.ts`
- [x] 1.7 Harden CSP in `next.config.ts`: conditionally remove `'unsafe-eval'` and localhost origins in production; keep `'unsafe-inline'` for style-src
- [x] 1.8 Write unit tests for `api.ts`: trace-id injection, error mapping, single-fetch getProducts

## Phase 2: Route Authorization (PR 2)

- [x] 2.1 Create `src/lib/auth/validate-request.ts` with `requireUser(request)` — reads Authorization header, validates JWT via Strapi `GET /api/users/me`
- [x] 2.2 Add JWT validation + IDOR check (`user` query param must match JWT user) in `src/app/api/orders/route.ts`
- [x] 2.3 Add `requireUser()` validation in `src/app/api/create-payment-intent/route.ts` (signature+expiry, not just presence)
- [x] 2.4 Write unit tests for `requireUser`: 401 missing, 401 expired, 200 valid, 403 IDOR mismatch
- [x] 2.5 Create `src/lib/trace.ts` with `getTraceId(request)` helper (read existing header or generate new); propagate `X-Trace-Id` to Strapi/Stripe and echo in response headers in `/api/orders` and `/api/create-payment-intent`

## Phase 3: Session Infrastructure (PR 3a)

- [x] 3.1 Create `src/lib/auth/session.ts` — `setSessionCookie`, `clearSessionCookie`, `readSessionJwt`, `SESSION_COOKIE` constant
  - Evidence: `src/lib/auth/session.ts` ships `SESSION_COOKIE = 'bv_session'` and the three cookie helpers (PR #58 merged on `main` as `834aab1`).
- [x] 3.2 Create `src/app/api/auth/login/route.ts` — proxy to Strapi `/auth/local`, set httpOnly cookie on success
  - Evidence: `src/app/api/auth/login/route.ts` proxies `POST /auth/local` and calls `setSessionCookie` on success (PR #58 `834aab1`).
- [x] 3.3 Create `src/app/api/auth/register/route.ts` — proxy to Strapi `/auth/local/register`, set cookie on success
  - Evidence: `src/app/api/auth/register/route.ts` proxies `POST /auth/local/register` and calls `setSessionCookie` on success (PR #58 `834aab1`).
- [x] 3.4 Create `src/app/api/auth/logout/route.ts` — clear session cookie
  - Evidence: `src/app/api/auth/logout/route.ts` calls `clearSessionCookie` and returns 204 (PR #58 `834aab1`).
- [x] 3.5 Create `src/app/api/auth/session/route.ts` — read cookie, call Strapi `/users/me`, return user or unauthenticated
  - Evidence: `src/app/api/auth/session/route.ts` reads the cookie via `readSessionJwt`, calls Strapi `/users/me`, and returns `{authenticated: false}` when no cookie (PR #58 `834aab1`).
- [x] 3.6 Rewrite `src/context/AuthContext.tsx`: remove localStorage JWT; hydrate from `/api/auth/session`; call auth routes
  - Evidence: `src/context/AuthContext.tsx` now hydrates from `/api/auth/session` and uses `/api/auth/login|register|logout`; localStorage JWT path removed (PR #58 `834aab1`).
- [x] 3.7 Update `vitest.config.ts`: exclude `**/*.integration.test.ts` from unit project glob
  - Evidence: `vitest.config.ts` unit project `include: ['src/**/__tests__/**/*.{test,spec}.{js,ts,tsx}']` paired with `exclude: ['**/*.integration.test.{ts,tsx}']` (PR #58 `834aab1`).
- [x] 3.8 Write unit tests for session.ts helpers, auth routes, and AuthContext hydration
  - Evidence: `src/lib/auth/__tests__/session.test.ts`, `src/app/api/auth/{login,register,logout,session}/__tests__/route.test.ts`, and `src/context/__tests__/AuthContext.test.tsx` ship as PR #58 `834aab1`.
- [x] 3.9 Propagate `X-Trace-Id` (via `getTraceId`) in all new auth routes: login, register, logout, session; echo in response headers
  - Evidence: every route under `src/app/api/auth/**/route.ts` calls `getTraceId(request)` and sets the response `X-Trace-Id` header (PR #58 `834aab1`).

## Phase 4: Consumer Migration (PR 3b)

- [x] 4.1 Switch `src/app/api/orders/route.ts` from Authorization header to cookie (use `readSessionJwt`); add POST handler for createOrder proxy
  - Evidence: `src/app/api/orders/route.ts` uses `readSessionJwt` and exposes GET/POST handlers backed by `getOrdersListService`/`createOrderService` (PR #58 `834aab1`).
- [x] 4.2 Switch `src/app/api/orders/[orderId]/route.ts` and `.../request-cancellation/route.ts` from header to cookie
  - Evidence: `src/app/api/orders/[orderId]/route.ts` and `src/app/api/orders/[orderId]/request-cancellation/route.ts` read the cookie via `readSessionJwt` instead of the Authorization header (PR #58 `834aab1`).
- [x] 4.3 Create `src/app/api/favorites/route.ts` — GET/PUT favorites proxy reading the cookie
  - Evidence: `src/app/api/favorites/route.ts` exposes GET/PUT and gates both via `requireUser` (PR #58 `834aab1`).
- [x] 4.4 Drop `jwtToken` param from `src/lib/api/orders.ts` `createOrder` and `getUserOrders`; call Next routes
  - Evidence: `src/lib/api/orders.ts` runtime helpers removed (type contracts kept); approved by `src/lib/api/__tests__/orders.public-api.test.ts` (3/3 GREEN). Landed on `frontend/security-hardening-critical-fixes-pr-4a-remove-legacy-jwt-orders` as commit `995a926` (refactor) preceded by `a961b0c` (legacy test artifacts).
- [x] 4.5 Update all consumer files referencing `jwt` from `useAuth()` — rely on cookie (check `src/features/orders/`, `src/features/checkout/`, `src/features/favorites/`)
  - Evidence: PR #58 `834aab1` removed every `jwtToken` reference in `src/features/orders/`, `src/features/checkout/`, and `src/features/favorites/`; consumers route through the `/api/*` Next handlers and `AuthContext` (cookie-based).
- [x] 4.6 Write unit tests for cookie-based route handlers and consumer migration
  - Evidence: PR #58 `834aab1` shipped cookie-based unit tests for `/api/orders/*`; PR4b adds favorites coverage — `src/features/favorites/services/__tests__/getFavoritesService.test.ts` (5/5 GREEN, commit `05cdcc6`), `src/features/favorites/services/__tests__/updateFavoritesService.test.ts` (8/8 GREEN, commit `ddccb44`), and `src/app/api/favorites/__tests__/route.test.ts` (10/10 GREEN, commit `3869542`).
- [x] 4.7 Propagate `X-Trace-Id` (via `getTraceId`) in `/api/orders/[orderId]`, `/api/orders/[orderId]/request-cancellation`, and `/api/favorites` routes; echo in response headers
  - Evidence: every branch of `src/app/api/orders/[orderId]/route.ts`, `src/app/api/orders/[orderId]/request-cancellation/route.ts`, and `src/app/api/favorites/route.ts` returns `X-Trace-Id` in the response headers via `getTraceId` (PR #58 `834aab1` for orders; PR4b covers `/api/favorites` via the tests committed at `3869542`).