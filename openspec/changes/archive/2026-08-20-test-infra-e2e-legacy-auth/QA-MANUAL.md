# Manual QA — TEST-INFRA-E2E-LEGACY-AUTH (F1)

**Change**: `test-infra-e2e-legacy-auth`
**Branch**: `frontend/TEST-INFRA-E2E-LEGACY-AUTH-modernize-auth-mocks`
**PR**: #111 (https://github.com/AndresDev28/e-commerce-relojes-bv-beni/pull/111)
**Date**: 2026-08-19
**Capability delta**: 0 (test-infra only)

---

## TL;DR — What was fixed

**14 e2e failure events → 0**, across **6 spec files** in `tests/e2e/`. The root cause was the same everywhere: specs mocked legacy `localStorage.setItem('jwt', token)` + `/api/users/me` (Strapi-direct auth), but the production app migrated to cookie-session `/api/auth/session`. One fix pattern closes all 14.

| Spec | Bucket | Events closed | Effort |
|---|---|---|---|
| `cancellation-flow.spec.ts` | A — pure swap | 2 | S |
| `empty-states.spec.ts` | A — pure swap (2 tests) | 4 | S |
| `order-tracking.spec.ts` | A — pure swap | 2 | S |
| `payment-errors.spec.ts` | A' — swap + test-2 unroute | 2 | S+ |
| `checkout-happy-path.spec.ts` | B — login-flow rewrite + cookie signal | 2 | M |
| `checkout-mobile.spec.ts` | B — login-flow rewrite + cookie signal | 2 | M |
| **TOTAL** | | **14** | |

---

## Prerequisites — Start the dev server

The Playwright `webServer` array (per `playwright.config.ts`) spawns `npm run dev` AND `node tests/e2e/mock-strapi-server.mjs` on `:1337` automatically when tests run. For **manual** QA you need them up too:

```bash
# Terminal 1: Strapi mock on :1337 — MOCK_STRAPI_PORT=1337 is REQUIRED.
# Without it, the mock defaults to :1338 (which CSP blocks). #1609 discovery.
MOCK_STRAPI_PORT=1337 node tests/e2e/mock-strapi-server.mjs > /tmp/mock-strapi.log 2>&1 &

# Terminal 2: Next.js dev on :3000
npm run dev
```

**Wait for both to be ready:**
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:1337/health` → `200`
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → `200` (NOT 500 — if 500, dev hasn't compiled yet)

**Important**: If `:3000` is already in use by a stale process, kill it: `lsof -ti:3000 | xargs -r kill -9`

### Troubleshooting mock startup

If the mock exits silently (returns to prompt without logging anything), it's almost certainly an `EADDRINUSE` failure because port `:1338` is in use. Two common causes:

1. **You forgot `MOCK_STRAPI_PORT=1337`** — the mock defaults to `:1338`. Always use the env var.
2. **A previous mock instance is lingering on `:1338`** — kill it: `lsof -ti:1338 | xargs -r kill -9`

Sanity checks:
```bash
lsof -ti:1337         # should show mock PID
curl http://localhost:1337/health   # should return 200
```

If the foreground log shows `Error: listen EADDRINUSE: address already in use :::1338`, the env var is missing OR a previous mock is still bound. Fix the env var first, then re-check.

---

## QA Scenarios

Each scenario has: pre-fix behavior, post-fix behavior, and how to verify.

### Scenario 1 — `cancellation-flow.spec.ts` (Bucket A — pure swap)

**Pre-fix**: Clicking "Cancel order" on `/mi-cuenta/pedidos/[id]` redirected to `/login` (session mock returned `null`).
**Post-fix**: Order cancellation flow runs end-to-end without auth redirect.

Manual steps:
1. Navigate to `/tienda` (home page) — should load
2. Sign in (any test user — the spec mocks the session)
3. Navigate to `/mi-cuenta/pedidos` (orders)
4. Open any pending order
5. Click "Cancel order"
6. **Expected**: Cancellation confirmation modal shows; confirm → success toast; order status updates to "cancelled"
7. **Bug check**: Should NOT redirect to `/login` at any step

### Scenario 2 — `empty-states.spec.ts` (Bucket A — pure swap, 2 tests)

**Pre-fix**: Empty cart / empty favorites pages redirected to `/login` instead of showing empty-state UI.
**Post-fix**: Empty states render correctly without auth redirect.

Manual steps (test 1 — empty cart):
1. Make sure cart is empty (visit `/carrito`, remove any items)
2. Navigate to `/carrito` with empty cart
3. **Expected**: Empty cart UI shows ("No tenés items en tu carrito" + CTA to `/tienda`)
4. **Bug check**: Should NOT redirect to `/login`

Manual steps (test 2 — empty favorites):
1. Make sure favorites are empty
2. Navigate to `/mi-cuenta/favoritos`
3. **Expected**: Empty favorites UI shows ("No tenés favoritos aún" + CTA)
4. **Bug check**: Should NOT redirect to `/login`

### Scenario 3 — `order-tracking.spec.ts` (Bucket A — pure swap)

**Pre-fix**: Order tracking page redirected to `/login`.
**Post-fix**: Order tracking renders normally.

Manual steps:
1. Sign in (any test user)
2. Navigate to `/mi-cuenta/pedidos/[id]/tracking` for any existing order
3. **Expected**: Order tracking UI shows (timeline, status, courier info)
4. **Bug check**: Should NOT redirect to `/login`

### Scenario 4 — `payment-errors.spec.ts` (Bucket A' — swap + test-2 unroute)

**Pre-fix**: Test 1 (payment fail) and test 2 (auth lost mid-flow) both redirected to `/login`.
**Post-fix**: Payment error shows correctly; auth-loss test confirms session can be lost mid-flow without crashing.

Manual steps (test 1 — payment error):
1. Sign in, add items to cart, go to checkout
2. Use a card number that will trigger a payment error (e.g., `4000 0000 0000 0002` — Stripe's "card declined" test card)
3. Submit payment
4. **Expected**: Payment error toast/UI shows; user stays on checkout
5. **Bug check**: Should NOT redirect to `/login`

Manual steps (test 2 — auth lost mid-flow, automated only):
- Hard to simulate manually; covered by the e2e test `payment-errors.spec.ts` test 2 which uses `page.unroute('**/api/auth/session')` to drop the session mock mid-test. Trust the e2e run for this.

### Scenario 5 — `checkout-happy-path.spec.ts` (Bucket B — login-flow rewrite + cookie signal)

**Pre-fix**: Login during checkout flow left session mock stale; subsequent `/api/auth/session` checks failed; cart redirect assertion broke.

**This is the design-deviation spec** — the post-login URL is `/carrito`, not `/mi-cuenta` (because DEBT-LOGIN-REDIRECT PR #110 honors `?redirect=%2Fcarrito`). The test assertion was corrected to match.

Manual steps:
1. Add items to cart
2. Go to `/checkout` (or click "Checkout" from `/carrito`)
3. Login form appears — fill in credentials
4. Submit login
5. **Expected**: Land on `/carrito` (NOT `/mi-cuenta`) — the `?redirect=` query param is honored
6. Continue checkout flow: address → shipping → payment
7. **Expected**: Checkout completes, redirects to `/checkout/gracias` or similar success page
8. **Bug check**: No `/login` redirect at any step; no redirect loop

### Scenario 6 — `checkout-mobile.spec.ts` (Bucket B — mobile viewport)

**Pre-fix**: Same as scenario 5 but on mobile viewport (375×667 typical).

Manual steps:
1. Open DevTools, switch to mobile viewport (iPhone SE / iPhone 12)
2. Repeat scenario 5
3. **Expected**: Same as scenario 5, mobile UI

---

## X-Bucket Specs — Intentionally NOT touched (sanity check)

These 2 specs currently pass with their legacy mocks (which are now INERT under cookie-session — the favorites feature uses `/api/auth/session` and ignores `/api/users/me → 401`). Per A2, they were left as-is. **Verify they still pass.**

| Spec | Status | What to verify |
|---|---|---|
| `favorites-auth-prompt-a11y.spec.ts` | NOT modified | Run the e2e test — should still pass |
| `favorites-anonymous-access.spec.ts` | NOT modified | Run the e2e test — should still pass |

Quick check:
```bash
npx playwright test tests/e2e/favorites-auth-prompt-a11y.spec.ts tests/e2e/favorites-anonymous-access.spec.ts --reporter=list
```
Expected: 2 specs pass (4 events total).

---

## Edge cases to look for during manual QA

1. **Cookie persistence across `page.goto()` hard navigations**:
   - Login in a flow → hard navigate to another page → session should persist
   - This was the bug that the A1-REFINED pattern (cookie-conditional session mock + Set-Cookie on login) fixes
   - Test by completing checkout, then navigating to `/mi-cuenta/pedidos` directly

2. **`?redirect=` query param**:
   - Visit `/login?redirect=%2Fcarrito` → login → should land on `/carrito`
   - Covered by `login-redirect.spec.ts` (which is in the modern pattern already)
   - Verify both `checkout-happy-path.spec.ts` AND `login-redirect.spec.ts` agree on the redirect target

3. **Logged-out access to auth-gated routes**:
   - Visit `/mi-cuenta/pedidos` without session mock → should redirect to `/login`
   - The X-bucket specs (`favorites-anonymous-access`) test this

4. **Cold dev server**:
   - If `npm run dev` is starting for the first time, give it ~5 seconds to compile
   - First `curl http://localhost:3000/` might return 500 — wait a moment and retry

---

## Verification commands (run after manual QA)

### E2E — should be 58 passed / 0 failed (no legacy-auth class failures)

```bash
npx playwright test --reporter=list 2>&1 | tee /tmp/test-infra-e2e-legacy-auth/qa-e2e.log
```

**Expected**:
- Total events: ~58 passed, ~0 failed (or 0–1 if uxw01 flake fires — out-of-scope)
- 0 failures from: `cancellation-flow`, `checkout-happy-path`, `checkout-mobile`, `empty-states`, `order-tracking`, `payment-errors`
- The 1 chrome-only uxw01 TC-15 flake (if present) is documented as separate followup `BUG-E2E-UXW01-CHROMIUM-FLAKE` — not chased

### Unit (vitest)

```bash
npx vitest run --maxWorkers=2 2>&1 | tee /tmp/test-infra-e2e-legacy-auth/qa-vitest.log
```

**Expected**: 969 passed / 9 skipped (vitest project's `integration` subset is skipped because no real Strapi backend is running — pre-existing environmental constraint, not caused by this change).

### Storybook

```bash
npx vitest run --maxWorkers=2 --project storybook 2>&1 | tee /tmp/test-infra-e2e-legacy-auth/qa-storybook.log
```

**Expected**: 20/20 passed.

### TypeScript

```bash
npx tsc --noEmit 2>&1 | tee /tmp/test-infra-e2e-legacy-auth/qa-tsc.log
```

**Expected**: exit 0, no errors.

### Lint

```bash
npm run lint 2>&1 | tee /tmp/test-infra-e2e-legacy-auth/qa-lint.log
```

**Expected**: exit 0, no errors.

### Capability delta (production code byte-identical)

```bash
git diff main -- ':!tests/e2e/'
```

**Expected**: empty output (no production code changes).

---

## Acceptance criteria checklist

- [ ] All 6 scenarios above pass manually in the browser
- [ ] X-bucket specs still pass (no regression)
- [ ] `npm run test:e2e` → 0 legacy-auth failures (was 14)
- [ ] `npx vitest run --maxWorkers=2` → 969 pass / 9 skipped
- [ ] `npx vitest run --maxWorkers=2 --project storybook` → 20/20
- [ ] `npx tsc --noEmit` → exit 0
- [ ] `npm run lint` → exit 0
- [ ] `git diff main -- ':!tests/e2e/'` → empty
- [ ] Verdict verify: **PASS** (not `pass_with_warnings`)

---

## Design deviations documented (for reviewer transparency)

1. **A1 was technically insufficient as the user specified it** (refined by sdd-design, accepted by user):
   - User specified "mock both `/api/auth/login` and `/api/auth/session`"
   - Design refined: login mock must emit `Set-Cookie` header, session mock must be conditional on `bv_session` cookie header (because `route.fulfill()` doesn't emit Set-Cookie by default, and `AuthContext.tsx` re-fetches session on every mount)
   - User explicitly accepted the refinement

2. **Post-login URL is `/carrito`, not `/mi-cuenta`** (caught by sdd-apply):
   - DEBT-LOGIN-REDIRECT (PR #110) added `?redirect=%2Fcarrito` handling
   - Both checkout specs asserted the pre-feature URL; sub-agent corrected tests to match current behavior
   - Capability delta stayed 0 (test fix only)

---

## Files changed

```
tests/e2e/cancellation-flow.spec.ts        (modified)
tests/e2e/empty-states.spec.ts             (modified)
tests/e2e/order-tracking.spec.ts           (modified)
tests/e2e/payment-errors.spec.ts           (modified)
tests/e2e/checkout-happy-path.spec.ts      (modified)
tests/e2e/checkout-mobile.spec.ts          (modified)
```

**Stats**: 55 insertions / 54 deletions across 6 files. ZERO production code touched.

**NOT touched** (X-bucket per A2):
```
tests/e2e/favorites-auth-prompt-a11y.spec.ts    (zero diff)
tests/e2e/favorites-anonymous-access.spec.ts    (zero diff)
```

---

## Next step after manual QA passes

When you've done the manual QA and the verification commands all pass, signal back and we'll launch `sdd-verify` for the formal verification phase (re-test against the PR branch and produce the verify-report).

If anything fails during QA, **stop and tell me what you saw** — don't try to fix it yourself, we'll triage via the orchestrator.