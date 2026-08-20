# Design: Test-Infra E2E — Modernize Legacy Auth Mocks (Cookie-Session)

## Technical Approach

Migrate 6 Playwright specs from legacy Strapi-direct auth (`localStorage.setItem('jwt', …)` + `/api/users/me` + `/api/auth/local`) to cookie-session (`/api/auth/session` + `/api/auth/login`). Capability delta = 0. Template: `uxw01-regression-sweep.spec.ts` L87–99, 140–153, 171–183. TDD T0→T2→T3→T4 per #1607. One PR, ~30 LOC, 3 work-unit commits squashed.

## Architecture Decisions

| Decision | Tradeoff | Choice |
|---|---|---|
| Single mock template | Bespoke drifts | Adopt uxw01 template verbatim for A/A' |
| Bucket B session mock | Always-MOCK_USER → initial `/api/auth/session` on `/tienda` returns MOCK_USER → user "logged in" → cart never redirects to `/login` → breaks `toHaveURL(/\/(carrito\|login)/)` at L52 | **Conditional on `bv_session` cookie** (mirrors real route) |
| Bucket B login mock | `fulfill({ json })` alone → cookie never appears → post-login session check returns `{ user: null }` | **Emit `Set-Cookie: bv_session=mock-jwt; Path=/; HttpOnly; SameSite=Lax`** |
| Bucket A' test 2 anonymous | `clearCookies()` redundant when no mock sets one | **`page.unroute('**/api/auth/session')`** |
| TDD steps | T1 dry-run is friction, not a git step | T0→T2→T3→T4 |
| Commit granularity | 1 mega commit hides state | **3 work-unit commits** (T0 doc, T2 GREEN-A, T3 GREEN-A'+B+SWEEP), squashed |
| payment-errors test 2 cleanup | `localStorage` removal is dead post-migration | Unroute only |

## Data Flow

**Bucket A** (already-authenticated):

```
page.route(/api/auth/session) → fulfill { user: MOCK_USER }
page.goto(/mi-cuenta/pedidos/ORD-12345)
  → AuthProvider mounts → fetch /api/auth/session → setUser(MOCK_USER) → renders
```

**Bucket B** (login-form exercised):

```
mocks: POST /api/auth/login   → fulfill { headers: { Set-Cookie: bv_session=mock-jwt;… }, json: { user: MOCK_USER } }
        GET  /api/auth/session → cookie has bv_session= → { user: MOCK_USER }
                                  else                    → { user: null }

page.goto(/tienda) → session → no cookie → { user: null } → cart redirects to /login
page.click(Iniciar sesión) → POST /api/auth/login → Set-Cookie emitted → setUser(MOCK_USER) → router.push(/mi-cuenta)
page.goto(/carrito) [hard nav] → AuthProvider re-mounts → session → cookie present → { user: MOCK_USER } → renders
```

Hard-nav re-mount is pivotal: `AuthContext.tsx` L41–63 re-hydrates via `fetch('/api/auth/session')` on every `AuthProvider` mount. Cookie is the only signal that survives a hard navigation.

## File Changes

| File | Action | Description |
|---|---|---|
| `tests/e2e/cancellation-flow.spec.ts` | Modify | L8–15: drop `addInitScript(jwt)` + `/api/users/me`; add `/api/auth/session` returning `{ user: MOCK_USER }` |
| `tests/e2e/empty-states.spec.ts` | Modify | L8–14: same swap |
| `tests/e2e/order-tracking.spec.ts` | Modify | L8–15: same swap |
| `tests/e2e/payment-errors.spec.ts` | Modify | beforeEach: same swap. Test 2 L49–60: drop `addInitScript(localStorage.removeItem)`, add `await page.unroute('**/api/auth/session')` |
| `tests/e2e/checkout-happy-path.spec.ts` | Modify | L16–26: replace `/api/users/me` (conditional auth header) + `/api/auth/local` with `/api/auth/session` (conditional on cookie) + `/api/auth/login` (with Set-Cookie) |
| `tests/e2e/checkout-mobile.spec.ts` | Modify | L29–39: same swap |
| `tests/e2e/favorites-auth-prompt-a11y.spec.ts` | **N/A** (A2) | Inert mocks left as-is |
| `tests/e2e/favorites-anonymous-access.spec.ts` | **N/A** (A2) | Inert mocks left as-is |

Imports change: drop `MOCK_AUTH_RESPONSE` from all 6 specs; keep `MOCK_USER` (and `MOCK_PRODUCTS` for checkout specs).

## Bucket-by-Bucket Transformation

**Bucket A** (`cancellation-flow`, `empty-states`, `order-tracking`) — `beforeEach`:

```typescript
// REMOVE
await page.addInitScript((token) => { window.localStorage.setItem('jwt', token); }, MOCK_AUTH_RESPONSE.jwt);
await page.route('**/api/users/me', async (route) => { await route.fulfill({ json: MOCK_USER }); });
// ADD
await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({ json: { user: MOCK_USER } });
});
```

**Bucket A'** (`payment-errors`) — test 2 L49–60:

```typescript
// REMOVE: await page.addInitScript(() => { window.localStorage.removeItem('jwt'); });
// ADD:    await page.unroute('**/api/auth/session');
```

**Bucket B** (`checkout-happy-path`, `checkout-mobile`) — `beforeEach`:

```typescript
// REMOVE: /api/users/me (conditional on auth header) + /api/auth/local mocks
// ADD
await page.route('**/api/auth/session', async (route) => {
    const cookie = route.request().headers()['cookie'] || '';
    if (cookie.includes('bv_session=')) {
        await route.fulfill({ json: { user: MOCK_USER } });
    } else {
        await route.fulfill({ json: { user: null } });
    }
});
await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
        status: 200,
        headers: { 'Set-Cookie': 'bv_session=mock-jwt; Path=/; HttpOnly; SameSite=Lax' },
        json: { user: MOCK_USER },
    });
});
```

## TDD Cadence (T0 → T2 → T3 → T4, #1607 pattern)

| Step | Goal | Pre-conditions | Acceptance | Commit |
|---|---|---|---|---|
| **T0 RED** | Confirm 14 legacy-auth events fail | `:3000` free; webServer up (`npm run dev` + `mock-strapi-server.mjs` on :1337); `curl http://localhost:3000/` returns 200 (warm-up gate, #1607) | `npm run test:e2e` → 43/15 (14 legacy + 1 chromium-flake) | `chore(test): capture T0 RED baseline` (logs + memo, no edit) |
| **T2 GREEN-A** | 3 Bucket A specs → 8 events close | T0 confirmed | `npm run test:e2e` → 6 fewer failures (43/9) | `fix(test): modernize auth mocks in bucket A specs` |
| **T3 GREEN-A'+B** | 1 A' + 2 B specs → all 14 close | T2 green | 0 legacy-auth failures (43/0 or 43/1 if flake) | `fix(test): modernize auth mocks in checkout + payment-errors specs (cookie-session)` |
| **T4 SWEEP** | Full quality gate | T3 green | Vitest 949/949, storybook 20/20, `tsc --noEmit` 0, `lint` 0, `git diff main -- :!tests/e2e/` empty | `chore(verify): full quality gate passes` (no-op edit) |

**Critical T0 gate (#1607)**: dev-up is REQUIRED for the 43/15 baseline. Without webServer, the signal collapses to 36/22 and the issue is masked.

Squash-merge to 1 per A4: `fix(test): modernize auth mocks in legacy specs (cookie-session)`.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| E2E (target) | 14 legacy-auth events close | `npm run test:e2e` → 43/15 → 43/0 |
| Unit / Integration | Vitest untouched | `npx vitest run --maxWorkers=2` → 949/949 |
| Storybook | Untouched | `npx vitest run --maxWorkers=2 --project storybook` → 20/20 |
| Typecheck | No new types | `npx tsc --noEmit` → 0 |
| Lint | No new patterns | `npm run lint` → 0 |
| Capability delta | Production byte-identical | `git diff main -- 'src/' 'next.config.*' 'middleware.*' 'package.json'` empty |

## Threat Matrix

`N/A — no production routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. page.route() is Playwright client-side test interception, not production routing.`

## Migration / Rollout

No migration. Single squash-merge PR. Rollback: `git revert <merge-commit>` (test-infra only, byte-identical production).

## Open Questions

None. All resolved via A1–A4 plus the conditional-cookie pattern confirmed by reading `AuthContext.tsx` L41–63 (session re-hydration on AuthProvider re-mount is the cause of the hard-nav re-fetch).
