# Proposal: TEST-INFRA-E2E-LEGACY-AUTH

## Intent

Close the 14 remaining e2e failure events from the just-archived `TEST-INFRA-E2E` cycle (#1612). Six e2e specs mock legacy `window.localStorage.setItem('jwt', token)` + `**/api/users/me` patterns from a pre-cookie-session auth era, but the production app migrated to cookie-session `/api/auth/session`. The 14 events share one root cause (class C3 per #1608) — masked under C1 baseURL until #1611's verify surfaced them as `pass_with_warnings`. One fix pattern closes all 14.

## Scope

### In Scope

Modernize 6 specs using `tests/e2e/uxw01-regression-sweep.spec.ts` (lines 87–99, 140–153, 171–183) as the modern template:

- `tests/e2e/cancellation-flow.spec.ts` (Bucket A — pure mock swap)
- `tests/e2e/empty-states.spec.ts` (Bucket A — pure mock swap, 2 tests)
- `tests/e2e/order-tracking.spec.ts` (Bucket A — pure mock swap)
- `tests/e2e/payment-errors.spec.ts` (Bucket A' — swap + test-2 unroute session)
- `tests/e2e/checkout-happy-path.spec.ts` (Bucket B — login-flow rewrite)
- `tests/e2e/checkout-mobile.spec.ts` (Bucket B — login-flow rewrite)

### Out of Scope

- `favorites-auth-prompt-a11y.spec.ts`, `favorites-anonymous-access.spec.ts` — currently passing; `/api/users/me` mocks are inert under cookie-session model (A2, intentionally left as-is)
- uxw01 TC-15 chromium networkidle flake — separate root cause, named followup `BUG-E2E-UXW01-CHROMIUM-FLAKE` (A3)
- Production code changes (capability delta = 0)
- SUG-2/SUG-3, BUG-IMAGES-NO-TEST, mock filter support, prettier hygiene, integration suite (carry from #1612)
- Sprint 4: BUG-CART-PERSISTENCE, BUG-FAVORITES-400, BUG-IMAGES-400

## Capabilities

### New Capabilities
None

### Modified Capabilities
None

This change is test-infra only — capability delta = 0; production code byte-identical.

## Approach

ONE PR with 6 spec edits (~30 LOC net, well within 400-line budget). For Bucket B specs, mock BOTH `/api/auth/login` AND `/api/auth/session` simultaneously — login `route.fulfill({ json })` does NOT emit `Set-Cookie`, so the post-login session check needs its own mock.

Branch: `frontend/TEST-INFRA-E2E-LEGACY-AUTH-modernize-auth-mocks`. Conventional commit `fix(test): modernize auth mocks in legacy specs (cookie-session)`. Squash merge to main. No AI co-author tags.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tests/e2e/cancellation-flow.spec.ts` | Modified | Bucket A — pure swap |
| `tests/e2e/empty-states.spec.ts` | Modified | Bucket A — pure swap (2 tests) |
| `tests/e2e/order-tracking.spec.ts` | Modified | Bucket A — pure swap |
| `tests/e2e/payment-errors.spec.ts` | Modified | Bucket A' — swap + test-2 `page.unroute('**/api/auth/session')` |
| `tests/e2e/checkout-happy-path.spec.ts` | Modified | Bucket B — login + session route mocks |
| `tests/e2e/checkout-mobile.spec.ts` | Modified | Bucket B — login + session route mocks |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Bucket B login-flow semantics: `route.fulfill` doesn't emit Set-Cookie | Med | Mock BOTH `/api/auth/login` AND `/api/auth/session` (A1) |
| Baseline 1-event deviation (43/15 vs 44/14) | Low | Documented out-of-scope (A3); chromium networkidle flake is separate root cause |
| Cookie-route interaction uncovered by mocks | Low | Out-of-scope; future real-cookie integration test followup |
| Cold-CI flake history (per #1607) | Low | Apply will verify warm-up before T2/T3 acceptance gate |

## Rollback Plan

Revert the squash-merge commit (single atomic PR). All 6 spec edits are reversible; zero production code changes — `git revert` is sufficient.

## Dependencies

- Strict TDD enabled (#1221) — T0 RED → T2/T3 GREEN → T4 SWEEP
- `webServer` array in `playwright.config.ts` keeps `npm run dev` + `mock-strapi-server.mjs` on `:1337` (CSP constraint, #1609)
- No real Strapi backend required; mock serves both SSR Strapi fetches and auth route mocks

## Success Criteria

- [ ] `npm run test:e2e` → 0 legacy-auth failures (was 14)
- [ ] Verdict verify: **PASS** (not `pass_with_warnings`)
- [ ] `npx vitest run --maxWorkers=2` → 949/949
- [ ] `npx vitest run --maxWorkers=2 --project storybook` → 20/20
- [ ] `npx tsc --noEmit` → exit 0
- [ ] `npm run lint` → exit 0
- [ ] Capability delta = 0 (production byte-identical)