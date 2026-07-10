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

- [ ] 3.1 Create `src/lib/auth/session.ts` — `setSessionCookie`, `clearSessionCookie`, `readSessionJwt`, `SESSION_COOKIE` constant
- [ ] 3.2 Create `src/app/api/auth/login/route.ts` — proxy to Strapi `/auth/local`, set httpOnly cookie on success
- [ ] 3.3 Create `src/app/api/auth/register/route.ts` — proxy to Strapi `/auth/local/register`, set cookie on success
- [ ] 3.4 Create `src/app/api/auth/logout/route.ts` — clear session cookie
- [ ] 3.5 Create `src/app/api/auth/session/route.ts` — read cookie, call Strapi `/users/me`, return user or unauthenticated
- [ ] 3.6 Rewrite `src/context/AuthContext.tsx`: remove localStorage JWT; hydrate from `/api/auth/session`; call auth routes
- [ ] 3.7 Update `vitest.config.ts`: exclude `**/*.integration.test.ts` from unit project glob
- [ ] 3.8 Write unit tests for session.ts helpers, auth routes, and AuthContext hydration
- [ ] 3.9 Propagate `X-Trace-Id` (via `getTraceId`) in all new auth routes: login, register, logout, session; echo in response headers

## Phase 4: Consumer Migration (PR 3b)

- [ ] 4.1 Switch `src/app/api/orders/route.ts` from Authorization header to cookie (use `readSessionJwt`); add POST handler for createOrder proxy
- [ ] 4.2 Switch `src/app/api/orders/[orderId]/route.ts` and `.../request-cancellation/route.ts` from header to cookie
- [ ] 4.3 Create `src/app/api/favorites/route.ts` — GET/PUT favorites proxy reading the cookie
- [ ] 4.4 Drop `jwtToken` param from `src/lib/api/orders.ts` `createOrder` and `getUserOrders`; call Next routes
- [ ] 4.5 Update all consumer files referencing `jwt` from `useAuth()` — rely on cookie (check `src/features/orders/`, `src/features/checkout/`, `src/features/favorites/`)
- [ ] 4.6 Write unit tests for cookie-based route handlers and consumer migration
- [ ] 4.7 Propagate `X-Trace-Id` (via `getTraceId`) in `/api/orders/[orderId]`, `/api/orders/[orderId]/request-cancellation`, and `/api/favorites` routes; echo in response headers
