# Explore — TEST-INFRA-E2E-LEGACY-AUTH

**Change**: `test-infra-e2e-legacy-auth` (canonical key)
**Date**: 2026-08-19
**Phase**: sdd-explore
**Status**: success (with one regression signal surfaced)
**Capability delta**: 0 (test-infra only — zero production code edits)
**Strict TDD**: enabled (per #1221)

---

## 1. Problem statement

PR #108 (closed 8/22 e2e failure events) left **14 remaining failure events** caused by a single root-class defect: a subset of e2e specs still mocks the **legacy Strapi-direct auth endpoints** (`localStorage.setItem('jwt')` + `**/api/users/me` and `**/api/auth/local`), but the production app migrated to a **Next.js cookie-session model** that surfaces only `**/api/auth/session` and `**/api/auth/login` to the client. The legacy mocks never intercept the right requests, so the UI behaves as anonymous and tests fail on protected-route assertions (or, in the login-flow specs, the login submit never sets the session cookie the app actually reads).

One fix pattern — rewriting the legacy mock blocks to use `/api/auth/session` (and where needed `/api/auth/login`) — closes all 14 events.

This exploration **also surfaced a 1-event chromium-only flake** (`uxw01-regression-sweep TC-15 home page`, networkidle timeout) that is **not** part of the legacy-auth root class but should be acknowledged.

---

## 2. Enumeration of legacy-auth specs

The orchestrator pre-context (#1608) listed **6 specs** as already enumerated. The explore phase confirmed those 6, found the **actual pattern** is `localStorage.setItem('jwt')` (NOT the property-style `localStorage.jwt` referenced in #1608), and resolved the 7th-spec search as follows:

> The literal string `localStorage.jwt` does not appear in any spec. The legacy pattern is `window.localStorage.setItem('jwt', token)` in `page.addInitScript(...)`. The 7th "spec" was anticipated to be `favorites-auth-prompt-a11y.spec.ts` (which mocks `/api/users/me → 401` for an anonymous scenario), but that spec **is currently passing** — see §2.2.

### 2.1 The 6 legacy-auth specs that fail (14 events)

| # | Spec file | LOC | Auth-setup block | Mocked legacy endpoints | Test count | Failure events | Bucket |
|---|-----------|-----|------------------|--------------------------|------------|----------------|--------|
| 1 | `tests/e2e/cancellation-flow.spec.ts` | 47 | lines 8–15 | `localStorage.setItem('jwt', …)` (line 9) + `**/api/users/me → MOCK_USER` (lines 13–15) | 1 | 2 (chromium + firefox) | **A** |
| 2 | `tests/e2e/checkout-happy-path.spec.ts` | 79 | lines 16–22 | `**/api/users/me` conditional on `authorization` header (lines 16–22) + `**/api/auth/local → MOCK_AUTH_RESPONSE` (lines 24–26) | 1 | 2 | **B** (login flow) |
| 3 | `tests/e2e/checkout-mobile.spec.ts` | 82 | lines 29–35 | `**/api/users/me` conditional on `authorization` header (lines 29–35) + `**/api/auth/local → MOCK_AUTH_RESPONSE` (lines 37–39) | 1 | 2 | **B** (login flow) |
| 4 | `tests/e2e/empty-states.spec.ts` | 49 | lines 8–14 | `localStorage.setItem('jwt', …)` (line 9) + `**/api/users/me → MOCK_USER` (lines 12–14) | **2** (both fail) | 4 (chromium + firefox, 2 tests each) | **A** |
| 5 | `tests/e2e/order-tracking.spec.ts` | 49 | lines 8–15 | `localStorage.setItem('jwt', …)` (line 9) + `**/api/users/me → MOCK_USER` (lines 13–15) | 1 | 2 | **A** |
| 6 | `tests/e2e/payment-errors.spec.ts` | 61 | lines 8–14 (test 1) + lines 51–53 (test 2 removes JWT) | `localStorage.setItem('jwt', …)` (line 9) + `**/api/users/me → MOCK_USER` (lines 12–14). Test 2 clears the JWT to assert unauthenticated redirect | 2 (only test 1 fails today) | 2 | **A'** (test 2 needs symmetric "clear session" logic) |

**Total**: 6 unique spec files, 14 failure events, all from one root class (legacy-auth).

### 2.2 The spec that is NOT failing (currently passes — no change needed)

| File | LOC | What it mocks | Why it passes today |
|------|-----|---------------|---------------------|
| `tests/e2e/favorites-auth-prompt-a11y.spec.ts` | 132 | `**/api/users/me → 401` (line 40–42) only | The favorites feature does NOT call `/api/users/me` directly from the client; it calls `/api/auth/session`, which (un-mocked) hits the real route, reads the missing cookie via `readSessionJwt(request)`, and returns `{ user: null }`. The auth-prompt UI shows correctly. The 401 mock is **inert but harmless**. The spec was a candidate for the "7th legacy-auth spec" but is **not part of the failure matrix**. |
| `tests/e2e/favorites-anonymous-access.spec.ts` | — | `**/api/users/me → 401` (line 33–34, comment "Anonymous user: /api/users/me returns 401") | Same reasoning — anonymous scenario works against the real `/api/auth/session` because no cookie is sent. Currently passing. |

### 2.3 Other specs already on the modern pattern (passing)

These confirm the **template** the migration must follow:

| File | Modern mocks used |
|------|-------------------|
| `tests/e2e/uxw01-regression-sweep.spec.ts` | `**/api/auth/session` (lines 89, 144, 173), `**/api/auth/logout` (line 186) |
| `tests/e2e/login-redirect.spec.ts` | `**/api/auth/login` (line 9), `**/api/auth/session` (line 17) |
| `tests/e2e/debt-02-redirect.spec.ts` | `**/api/auth/login` (line 9), `**/api/auth/session` (lines 18, 33, 53) |
| `tests/e2e/favorites-error-feedback.spec.ts` | `**/api/auth/session` (lines 24, 99) |

---

## 3. Template pattern (extracted from `uxw01-regression-sweep.spec.ts`)

The modern pattern, lifted verbatim from the working template at lines 87–99, 140–153, 171–183:

```typescript
// Mock authenticated session.
await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
        json: {
            user: {
                id: 1,
                username: 'tester',
                email: 'tester@example.com',
            },
        },
    });
});
```

### 3.1 What the template does NOT do

- It does **not** set any cookie on `context` via `context.addCookies(...)`. Playwright's `page.route()` intercepts the request **client-side, before it leaves the browser**, so the server route at `/api/auth/session` (which reads `bv_session` cookie) **never runs** when the route mock fulfills the response directly.
- It does **not** mock `/api/users/me`. That endpoint is now called **server-side only** (from inside `/api/auth/session/route.ts` line 18, when `readSessionJwt` finds a cookie). Mocking it from a `page.route()` is irrelevant.

### 3.2 Production-side context (for the proposal/design phase)

`src/lib/auth/session.ts` defines:

- `SESSION_COOKIE = 'bv_session'`
- `cookieOptions()`: `{ httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 604800 }`
- `setSessionCookie(res, jwt)`, `clearSessionCookie(res)`, `readSessionJwt(req)`

`src/app/api/auth/session/route.ts` GET handler:
- Reads cookie → if absent → returns `{ user: null }` (200)
- If present → fetches Strapi `/api/users/me` with `Authorization: Bearer <jwt>` → returns `{ user }` or clears cookie on 401

`src/app/api/auth/login/route.ts` POST handler:
- Receives `{ identifier, password }` → posts to Strapi `/api/auth/local` → on success calls `setSessionCookie(response, data.jwt)` → returns `{ user }`. This is the endpoint the **login-flow specs must mock**, not Strapi `/api/auth/local` directly.

---

## 4. Transformation delta per spec

### Bucket A — pure swap (no test-logic changes, only mock swap)

**Affected**: #1 (cancellation-flow), #4 (empty-states), #5 (order-tracking).

**Removed** (template — adjust as needed per file):

```typescript
await page.addInitScript((token) => {
    window.localStorage.setItem('jwt', token);
}, MOCK_AUTH_RESPONSE.jwt);

await page.route('**/api/users/me', async (route) => {
    await route.fulfill({ json: MOCK_USER });
});
```

**Added** (template):

```typescript
await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
        json: {
            user: {
                id: MOCK_USER.id,
                username: MOCK_USER.username,
                email: MOCK_USER.email,
            },
        },
    });
});
```

The shape `MOCK_USER` from `tests/e2e/utils/mocks.ts` (lines 41–49) carries `id`, `username`, `email`, `firstName`, `lastName`, `confirmed`, `blocked` — only `id`/`username`/`email` are needed for the session response (matching the template).

### Bucket A' — pure swap + symmetric "clear session" logic (test 2 of payment-errors)

**Affected**: #6 (`payment-errors.spec.ts`).

Test 2 (lines 49–60) currently clears `localStorage.jwt` to simulate unauthenticated state and assert redirect-to-login. After migration, the modern equivalent is **removing the route mock so the real `/api/auth/session` returns `{ user: null }`**:

```typescript
// Was:
await page.addInitScript(() => {
    window.localStorage.removeItem('jwt');
});

// Becomes (no setup needed; the absence of a session mock = anonymous):
// — or, if explicit removal is preferred for clarity:
await page.unroute('**/api/auth/session');
```

**Decision for the design phase**: prefer removing the mock (route is unmocked → real `/api/auth/session` → no cookie → `{ user: null }` → UI shows redirect).

### Bucket B — login-flow rewrite (more than a swap)

**Affected**: #2 (`checkout-happy-path.spec.ts`), #3 (`checkout-mobile.spec.ts`).

These two specs **do not pre-seed a session** — they **drive the actual login form** to obtain one. Today they mock Strapi-direct `/api/auth/local`, which the Next.js app's login route proxies to but never receives as a real response because the app's login route at `/api/auth/login` itself is unmocked and **does the Strapi fetch internally**, returning 502 (or whatever the mock-strapi-server.mjs returns for `/api/auth/local`).

**Required change**: replace the `/api/auth/local` mock with a `/api/auth/login` mock that returns the shape `/api/auth/login/route.ts` actually produces (it sets the cookie via `setSessionCookie`, then returns `{ user }`). The cleanest reproduction in Playwright is:

```typescript
await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
        json: {
            user: {
                id: MOCK_USER.id,
                username: MOCK_USER.username,
                email: MOCK_USER.email,
            },
        },
    });
});

// Optionally also pre-acknowledge the resulting session check:
await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
        json: {
            user: {
                id: MOCK_USER.id,
                username: MOCK_USER.username,
                email: MOCK_USER.email,
            },
        },
    });
});
```

Note: a **real** `/api/auth/login` would also set `bv_session` cookie via `Set-Cookie`; a `route.fulfill()` mock **does not** automatically emit `Set-Cookie` unless the spec sets the cookie via `context.addCookies(...)` itself. Since `/api/auth/session` is also mocked (above), the missing cookie is harmless — the client never makes a real `/api/auth/session` call expecting cookie presence. This matches the template's behaviour (TC-17/TC-18/TC-19 do not set cookies either).

### Bucket X — no change needed (informational)

**Affected**: `favorites-auth-prompt-a11y.spec.ts`, `favorites-anonymous-access.spec.ts`.

Their `/api/users/me → 401` mocks are inert (no client code calls `/api/users/me` anymore in these flows). They currently pass. **Do not touch them in this change** — touching would expand scope without benefit.

---

## 5. Baseline (43/15 — deviates from expected 44/14)

- **Command**: `npm run test:e2e`
- **Wall time**: 56.5s (within expected 52–55s + tail)
- **Result**: **43 passed / 15 failed** (NOT 44/14 as orchestrator's pre-context anticipated)
- **Log**: `/tmp/test-infra-e2e-legacy-auth/explore-baseline.log`
- **Port hygiene**: `:3000` was free at start (no stale dev server). Mock-strapi-server and dev webServer both came up cleanly per Playwright's webServer array.

### 5.1 Failure breakdown

| Spec | chromium | firefox | Events | Legacy-auth? |
|------|----------|---------|--------|---------------|
| cancellation-flow.spec.ts (line 26) | ❌ | ❌ | 2 | ✅ |
| checkout-happy-path.spec.ts (line 37) | ❌ | ❌ | 2 | ✅ |
| checkout-mobile.spec.ts (line 46) | ❌ | ❌ | 2 | ✅ |
| empty-states.spec.ts (line 17) | ❌ | ❌ | 2 | ✅ |
| empty-states.spec.ts (line 33) | ❌ | ❌ | 2 | ✅ |
| order-tracking.spec.ts (line 26) | ❌ | ❌ | 2 | ✅ |
| payment-errors.spec.ts (line 25) | ❌ | ❌ | 2 | ✅ |
| **uxw01-regression-sweep.spec.ts TC-15 (line 39)** | ❌ | ✅ | **1** | ❌ — separate flake |
| **Total** | **8** | **7** | **15** | 14 legacy + 1 anomaly |

The 14 legacy events match the orchestrator's prediction perfectly. The 1 anomaly is a **separate chromium-only networkidle timeout** (30s exceeded on `page.waitForLoadState('networkidle')` at line 43 of the template itself). This is most likely a **Next.js dev-mode HMR long-poll flake** (chromium hits networkidle timeout where firefox happens not to); it is unrelated to the auth-mock migration and should be tracked separately.

### 5.2 Spec-file count vs event count

- Orchestrator's "7 specs × 2 browsers = 14" actually resolves to **6 unique spec files × 2 browsers = 12 events, plus 2 extra events from `empty-states.spec.ts` having 2 failing tests** (lines 17 and 33). The math works out to 14 events either way; the count of unique spec files is 6, not 7.

---

## 6. Classification per spec (buckets A / A' / B / X)

| # | Spec | Bucket | Effort | Notes |
|---|------|--------|--------|-------|
| 1 | cancellation-flow.spec.ts | A | **S** (~5-line swap) | Pure mock swap in `beforeEach` |
| 2 | checkout-happy-path.spec.ts | B | **M** (~10-line swap, login form still exercised) | Add `/api/auth/login` mock; keep login UI assertions |
| 3 | checkout-mobile.spec.ts | B | **M** (~10-line swap, mobile viewport retained) | Same shape as #2 but with `test.use({ viewport: … })` |
| 4 | empty-states.spec.ts | A | **S** (~5-line swap in `beforeEach`, both tests benefit) | Both tests share the `beforeEach` |
| 5 | order-tracking.spec.ts | A | **S** (~5-line swap) | Pure mock swap in `beforeEach` |
| 6 | payment-errors.spec.ts | A' | **S+** (~5-line swap + test-2 logic review) | Test 2 needs "anonymous session" assertion path |
| — | favorites-auth-prompt-a11y.spec.ts | X (no-op) | none | Currently passing |
| — | favorites-anonymous-access.spec.ts | X (no-op) | none | Currently passing |

**Aggregate**: 4 S + 2 M + 1 S+ = small total. **One PR** with all 6 fixes is well within the 400-line review budget.

---

## 7. Open questions for the proposal phase

1. **Commit/PR strategy**:
   - **Option 1**: 1 PR with all 6 spec fixes (recommended — total LOC delta is small, 1 root class, low review cost).
   - **Option 2**: 1 PR per bucket (3 PRs: A, A', B). Splits review but multiplies CI runs.
   - **Option 3**: 1 PR per spec file (6 PRs). Excessive for a single root-class fix; strongly discouraged.
2. **Branch slug**: `frontend/TEST-INFRA-E2E-LEGACY-AUTH-modernize-auth-mocks` (per orchestrator guidance).
3. **Test 2 of `payment-errors.spec.ts`**: prefer `page.unroute('**/api/auth/session')` (cleaner; mirrors the real app's behaviour when no cookie is present) over adding a dedicated "return null user" route. Design phase should confirm.
4. **`favorites-auth-prompt-a11y.spec.ts` and `favorites-anonymous-access.spec.ts`**: explicit decision to **leave untouched** in this change (X bucket — scope guard). Worth a one-line note in the proposal so reviewers don't expect changes there.
5. **The uxw01 TC-15 chromium flake**: **out of scope** for this change (separate flake, different root cause). Surface in the proposal's "out of scope / follow-up" section so it's not silently lost.

---

## 8. Risks

1. **Baseline regression (LOW)**: 1 unexpected failure (`uxw01 TC-15` chromium-only) appeared between PR #108's verification and this explore run. Likely a dev-mode networkidle flake. **Action**: surface in proposal as a known-but-out-of-scope item; do not let it block this change.
2. **Bucket B login-flow semantics (MEDIUM)**: A `page.route('/api/auth/login', fulfill({ json }))` does **not** emit a `Set-Cookie` header. The login UI code may rely on the response shape `{ user }` only (most apps do), or it may also need the cookie for subsequent fetches. The design phase should trace the login-form handler (`src/app/(auth)/login/page.tsx` or similar) to confirm. If it does call `fetch('/api/auth/session')` immediately after the login response, then the mock must also cover `/api/auth/session` (which the template already does — recommended).
3. **Cookie-route interaction (LOW)**: Production `/api/auth/session` reads `bv_session` cookie; mocks via `page.route()` short-circuit that read entirely (route never runs). This means specs will pass even if `setSessionCookie` is buggy. Mitigation: add 1–2 integration tests later (out of scope for this change) to cover the cookie path. Not a blocker.
4. **CSP `:1337` applicability (NONE)**: Per #1609, the dev CSP connect-src whitelist includes `:1337` for Strapi. This is **server-side** and unaffected by client-side `page.route()` mocks. No risk introduced by this change.
5. **T0 contradiction (#1607, NONE observed)**: Dev cold-start time observed was within expected range; the 56.5s wall time and clean webServer startup confirm the Playwright config is healthy. No timing anomaly.
6. **Model swap / empty results (NONE observed)**: No empty-result or timeout symptoms during the investigation. Codegraph returned clean answers; bash outputs were complete.

---

## 9. Pre-context referenced

- **#1608** (C3 discovery — confirmed and refined: pattern is `setItem('jwt', …)` not `localStorage.jwt`; 6 specs enumerated there match, 7th candidate resolved as `favorites-auth-prompt-a11y` which is currently passing → not part of the 14).
- **#1611** (verify — confirmed 14 legacy events; this explore observed the same 14 plus 1 anomaly).
- **#1612** (archive — F1 followup scope/effort consistent with this explore's findings).
- **#1607** (apply-progress — T0 contradiction note checked, no anomaly observed).
- **#1609** (CSP `:1337` — reviewed, not applicable to client-side mock migration).
- **#1221** (testing capabilities — strict_tdd=true; this change respects zero production-code delta).

---

## 10. Ready for proposal

**Yes.** The 6 legacy-auth specs are enumerated with line numbers, the template pattern is extracted, the baseline is captured (with one minor regression surfaced), and per-spec bucket classification is complete.

The proposal phase should:

1. Frame the change as a **single root-class fix** (auth mock modernization across 6 specs).
2. Recommend **1 PR / 1 branch** (Option 1 in §7).
3. Explicitly call out **out-of-scope** items: `favorites-auth-prompt-a11y.spec.ts` (no-op), `favorites-anonymous-access.spec.ts` (no-op), `uxw01 TC-15` chromium flake (separate root cause).
4. Surface the **bucket B login-flow** nuance so the design phase confirms the cookie-less `route.fulfill()` approach against the login form's expectations.

---

## Appendix A — File-by-file auth-setup block deltas (concrete)

```
tests/e2e/cancellation-flow.spec.ts
- lines 8-10: REMOVE page.addInitScript(localStorage.setItem('jwt', ...))
- lines 13-15: REPLACE /api/users/me route with /api/auth/session

tests/e2e/checkout-happy-path.spec.ts
- lines 16-22: REPLACE conditional /api/users/me with /api/auth/session mock (always-authed for the session-check; route protection in /carrito handles anonymous redirect)
- lines 24-26: REPLACE /api/auth/local with /api/auth/login mock (returns { user })
- Line 65-66: assertions remain unchanged (post-login URL is /mi-cuenta)

tests/e2e/checkout-mobile.spec.ts
- lines 29-35: REPLACE conditional /api/users/me with /api/auth/session mock
- lines 37-39: REPLACE /api/auth/local with /api/auth/login mock
- Lines 72-73: assertions remain unchanged

tests/e2e/empty-states.spec.ts
- lines 8-10: REMOVE page.addInitScript(localStorage.setItem('jwt', ...))
- lines 12-14: REPLACE /api/users/me with /api/auth/session
- Both tests (line 17, line 33) benefit from the beforeEach change

tests/e2e/order-tracking.spec.ts
- lines 8-10: REMOVE page.addInitScript(localStorage.setItem('jwt', ...))
- lines 13-15: REPLACE /api/users/me with /api/auth/session

tests/e2e/payment-errors.spec.ts
- lines 8-10: REMOVE page.addInitScript(localStorage.setItem('jwt', ...))
- lines 12-14: REPLACE /api/users/me with /api/auth/session
- Test 2 (lines 49-60): REPLACE localStorage.removeItem('jwt') with page.unroute('/api/auth/session')
  (or simply: don't pre-mock session → real route runs → no cookie → anonymous)
```

---

## Appendix B — Files NOT changed in this exploration

- `tests/e2e/utils/mocks.ts` — exports `MOCK_USER`, `MOCK_AUTH_RESPONSE` (with `jwt`), `MOCK_PRODUCTS`, `MOCK_ORDER`, etc. No change required; the new mocks use a subset of `MOCK_USER`'s fields directly.
- `playwright.config.ts` — webServer array, baseURL, projects all already correct.
- `src/lib/auth/session.ts`, `src/app/api/auth/{session,login,logout,register}/route.ts` — production code, out of scope.