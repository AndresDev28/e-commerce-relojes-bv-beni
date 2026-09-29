# Design: F9 — Unauthenticated Visitor Redirect

**Change**: `follow-ups-sprint-5-stripe-upsert-f9-payment-errors-unauthenticated-redirect`
**Branch**: `frontend/F9-payment-errors-unauthenticated-redirect` (create from main @ 309818c)
**Artifact store**: engram · strict TDD · budget 400 lines · single PR
**Topic key**: `sdd/follow-ups/sprint-5-stripe-upsert/f9-payment-errors-unauthenticated-redirect/design`

---

## Technical Approach

F9 is a **declarative + test-only change**. The route-protection contract is already implemented in `src/app/checkout/page.tsx:65-77` and matches the requirement we are formalizing. Two work-unit commits on the same branch, in this order:

1. **Commit 1 — spec delta documentation only** (no functional change; triple gate stays green).
2. **Commit 2 — un-skip Test 2** (the change F4 deferred; small e2e test edit).

If RED surfaces on commit 2 (Playwright flake or real defect), a single bounded follow-up commit lands on the same branch. Total estimated diff: ≤ ~50 LOC, well under the 400-line review budget per the F8/4-cycle pattern.

### Why Declarative + Test-Only

- The `!user` redirect to `/login?redirect=<encoded pathname>` is already wired (`src/app/checkout/page.tsx:65-77`).
- F9's job is to convert the deferred test into a live CI gate AND to give the contract a first-class home in the spec. The two work-unit commits make that intent observable in git history.
- No app-code refactor needed for the happy path. If RED proves otherwise, TDD closes the loop in a third commit.

### Module Boundaries (Screaming Architecture Compliance)

- **`src/app/checkout/page.tsx`** — page-level route delivery; owns auth gate + cart-empty gate + payment-error surface. **No change** for the happy path. The page is the correct owner of route protection because it has the `useAuth()` and `useCart()` contexts in scope at mount.
- **`tests/e2e/payment-errors.spec.ts`** — e2e test owner. Test 2 un-skip is the only edit at L68.
- **`openspec/specs/checkout-error-display/spec.md`** — canonical spec; receives one ADDED requirement block.
- **`playwright.config.ts`** — possibly modified (+1 retries) if RED surfaces F5-class CI flake. Otherwise untouched.

### Affected Code: Pre and Post

#### `src/app/checkout/page.tsx` (lines 65-77) — **MOST LIKELY UNCHANGED**

Current behavior already satisfies the new requirement:

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

This effect already implements the contract described in S-UNAUTH.1..S-UNAUTH.4. F9 does not modify it. If RED on Test 2 proves a race, the smallest fix possible is allowed (e.g. replace `router.push` with `router.replace`, or flip the `authLoading || !isHydrated` guard to also wait for `useCart().isHydrated` explicitly).

#### `tests/e2e/payment-errors.spec.ts` (lines 20-24, 68-78) — one-character test gate flip

```diff
     // Hotfix (sprint-5-stripe-upsert): Test 2 below stays skipped — the
     // unauthenticated-redirect path is a separate ticket (F9 candidate, obs
     // #1808). Test 1 was re-enabled for F4 (friendly-error mapping) and now
     // asserts the page-level <ErrorMessage> shows the friendly Spanish copy
     // instead of the raw "Internal Server Error" text.
+    // F9: Test 2 re-enabled — assertion holds under the new
+    // "Unauthenticated Visitor Redirect" requirement added to
+    // openspec/specs/checkout-error-display/spec.md.

     test('Should show friendly Spanish copy when payment intent creation fails', ...) { ... }

-    test.skip('Should show error when authentication is missing in checkout', async ({ page }) => {
+    test('Should show error when authentication is missing in checkout', async ({ page }) => {
         await page.unroute('**/api/auth/session');
         await page.goto('/checkout');
         await expect(page).toHaveURL(/.*\/login/);
     });
```

The header comment at lines 20-24 is rewritten to reflect the new state. No assertion change.

If CI flake demands tightening (predicted scenario per F5 history):

```diff
     test('Should show error when authentication is missing in checkout', async ({ page }) => {
         await page.unroute('**/api/auth/session');
+        await page.goto('/checkout');
+        await page.waitForURL(/\/login/, { timeout: 15000 });
-        await page.goto('/checkout');
         await expect(page).toHaveURL(/.*\/login/);
     });
```

`waitForURL` is preferred over `expect(...).toHaveURL(...)` alone because Playwright's `toHaveURL` polls on the URL but `waitForURL` blocks until the navigation actually settles — more deterministic on cold `.next` compile in CI.

#### `openspec/specs/checkout-error-display/spec.md` — one ADDED requirement

The current spec has 5 numbered requirements. F9 adds a 6th (`Unauthenticated Visitor Redirect`) at the end of the `## Requirements` section, with 4 scenarios matching S-UNAUTH.1..S-UNAUTH.4.

#### `playwright.config.ts` — only if F5-class flake surfaces

```diff
     retries: process.env.CI ? 1 : 0,
+    retries: process.env.CI ? 2 : 0,
```

Documented in the apply-progress mirroring F5's `ci(e2e): reduce CI retries 2 to 1 based on first-CI-run baseline` pattern (reversed here). Only flipped if the FIRST CI run flakes; otherwise stays at 1.

## Test Strategy

### Pre-flight checks (local, before push)

1. `npx vitest run --maxWorkers=2` → must remain green (no change to unit tests).
2. `npx tsc --noEmit` → must remain green (no type changes).
3. `npm run build` → must remain green.
4. `npm run test:e2e -- payment-errors.spec.ts` → Test 1 + Test 2 both `passed`.
5. Full `npm run test:e2e` → must remain green; no other e2e breaks.

### Triple gate (CI-equivalent)

`npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build` → all green.

The `npm run test:e2e` job is already wired in `.github/workflows/ci.yml` via the F5 e2e triple gate. PR #153 (F9) will inherit that job.

### Bounded verification

- Structural readback of the two-file diff (`tests/e2e/payment-errors.spec.ts` + `openspec/specs/checkout-error-display/spec.md`) is the main verification surface.
- Code-level readback of `src/app/checkout/page.tsx:65-77` confirms the production code already matches the spec.
- If `playwright.config.ts` is bumped, structural readback of the one-line change is the verification; F5 already established the precedent.

## Tradeoffs Considered

### T1: Inline route gate vs. shared `<ProtectedRoute requireLogin>` HOC

**Chosen**: inline at `src/app/checkout/page.tsx:65-77` (no change).

**Why**: `src/components/ProtectedRoute.tsx` exists but redirects to `/`, not `/login?redirect=<path>`. Adopting it would require either changing its destination (and breaking `/tienda` semantics elsewhere) or wrapping it (extra ceremony for a 1-line guard that already exists). Inline keeps the destination-by-page contract explicit. The redirect destination is page-specific by design: checkout needs to come back to checkout after login; other gated routes may want different return paths.

**Tradeoff**: page-level guards are not reusable across `/checkout` and other gated routes. If a third gated page needs `/login?redirect=<path>` semantics, extract a `withLoginRedirect` HOC then. Not now.

### T2: `test.skip` -> `test` vs. `test.fixme` -> `test`

**Chosen**: `test.skip` -> `test` directly. `.skip` is the documented F4 deferral marker. Once Test 2 passes green, the marker should never reappear.

**Tradeoff**: `.fixme` would advertise known-broken, but F4 explicitly framed this as "deferred until a separate ticket lands" not "broken". `.skip` -> `.test()` is the right semantic.

### T3: No-op app code or defensive refactor

**Chosen**: no-op for the happy path. Strict TDD allows RED → GREEN → REFACTOR; if Test 2 passes green without any source edit, REFACTOR is unnecessary and skipping it is the right choice (KISS).

**Tradeoff**: If a defect exists, TDD-iterate is the path. A "let's also harden while we're here" PR grows scope without justification.

## Migration / Rollback

- **Migration**: none. The behavior is already in main. F9 just makes the test gate live and the contract explicit. No DB migration, no flag flip, no new env var.
- **Rollback**: `git revert <sha1> <sha2>` reverts both work-unit commits. App behavior is unchanged (the effect was already there); only the test gate and spec document disappear. Subsequent PRs can re-enable F9 trivially.

## Open Architectural Decisions

None. The route-protection contract is pre-resolved (existing page effect). The spec delta wording will be reviewed at sdd-tasks time against the canonical capability style.

## Chained-PR Handoff

Not applicable. Forecast diff is ≤ ~50 LOC, single PR. The F8 chained-PR pattern (`stacked-to-main`) is reserved for diffs that exceed the 400-line budget; F9 never approaches that.

## Out of Scope (refirmado)

- F4 spec drift (R1-R6).
- `withRetry` extraction to `src/lib/http/`.
- `ProtectedRoute` refactor.
- Backend `/api/auth/session` behavior changes.
- Login form changes.

