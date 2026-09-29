## Exploration: F9 — payment-errors Test 2 (unauthenticated redirect)

**Change**: follow-ups-sprint-5-stripe-upsert-f9-payment-errors-unauthenticated-redirect · mode: engram · strict TDD active · budget: 400 lines · branch: frontend/F9-payment-errors-unauthenticated-redirect · topic key prefix sdd/follow-ups/sprint-5-stripe-upsert/f9-payment-errors-unauthenticated-redirect/

### Current State

`tests/e2e/payment-errors.spec.ts:68-78` has Test 2 explicitly skipped via `test.skip(...)`:

```typescript
test.skip('Should show error when authentication is missing in checkout', async ({ page }) => {
    await page.unroute('**/api/auth/session');
    await page.goto('/checkout');
    await expect(page).toHaveURL(/.*\/login/);
});
```

Header comment at lines 20-24 records the deferral: "the unauthenticated-redirect path is a separate ticket (F9 candidate, obs #1808)". F4 (#1901, #1895) explicitly listed Test 2 as out-of-scope.

**The behavior Test 2 expects is ALREADY IMPLEMENTED.** `src/app/checkout/page.tsx:65-71`:

```tsx
useEffect(() => {
    if (authLoading || !isHydrated) return
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(pathname))
      return
    }
    if (cartItems.length === 0 && !orderError && !orderInFlightRef.current) {
      router.push('/tienda')
      return
    }
}, [authLoading, user, cartItems, router, orderError, isHydrated, pathname])
```

The `!user` branch is checked BEFORE the empty-cart branch. An unauthenticated visitor always lands on `/login?redirect=…`, never `/tienda`. The redirect target already encodes the originating path correctly.

**Spec drift confirmed.** `openspec/specs/checkout-error-display/spec.md` (165 lines) contains 5 requirements: (1) Single Page-Level Payment Error Alert, (2) ErrorMessage Component Contract, (3) Trace ID Preservation, (4) Friendly Error Mapping for Stripe Codes (3 scenarios incl. S-MOD.8 from F8), (5) Order Upsert Retry Contract (S-RET.1..S-RET.7 from F8). **F4's six ADDED requirements (R1 Payment-Intent Friendly Mapper, R2 CheckoutForm Integration, R3 Public API Exposure, R4 Unit Coverage and No-Leak Guarantee, R5 onError Contract Preserved, R6 UPSERT Mapper Isolation) are NOT in the canonical spec.** F8 next-steps call this out correctly. F4's archive overstated "9 reqs (4 Slice B + 1 MODIFIED + 5 F4)" — only R5 was implicitly covered via R8 S-MOD.8. Out of scope for F9; do not conflate.

**Existing auth gate pattern in repo.** `src/components/ProtectedRoute.tsx` exists and redirects to `/` (NOT `/login`), uses a Spinner during loading. `checkout/page.tsx` does NOT use `ProtectedRoute`; it inlines its own gate with `/login?redirect=…` which matches Test 2's expectation. Other pages: `/favoritos` has no auth gate at all (renders empty state for unauthenticated users); `/mi-cuenta/pedidos` indirectly gates via OrderHistory. The checkout page's inline pattern is the right model for F9 — same idiom, no shared-component refactor required.

### Affected Areas

- tests/e2e/payment-errors.spec.ts:68-78 — Test 2 itself. Change: test.skip -> test(...). Possibly tighten the assertion with an explicit waitForLoadState or waitForURL if Playwright's polling misses the redirect.
- src/app/checkout/page.tsx:65-77 — auth redirect effect. MAY need zero changes (already correct) or MAY need a small race-fix if F9 RED surfaces a flake.
- openspec/specs/checkout-error-display/spec.md — out of scope for F9 (see Spec drift confirmed above). Do NOT bundle F4 reconciliation here.
- src/features/checkout/hooks/useCreateOrder.ts:66-71 — has a defensive if(!user) branch. Comment says "The page already redirects unauthenticated visitors, so this is a defensive edge." Stays untouched; the e2e test exercises the page-level gate, not this defensive catch.

### Approaches

1. **Minimal un-skip.** Remove the `.skip` from Test 2. Run it locally + in CI. If it passes, ship. If it fails, iterate with TDD (RED test -> fix the gate or tighten the assertion -> GREEN).
   - Pros: Smallest possible diff (1-3 LOC). Exactly the change F4 deferred. Single PR, no chain.
   - Cons: If Playwright timing or auth-hydration race surfaces, may need a second micro-iteration. Acceptable under strict TDD.
   - Effort: Low.

2. **Un-skip + add explicit waitForURL before toHaveURL.** Same as #1 but pre-emptively tighten the assertion so a single redirect on slow CI does not flake.
   - Pros: Slightly more durable against CI flake (per F5 history, retries were tuned 2->1 over multiple runs).
   - Cons: Asserts a behavior already implicit in `toHaveURL` polling.
   - Effort: Low.

3. **Replace test.skip with test.fixme and ship the ticket out of CI.**
   - Pros: None operationally.
   - Cons: Defeats the point of "re-enable". Rejected by F4's deferral language.
   - Effort: Trivial (but useless).

### Recommendation

Approach 1 — minimal un-skip. The redirect behavior is already implemented and matches what Test 2 asserts. F9's job is to convert the deferred test into a live gate; the smallest change that achieves that is the cleanest one. If RED surfaces a flake, the strict-TDD loop (RED -> GREEN) for the gate or the assertion will land as a follow-up commit on the same branch — still under the 400-line budget. No spec changes required for F9 itself.

Why over the alternatives: Approach 2 pre-empts a flake we have not observed. Approach 3 is a non-fix. Approach 1 is the smallest change that converts a known deferred risk into CI coverage.

### Risks

- **Playwright timing flake** in CI under load (parallel jobs, cold .next compile). Mitigation: bump playwright.config.ts retries from 1 to 2 if the first CI run flakes; document the bump in apply-progress like F5 did.
- **AuthContext hydration race** — hydrateSession is fetch('/api/auth/session'); if the test's unroute happens AFTER the page already mounted but BEFORE the fetch resolves, the page may render one frame with stale (user=undefined, isLoading=true). The effect's `if (authLoading || !isHydrated) return` guard handles it. Low risk.
- **localStorage cart leftover** from prior Playwright runs could trip the second redirect (!cartItems.length) — but the !user branch is checked FIRST at line 68, so unauthenticated wins. No contention.
- **Spec drift scope creep temptation** — F4 spec reconciliation does not belong in F9. Keep it separate (matches F8 next-steps).

### Review Workload Forecast

Estimated changed lines: 1-3 if Test 2 passes green; 5-15 if a tight follow-up is needed.
400-line budget risk: Low.
Chained PRs recommended: No (single PR).
Decision needed before apply: No.

### Ready for Proposal

YES. Forward to sdd-propose with scope: re-enable tests/e2e/payment-errors.spec.ts:68-78 (Test 2) by removing .skip, run, iterate via strict-TDD only if RED fails. No openspec/ file writes for this change. No spec drift reconciliation in this change.
