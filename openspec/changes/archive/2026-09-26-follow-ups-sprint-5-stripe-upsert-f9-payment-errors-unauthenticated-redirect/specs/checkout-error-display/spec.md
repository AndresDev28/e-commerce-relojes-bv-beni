# Spec Delta: F9 — Unauthenticated Visitor Redirect

**Change**: `follow-ups-sprint-5-stripe-upsert-f9-payment-errors-unauthenticated-redirect`
**Branch**: `frontend/F9-payment-errors-unauthenticated-redirect` (create from main)
**Artifact store**: engram (per session preflight)
**Mode**: interactive · strict TDD · budget 400 lines · single PR
**Topic key**: `sdd/follow-ups/sprint-5-stripe-upsert/f9-payment-errors-unauthenticated-redirect/spec`

---

## Purpose

Capture the route-protection contract that `tests/e2e/payment-errors.spec.ts` Test 2 already asserts (deferred by F4). F9 un-skips Test 2 in code AND adds this requirement to the canonical `openspec/specs/checkout-error-display/spec.md` so future specs and refactors can reference it as a first-class contract rather than a comment in `src/app/checkout/page.tsx:65-71`.

## Baseline

`openspec/specs/checkout-error-display/spec.md` (165 lines, **5 requirements**):
1. Single Page-Level Payment Error Alert
2. ErrorMessage Component Contract
3. Trace ID Preservation Through Error Path
4. Friendly Error Mapping for Stripe Codes (incl. S-MOD.8 from F8)
5. Order Upsert Retry Contract (incl. S-RET.1..S-RET.7 from F8)

All 5 unchanged by this delta. NO MODIFIED requirements.

## ADDED Requirements

### Requirement: Unauthenticated Visitor Redirect

When an unauthenticated visitor navigates to `/checkout`, the page MUST redirect them to `/login?redirect=<encoded current path>` before any checkout UI renders. The redirect contract MUST hold:

- The redirect fires only after `useAuth().hydrateSession()` resolves (`!isLoading`) and after cart hydration (`isHydrated`).
- The unauthenticated branch wins over the empty-cart branch when both conditions are true (`!user` is evaluated BEFORE `cartItems.length === 0` at `src/app/checkout/page.tsx:65-77`).
- The redirect target preserves the originating path via `encodeURIComponent(pathname)` so the login form can return the visitor to `/checkout` after successful authentication.
- When the visitor is authenticated but has no items in their cart, the existing empty-cart redirect to `/tienda` continues to apply (no regression).
- When the visitor is authenticated with an order-creation PUT in-flight (F7 race guard), the empty-cart bounce MUST NOT fire — the `orderInFlightRef` keeps the CheckoutForm mounted until the PUT resolves.

Test 2 of `tests/e2e/payment-errors.spec.ts` asserts this requirement end-to-end via the Playwright browser.

#### Scenario: S-UNAUTH.1 — Direct navigation to /checkout as guest redirects to /login

- GIVEN an unauthenticated visitor (no `bv_session` cookie; `/api/auth/session` returns `{ user: null }`) navigates directly to `/checkout`
- WHEN `useAuth.hydrateSession()` resolves with `{user: null}` and `isHydrated` flips true
- THEN the page MUST call `router.push('/login?redirect=' + encodeURIComponent(pathname))` BEFORE rendering any `<CheckoutForm>` or Stripe `<Elements>` UI
- AND the visitor's final URL MUST match `/login?redirect=%2Fcheckout`

#### Scenario: S-UNAUTH.2 — Guest with empty cart still bounces to /login (not /tienda)

- GIVEN an unauthenticated visitor with no items in their cart
- WHEN `useAuth.hydrateSession()` resolves
- THEN the redirect MUST target `/login?redirect=...`, NOT `/tienda`
- AND the `!user` branch MUST be evaluated BEFORE the empty-cart branch in the page's redirect effect

#### Scenario: S-UNAUTH.3 — Authenticated visitor with empty cart bounces to /tienda

- GIVEN an authenticated visitor with no items in their cart and no in-flight order
- WHEN the page resolves
- THEN the redirect MUST target `/tienda`, not `/login`
- AND the page MUST NOT render CheckoutForm

#### Scenario: S-UNAUTH.4 — In-flight order prevents empty-cart bounce during PUT

- GIVEN an authenticated visitor with no items in their cart AND an order-creation PUT in-flight (`orderInFlightRef.current === true` per F7 race guard)
- WHEN the page resolves
- THEN the empty-cart redirect MUST NOT fire
- AND the page MUST keep rendering `<CheckoutForm>` until the PUT resolves
- AND the F7 race guard contract is preserved (F8's `useCreateOrder` retry semantics remain untouched)

## Out of Scope

- F4 spec drift — six ADDED requirements (R1 Payment-Intent Friendly Mapper, R2 CheckoutForm Integration, R3 Public API Exposure, R4 Unit Coverage and No-Leak Guarantee, R5 onError Contract Preserved, R6 UPSERT Mapper Isolation) remain missing from canonical `checkout-error-display/spec.md`. F9 only adds ONE new requirement. F4 reconciliation is a separate change (tracked per #1937 next-steps).
- `withRetry` extraction to `src/lib/http/withRetry.ts` — deferred.
- `src/components/ProtectedRoute.tsx` refactor — wrong destination (`/` instead of `/login`); not aligned with the inline pattern.
- Backend `/api/auth/session` behavior — backend SSOT lives at `../e-commerce-relojes-bv-beni-api/` and is out of F9's frontend-only scope.
- Login form behavior — the existing `/login` route group already supports `?redirect=<encoded path>` via `LoginForm`; F9 does not modify it.

## Acceptance Criteria

1. AC1: `tests/e2e/payment-errors.spec.ts` Test 2 reports `passed` (not `skipped`) under `npm run test:e2e`.
2. AC2: Test 1 (F4's friendly-error mapping) remains passing.
3. AC3: Triple gate stays green: `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build`.
4. AC4: Canonical `openspec/specs/checkout-error-display/spec.md` includes the new requirement `Unauthenticated Visitor Redirect` under `## Requirements`, alongside the existing 5 requirements.
5. AC5: Single PR `frontend/F9-payment-errors-unauthenticated-redirect` merged to `main` with diff ≤ ~50 LOC (spec delta + test change combined, well under the 400-line budget).
6. AC6: No regression to F7/F8 invariants: `useCreateOrder` retry semantics (S-RET.1..S-RET.7), defensive catch (S-MOD.8), and confirmation redirect race guard (F7) all unchanged.

## Cross-References

- F4 (`follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping`, #1901 archived) — Test 1 was enabled there; Test 2 was deferred as F9 candidate.
- F7 (`follow-ups-sprint-5-stripe-upsert-f7-confirmation-redirect-regression`, archived) — provided the `orderInFlightRef` pattern referenced in S-UNAUTH.4.
- F8 (`follow-ups-sprint-5-stripe-upsert-f8-use-create-order-resilience`, #1937 archived) — provided the retry contract for `useCreateOrder`; referenced in S-UNAUTH.4 for the in-flight guard.
- Observation #1940 (Exploration): established that the route-protection effect at `src/app/checkout/page.tsx:65-77` already implements this contract and no app-code change is required for the happy path.
- Observation #1941 (Proposal, amended): locked the test+spec delta decision.
