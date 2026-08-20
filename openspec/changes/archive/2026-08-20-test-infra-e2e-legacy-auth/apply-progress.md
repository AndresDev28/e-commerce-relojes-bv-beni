# Apply Progress: test-infra-e2e-legacy-auth

**Status**: success
**Branch**: `frontend/TEST-INFRA-E2E-LEGACY-AUTH-modernize-auth-mocks`
**PR**: https://github.com/AndresDev28/e-commerce-relojes-bv-beni/pull/111
**Commits**: 3 (squash on merge, per A4)

## Outcome

All 14 legacy-auth e2e failure events closed. Final e2e run: **58 passed / 0 failed**. Capability delta = 0 — the diff touches only `tests/e2e/` (6 files, 55 insertions / 54 deletions), well inside the 400-line review budget.

## Work units

### WU1 — T0 RED baseline (commit `25019ce`)

- `:3000` confirmed free before the run (`curl` → `000`), satisfying the mandatory dev-up gate from #1607.
- `npm run test:e2e` → **44 passed / 14 failed**, not the forecast 43/15. The delta is benign: the `uxw01` TC-15 flake did not fire. The webServer warmup clearly succeeded, proven by the failure distribution — only legacy-auth specs failed, not the 36/22 collapse pattern that indicates a cold server.
- The 14 events matched the predicted matrix exactly: cancellation-flow (2), empty-states (4), order-tracking (2), payment-errors test 1 (2), checkout-happy-path (2), checkout-mobile (2).
- Branch created; baseline recorded as an empty commit.
- Log: `/tmp/test-infra-e2e-legacy-auth/t0-baseline.log`

### WU2 — T2 GREEN Bucket A (commit `e784557`)

- `cancellation-flow`, `empty-states`, `order-tracking`: replaced the `addInitScript` jwt seed + `/api/users/me` route with `/api/auth/session` returning `{ user: MOCK_USER }`. Dropped the now-unused `MOCK_AUTH_RESPONSE` import.
- Result: **52 passed / 6 failed** — exactly 8 events closed, matching the design forecast.
- Log: `/tmp/test-infra-e2e-legacy-auth/t2-green-a.log`

### WU3 — T3 GREEN Bucket A' + B (commit `f81220a`)

- `payment-errors` (A'): session swap in `beforeEach`; test 2 now calls `page.unroute('**/api/auth/session')` instead of removing a localStorage key that no longer drives auth. Closed immediately.
- `checkout-happy-path`, `checkout-mobile` (B): applied the A1-refined pattern — session route conditional on the `bv_session` cookie, plus a login route emitting `Set-Cookie: bv_session=mock-jwt; Path=/; HttpOnly; SameSite=Lax`.
- **Design deviation found and corrected.** The first B run still failed, but NOT because of the mocks — the auth mocks worked and login succeeded. Design L37 predicted `router.push('/mi-cuenta')` after login; in reality the login page honours `?redirect=%2Fcarrito` and lands on `/carrito`. Both checkout specs asserted `toHaveURL(/mi-cuenta/)`, encoding pre-redirect-feature behaviour. Corrected to `/carrito`, verified against `login-redirect.spec.ts` TC-01/TC-02 which independently cover redirect-param behaviour and pass. No production change was made to accommodate this.
- Result: **58 passed / 0 failed**. All 14 events closed.
- Log: `/tmp/test-infra-e2e-legacy-auth/t3-green-full.log`

### WU4 — T4 SWEEP (verification only, no commit)

| Gate | Result |
|---|---|
| `npx vitest run --maxWorkers=2` | 969 passed / 9 skipped; 1 pre-existing env failure |
| `npx vitest run --project storybook` | 20/20 passed, exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| `git diff main -- 'src/' 'next.config.*' 'middleware.*' 'package.json'` | empty |
| `git diff main --name-only \| grep -v '^tests/e2e/'` | empty |

The single failing vitest file is `test/integration/email/order-status-change.integration.test.ts` ("Strapi is not available"). It requires the Dockerised backend and cannot be caused by this change, which modifies no file vitest executes (`tests/e2e/` is Playwright's testDir).

Logs: `t4-vitest.log`, `t4-storybook.log`, `t4-tsc.log`, `t4-lint.log` under `/tmp/test-infra-e2e-legacy-auth/`.

### WU5 — Push + PR

- Branch pushed to origin.
- PR #111 opened against `main` with the bucket-classified table, A1–A4, the design deviation called out for review, and the full evidence matrix. No AI co-author tags.

## Assumption outcomes

- **A1 (refined)** — Confirmed necessary. The conditional-cookie session mock plus `Set-Cookie` login mock is what makes Bucket B work; an unconditional mock would break the pre-login cart redirect.
- **A2** — Honoured. `favorites-auth-prompt-a11y.spec.ts` and `favorites-anonymous-access.spec.ts` have zero diff.
- **A3** — Honoured. The `uxw01` flake was not chased. It fired on firefox in one intermediate run and on neither the baseline nor the final run, reinforcing the flake classification. Tracked as `BUG-E2E-UXW01-CHROMIUM-FLAKE` — note the observed firefox occurrence suggests the name's chromium scoping is too narrow.
- **A4** — Honoured. One PR, 3 work-unit commits, squash merge.

## Risks / follow-ups

- The `/mi-cuenta` → `/carrito` assertion correction is a genuine deviation from design.md and should get explicit reviewer attention on PR #111.
- `BUG-E2E-UXW01-CHROMIUM-FLAKE` remains open and was observed on firefox, not just chromium — the ticket scope may need widening.
- The Strapi-dependent integration test cannot run in this environment; it was not validated by this change.
