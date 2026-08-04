# Proposal: Security Hardening Critical Fixes

## Intent

Close critical security debt surfaced by an adversarial review after merging PRs #54 and #56. The frontend currently exposes JWTs in localStorage, leaks auth credentials in logs, trusts user-controlled query parameters, lacks request tracing, and ships a weak CSP. This change hardens the attack surface without altering backend contracts.

## Scope

### In Scope
- Remove JWT from `localStorage` in `AuthContext`; migrate to scoped httpOnly secure cookie + `/api/auth/session` route.
- Remove `console.log` of auth objects in `Navbar` and raw password in `register()`.
- Validate JWT in `/api/orders` and match the `user` query param to prevent IDOR.
- Validate JWT is valid (not just present) in `/api/create-payment-intent`.
- Add `X-Trace-Id` header to all API fetch calls in `src/lib/api.ts` and route handlers.
- Replace raw HTTP errors in `api.ts` with friendly mapped messages.
- Fix `getProducts` double-fetch bug in `api.ts`.
- Remove production console.log leaks from `api.ts`, Stripe utilities, and route handlers.
- Harden CSP directives in `next.config.ts`.
- Stabilize unit tests so `npx vitest run --project=unit --maxWorkers=2` passes.

### Out of Scope
- New features or UI redesign.
- Backend Strapi changes; follow backend SSOT.
- Unrelated refactors.

## Capabilities

### New Capabilities
- `session-management`: server-side `/api/auth/session` route and AuthContext hydration from httpOnly cookie.
- `api-traceability`: `X-Trace-Id` generation and propagation across API clients and route handlers.
- `secure-route-authorization`: JWT validation in `/api/orders` and `/api/create-payment-intent`.

### Modified Capabilities
- `catalog-load-more`: pagination in `api.ts` must issue a single request and surface friendly errors.

## Approach

Adopt the confirmed approach B: store the Strapi JWT in a scoped httpOnly secure cookie, expose `/api/auth/session` to return the current user, and hydrate `AuthContext` from that route. Centralize `X-Trace-Id` and error mapping in `api.ts`. Add a small JWT validation helper for route handlers. Harden CSP directives incrementally, validating dev and production builds. Fix tests by removing localStorage dependencies and reclassifying the integration test caught by the unit glob.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/context/AuthContext.tsx` | Modified | Remove localStorage JWT; hydrate from `/api/auth/session`. |
| `src/app/components/Navbar.tsx` | Modified | Remove auth/JWT `console.log` leaks. |
| `src/lib/api.ts` | Modified | Single fetch, `X-Trace-Id`, friendly error mapping. |
| `src/app/api/auth/session/route.ts` | New | Returns current user from httpOnly cookie JWT. |
| `src/app/api/orders/route.ts` | Modified | Validate JWT and enforce user param match. |
| `src/app/api/create-payment-intent/route.ts` | Modified | Validate JWT signature/expiry, not just presence. |
| `next.config.ts` | Modified | Tighten CSP directives. |
| `vitest.config.ts` + unit tests | Modified | Stabilize unit suite. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| httpOnly cookie breaks SSR/hydration | Medium | Use server-side cookie parse and session route fallback. |
| Hardened CSP breaks Next.js runtime | Medium | Verify `next build` and `next dev` after each CSP change. |
| JWT validation breaks existing tests | High | Update tests to mock valid JWTs; isolate in PR #3. |
| Removing double-fetch changes loading UX | Low | Preserve existing loading and empty states. |

## Rollback Plan

Revert each chained PR individually with `git revert`. If the cookie/session route fails in production, temporarily restore localStorage hydration behind an environment flag while keeping route-level JWT validation.

## Dependencies

- Backend Strapi `users-permissions` JWT contract (backend SSOT).
- Vercel environment variables for cookie/session secrets.

## Success Criteria

- [ ] No JWT stored in `localStorage`.
- [ ] No auth, password, or state URLs logged in production builds.
- [ ] `/api/orders` and `/api/create-payment-intent` validate the JWT.
- [ ] All API fetch calls include `X-Trace-Id`.
- [ ] `getProducts` issues exactly one paginated request per call.
- [ ] `npx vitest run --project=unit --maxWorkers=2` passes.
- [ ] `next build` passes with hardened CSP.
