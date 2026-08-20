# Tasks: Test-Infra E2E — Modernize Legacy Auth Mocks (Cookie-Session)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~30 LOC net (6 spec files, test code only) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR `fix(test): modernize auth mocks in legacy specs (cookie-session)` |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception (not needed — within budget) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Risk Posture

The 14-event legacy-auth closure target is small (~30 LOC), within budget, and capability delta = 0. One PR, 3 work-unit commits squashed at merge. No chained PR needed.

## Phase 1 — T0 RED Baseline (CONFIRMATION ONLY, no code edits)

- [x] **T0.1** Verify webServer warm-up before running baseline.
  - Goal: Confirm `:3000` returns 200 (not 500) before baseline capture.
  - Pre-conditions: `:3000` free (`ss -ltnp | grep ':3000'` empty); `playwright.config.ts` webServer array present.
  - Acceptance: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → `200`. Without this, baseline collapses to 36/22 and signal is masked (#1607).
  - Risks: Cold-start 500 from Next.js compile → wait + retry once.

- [x] **T0.2** Capture baseline failure count and event-to-spec mapping.
  - Goal: Confirm 14 legacy-auth events + 1 chromium-only uxw01 flake fail pre-change.
  - Pre-conditions: T0.1 passed.
  - Acceptance: `npm run test:e2e 2>&1 | tee /tmp/test-infra-e2e-legacy-auth/t0-baseline.log` shows 43 passed / 15 failed. The 14 events map to: cancellation-flow (2), empty-states (4), order-tracking (2), payment-errors test 1 (2), checkout-happy-path (2), checkout-mobile (2). The 1 extra event is `BUG-E2E-UXW01-CHROMIUM-FLAKE` (A3, out of scope).
  - Risks: Flake propagates → re-run once; second pass is canonical.

- [x] **T0.3** Commit baseline memo.
  - Goal: Record T0 state for the PR body.
  - Pre-conditions: T0.2 captured.
  - Acceptance: `git commit --allow-empty -m "chore(test): capture T0 RED baseline for legacy-auth modernization"`.

## Phase 2 — T1 Branch + Dry-Run (PREP, no edits)

- [x] **T1.1** Create feature branch.
  - Goal: Working branch isolated for the 6 spec edits.
  - Pre-conditions: T0.3 committed on starting branch.
  - Acceptance: `git checkout -b frontend/TEST-INFRA-E2E-LEGACY-AUTH-modernize-auth-mocks` exits 0.

- [x] **T1.2** Draft bucket-classified auth-setup blocks in scratch.
  - Goal: Pre-write each new auth-setup block before touching specs.
  - Pre-conditions: T1.1; design.md L60–100 read.
  - Acceptance: Scratch contains 6 documented blocks: 3 Bucket A (session-only), 1 Bucket A' (session + test-2 unroute), 2 Bucket B (session conditional on `bv_session` cookie + login with Set-Cookie header).

## Phase 3 — T2 GREEN Bucket A (3 specs, 8 events)

- [x] **T2.1** Modernize `tests/e2e/cancellation-flow.spec.ts` (L8–15).
  - Pre-conditions: `:3000` returns 200.
  - Acceptance: `beforeEach` no longer calls `addInitScript(jwt)` or routes `/api/users/me`; routes `/api/auth/session` returning `{ user: MOCK_USER }`. Spec passes on chromium AND firefox.

- [x] **T2.2** Modernize `tests/e2e/empty-states.spec.ts` (L8–14, both tests).
  - Acceptance: Same swap; both tests pass on both browsers.

- [x] **T2.3** Modernize `tests/e2e/order-tracking.spec.ts` (L8–15).
  - Acceptance: Same swap; spec passes on both browsers.

- [x] **T2.4** Verify + commit T2 work unit.
  - Goal: Close 8 of 14 legacy-auth events.
  - Acceptance: `npm run test:e2e 2>&1 | tee /tmp/test-infra-e2e-legacy-auth/t2-green-a.log` shows 6 fewer failures than T0 (43/9). Vitest 949/949 and storybook 20/20 unchanged.
  - Commit: `fix(test): modernize bucket A auth mocks (cookie-session)`.

## Phase 4 — T3 GREEN Bucket A' + Bucket B (3 specs, 6 events)

- [x] **T3.1** Modernize `tests/e2e/payment-errors.spec.ts` (Bucket A').
  - Acceptance: `beforeEach` same swap as A. Test 2 L49–60: drop `addInitScript(localStorage.removeItem)`; add `await page.unroute('**/api/auth/session')` so real route returns `{ user: null }`. Both tests pass on both browsers.

- [x] **T3.2** Modernize `tests/e2e/checkout-happy-path.spec.ts` (Bucket B).
  - Pre-conditions: design.md L82–99 verified for conditional-cookie pattern.
  - Acceptance: Mocks BOTH `/api/auth/login` (Set-Cookie: `bv_session=mock-jwt; Path=/; HttpOnly; SameSite=Lax`) AND `/api/auth/session` (conditional on `bv_session` cookie). L52 redirect assertion passes. Spec passes on chromium AND firefox.

- [x] **T3.3** Modernize `tests/e2e/checkout-mobile.spec.ts` (Bucket B).
  - Acceptance: Same pattern as T3.2. Spec passes on both browsers.

- [x] **T3.4** Verify + commit T3 work unit.
  - Goal: Close remaining 6 legacy-auth events (all 14 closed).
  - Acceptance: `npm run test:e2e 2>&1 | tee /tmp/test-infra-e2e-legacy-auth/t3-green-ab.log` shows 0 legacy-auth failures (43/0 or 43/1 if uxw01 flake reappears — flake per A3 does NOT count).
  - Commit: `fix(test): modernize bucket A' and B auth mocks (cookie-session conditional)`.

## Phase 5 — T4 SWEEP (verification only, no edits)

- [x] **T4.1** Run vitest gate.
  - Acceptance: `npx vitest run --maxWorkers=2` → 949/949 passing.

- [x] **T4.2** Run storybook gate.
  - Acceptance: `npx vitest run --maxWorkers=2 --project storybook` → 20/20 passing.

- [x] **T4.3** Run typecheck + lint.
  - Acceptance: `npx tsc --noEmit` → exit 0; `npm run lint` → exit 0.

- [x] **T4.4** Verify capability delta is zero.
  - Acceptance: `git diff main -- 'src/' 'next.config.*' 'middleware.*' 'package.json'` is empty.

## Phase 6 — Push + PR

- [x] **PR.1** Push branch and open PR.
  - Goal: One PR, squash merge per A4.
  - Pre-conditions: T4.1–T4.4 all green.
  - Acceptance: `git push -u origin frontend/TEST-INFRA-E2E-LEGACY-AUTH-modernize-auth-mocks` succeeds. PR title: `fix(test): modernize auth mocks in legacy specs (cookie-session)`. PR body references #1612 (F1 followup), enumerates A1–A4, names `BUG-E2E-UXW01-CHROMIUM-FLAKE` as known followup, and lists the 6 spec edits in the bucket-classified table. No AI co-author tags.
  - Risks: PR template asks for checklist → include the 7 success criteria from proposal.md.

---

## Threat Matrix (applied to task plan)

Per design.md L127: `N/A — no production routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. page.route() is Playwright client-side test interception, not production routing.`

Zero threat-matrix rows apply. No RED-test tasks required beyond the e2e baseline (T0) and per-spec green confirmations (T2/T3).

---

## Out-of-Scope Affirmations

- `favorites-auth-prompt-a11y.spec.ts` and `favorites-anonymous-access.spec.ts`: NOT touched (A2).
- `uxw01 TC-15 chromium networkidle flake`: NOT in scope (A3, `BUG-E2E-UXW01-CHROMIUM-FLAKE` followup).
- Production code: NOT touched (capability delta = 0).
