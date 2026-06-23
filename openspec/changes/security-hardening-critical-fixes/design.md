# Design: Security Hardening Critical Fixes

## Technical Approach

Migrate the Strapi JWT from `localStorage` to a scoped httpOnly cookie. The client never holds the JWT: login/register/logout run through server-side auth routes that set/clear the cookie; `AuthContext` hydrates from `GET /api/auth/session`. All authenticated client calls go through Next.js route handlers, which read the cookie and forward `Authorization: Bearer` to Strapi. Route handlers validate the JWT by delegating to Strapi `GET /api/users/me` (the proven pattern in `orders/[orderId]/route.ts`), which also yields `user.id` for IDOR enforcement. `X-Trace-Id` generation and friendly error mapping are centralized in `src/lib/api.ts`; route handlers propagate the trace id to Strapi/Stripe and echo it in response headers.

## Architecture Decisions

### Decision: JWT validation strategy
**Choice**: Delegated validation via Strapi `GET /api/users/me` (cookie JWT → Bearer to Strapi).
**Alternatives**: Local verification with `jose` using the Strapi `JWT_SECRET`.
**Rationale**: Reuses the established pattern in `orders/[orderId]/route.ts`; returns the authenticated `user.id` needed for IDOR in one call; avoids shipping the Strapi signing secret to frontend env and adding a dependency. The extra network call is acceptable — route handlers already call Strapi.

### Decision: Cookie mechanics
**Choice**: `httpOnly; secure=(NODE_ENV==='production'); sameSite=lax; path=/; maxAge` aligned to the Strapi JWT lifetime. Set via `Set-Cookie` in auth-route `NextResponse`.
**Alternatives**: `sameSite=strict`; `secure=true` unconditionally.
**Rationale**: `lax` permits top-level navigations while mitigating CSRF; gating `secure` on env avoids breaking `http://localhost` dev; httpOnly satisfies the "JS cannot read cookie" requirement (session-management spec).

### Decision: Server-side auth routes
**Choice**: Add `POST /api/auth/{login,register,logout}` and `GET /api/auth/session`. `AuthContext` calls these; the JWT is never returned to the client.
**Alternatives**: Set the cookie from client `document.cookie` (impossible for httpOnly); keep returning the JWT to the client (defeats the change).
**Rationale**: Only a server response can set an httpOnly cookie — these routes are mandatory infrastructure for approach B.

### Decision: No direct client→Strapi authenticated calls
**Choice**: Proxy the remaining direct callers (`lib/api/orders.ts` `createOrder`/`getUserOrders`, `FavoritesContext`) through Next.js route handlers.
**Alternatives**: Leave favorites/orders direct (breaks on cookie migration; re-introduces the credential-exposure risk this change removes).
**Rationale**: Any surviving authenticated client→Strapi call would force the client to hold the JWT, nullifying the httpOnly cookie. The cookie must be the only credential path.

### Decision: CSP hardening
**Choice**: Environment-conditional CSP: production removes `'unsafe-eval'` and `http://127.0.0.1/localhost` from `script-src/connect-src/img-src`; keeps `'unsafe-inline'` for `style-src` (Tailwind). Dev keeps the current relaxed policy.
**Alternatives**: Full nonce-based `script-src` now.
**Rationale**: Removing `unsafe-eval` + localhost origins is immediate, build-safe, and high-value. Nonce-based inline-script removal is complex in Next 15 and is deferred (open question).

## Data Flow

    Browser ──login──▶ POST /api/auth/login ──▶ Strapi /auth/local
       │                       │ Set-Cookie httpOnly ◀── JWT
       │                       ▼ returns user (no JWT)
    AuthContext ◀── GET /api/auth/session ── cookie ──▶ Strapi /users/me ──▶ user
       │
    Component ──▶ /api/orders (cookie auto-sent) ── read cookie ──▶ Strapi /orders (Bearer)
                                   │ IDOR: user.id == query.user ? else 403
                                   ▼ response + X-Trace-Id header

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/auth/{login,register,logout,session}/route.ts` | Create | Set/clear/read httpOnly cookie; validate via Strapi; return user, never the JWT. |
| `src/lib/auth/session.ts` | Create | `setSessionCookie`, `clearSessionCookie`, `readSessionJwt`, `SESSION_COOKIE`. |
| `src/lib/auth/validate-request.ts` | Create | `requireUser(request)` — reads cookie, calls Strapi `/users/me`, returns user or 401. |
| `src/context/AuthContext.tsx` | Modify | Remove localStorage + `jwt` from public API; hydrate from `/api/auth/session`; call auth routes. |
| `src/app/components/Navbar.tsx` | Modify | Remove `console.log` of cart/auth state. |
| `src/lib/api.ts` | Modify | `X-Trace-Id` gen+header, friendly error map, single-fetch `getProducts`, remove logs. |
| `src/app/api/orders/route.ts` | Modify | Read cookie, `requireUser`, IDOR `user`-param check, trace id, friendly errors; add POST (createOrder proxy). |
| `src/app/api/orders/[orderId]/route.ts`, `request-cancellation/route.ts` | Modify | Read cookie instead of Authorization header; trace id. |
| `src/app/api/create-payment-intent/route.ts` | Modify | `requireUser` (signature/expiry via Strapi, not just presence); trace id; remove logs. |
| `src/app/api/favorites/route.ts` | Create | GET/PUT favorites proxy reading the cookie. |
| `src/lib/api/orders.ts` | Modify | `createOrder`/`getUserOrders` drop `jwtToken` param; call Next routes. |
| `src/features/{orders,checkout,favorites}/**` consumers | Modify | Drop `jwt`/Authorization header usage; rely on cookie. |
| `next.config.ts` | Modify | Environment-conditional hardened CSP. |
| `vitest.config.ts` + unit tests | Modify | Exclude `*.integration.test.ts` from unit glob; replace `localStorage.getItem('jwt')` mocks with `/api/auth/session` mocks; cookie-based route tests. |

## Interfaces / Contracts

```ts
// src/lib/auth/session.ts
export const SESSION_COOKIE = 'bv_session'
export function setSessionCookie(res: NextResponse, jwt: string): void
export function clearSessionCookie(res: NextResponse): void
export function readSessionJwt(request: NextRequest): string | null

// src/lib/auth/validate-request.ts
export async function requireUser(request: NextRequest): Promise<
  { user: AuthUser } | { error: NextResponse }
>
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `session.ts` cookie helpers; `requireUser` (mock Strapi `/users/me`); `api.ts` trace-id + error mapping; `getProducts` single fetch | `--project=unit --maxWorkers=2`; mock `fetch`. |
| Unit | Route handlers: 401 missing cookie, 401 expired, 403 IDOR, 200 owner, trace-id echo | Mock Strapi; `NextRequest` with cookie. |
| Integration | `orders.integration.test.ts` reclassify out of unit glob (real Strapi) | Exclude `**/*.integration.test.ts`; relocate to `test/integration/` or env-skip. |
| E2E | login → orders → checkout with httpOnly cookie | Playwright against dev build. |

## Migration / Rollout

3 chained PRs (confirmed):
1. **Tracing/errors/catalog/logs/CSP** — `api.ts` trace id + error map + single fetch, log removal across Navbar/routes, `next.config.ts` CSP. No auth change; lowest risk.
2. **Route authorization** — `requireUser` helper; validate JWT + IDOR in `/api/orders` and `/api/create-payment-intent` (still header-based, backward compatible with the current client).
3. **Session migration** — auth routes + cookie, `AuthContext` rewrite, consumer migration, cookie-based route handlers, favorites/orders proxy, test reclassification.

Revert per-PR via `git revert`. Env-flag fallback to localStorage hydration only if cookie/session fails in production (per proposal rollback).

## Open Questions

- [ ] Nonce-based `script-src` CSP (remove `'unsafe-inline'` for scripts) — deferred; needs Next 15 nonce-middleware design.
- [ ] Strapi JWT lifetime value for cookie `maxAge` — confirm against backend SSOT default.
- [ ] PR #3 likely exceeds the 400-line review budget — `sdd-tasks` should forecast a sub-split (session infra vs. consumer migration).
