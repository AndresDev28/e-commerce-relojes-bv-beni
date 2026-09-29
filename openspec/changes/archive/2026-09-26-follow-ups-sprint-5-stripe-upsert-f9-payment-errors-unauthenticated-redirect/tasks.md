# Tasks: F9 — Unauthenticated Visitor Redirect

**Change**: `follow-ups-sprint-5-stripe-upsert-f9-payment-errors-unauthenticated-redirect`
**Branch**: `frontend/F9-payment-errors-unauthenticated-redirect` (create from main @ 309818c)
**Artifact store**: engram · strict TDD · budget 400 lines · single PR
**Topic key**: `sdd/follow-ups/sprint-5-stripe-upsert/f9-payment-errors-unauthenticated-redirect/tasks`

---

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 30-60 (spec delta ~15 LOC + test edit ~5 LOC + comment header ~10 LOC; 0 deletion) |
| 400-line budget risk | Low |
| Chained PRs recommended | No (single PR) |
| Decision needed before apply | No |
| Suggested split | Two work-unit commits: (1) spec delta, (2) test re-enable |

The diff sits squarely under the 400-line review budget per F8's pattern. No chained PR required.

## Out of Scope (refirmado)

- F4 spec drift (R1-R6 missing).
- `withRetry` extraction.
- `ProtectedRoute` refactor.
- Backend `/api/auth/session` behavior changes.

These stay in their own tickets. F9 touches 2 files only: `openspec/specs/checkout-error-display/spec.md` and `tests/e2e/payment-errors.spec.ts`. Optionally `playwright.config.ts` and `src/app/checkout/page.tsx` if RED iteration requires it.

## Task List

### T1 — Author spec delta (one ADDED requirement)

- **Description**: Add the new requirement `Unauthenticated Visitor Redirect` to `openspec/specs/checkout-error-display/spec.md`, with 4 scenarios matching S-UNAUTH.1..S-UNAUTH.4. Mirror the same content into the change-folder delta at `openspec/changes/follow-ups-sprint-5-stripe-upsert-f9-payment-errors-unauthenticated-redirect/specs/checkout-error-display/spec.md` per openspec convention (only if committing the change folder is required; otherwise rely on sync at archive time).
- **Dependencies**: design (#1943), proposal (#1941 amended), spec (#1942).
- **Acceptance criteria**:
  - Canonical `openspec/specs/checkout-error-display/spec.md` now has 6 requirements under `## Requirements`. The new one is `### Requirement: Unauthenticated Visitor Redirect`.
  - Each scenario (S-UNAUTH.1..S-UNAUTH.4) is present and follows the existing GIVEN/WHEN/THEN format used by other requirements in the file.
- **Verification**: structural readback of the diff hunk. Triple gate stays green (pure documentation).
- **Work-unit commit**: `docs(openspec): add Unauthenticated Visitor Redirect requirement to checkout-error-display`.

### T2 — Rewrite Test 2 header comment block

- **Description**: Update the comment block at `tests/e2e/payment-errors.spec.ts:20-24` to reflect that Test 2 is now active rather than deferred. Drop the "F9 candidate, obs #1808" framing and replace with a brief note that Test 2 asserts the new S-UNAUTH.1 requirement.
- **Dependencies**: T1.
- **Acceptance criteria**:
  - Comment block no longer mentions F9 / "stays skipped" framing.
  - Comment block still references the canonical spec at `openspec/specs/checkout-error-display/spec.md`.
- **Verification**: structural readback. No test change yet.
- **Work-unit commit**: rolled into the same commit as T3 to keep the test edit atomic.

### T3 — Convert `test.skip` to `test` on Test 2

- **Description**: Change `test.skip(...)` to `test(...)` on `tests/e2e/payment-errors.spec.ts:68`.
- **Dependencies**: T2.
- **Acceptance criteria**:
  - The string `test.skip` disappears from line 68.
  - Test 2 now runs under `npm run test:e2e -- payment-errors.spec.ts`.
- **Verification**:
  - RED check: confirm `test.skip(...)` was the previous state (run e2e once before the edit; should report Test 2 as `skipped`).
  - GREEN check: after the edit, run e2e; Test 2 must report `passed`. If `passed` immediately, ship. If `failed` or `timed out`, proceed to T4.
- **Work-unit commit**: `test(checkout): re-enable Test 2 unauthenticated redirect (F9/S-UNAUTH.1)`.

### T4 — Conditional: TDD-iterate if RED on T3

- **Description**: ONLY executed if T3 leaves Test 2 in RED. Bounded iteration: try ONE of the following in priority order, smallest change first:
  1. Tighten the assertion with `page.waitForURL(/\/login/, { timeout: 15000 })` BEFORE `expect(page).toHaveURL(...)`. (1-3 LOC.)
  2. If F5-class CI flake is observed in the first CI run, bump `playwright.config.ts` `retries: process.env.CI ? 1 : 0` -> `retries: process.env.CI ? 2 : 0`. (1 LOC.)
  3. As a last resort, apply the smallest possible source-code fix to `src/app/checkout/page.tsx:65-77` (e.g. switch `router.push` to `router.replace`, or extend the `authLoading || !isHydrated` guard). Document the rationale in the commit body. (1-5 LOC.)
- **Dependencies**: T3 RED only.
- **Acceptance criteria**:
  - Test 2 reports `passed` after ONE bounded iteration. If GREEN does not land in 1-3 attempts, STOP and surface to the user — do not auto-loop forever.
  - Total bounded iteration delta ≤ 5 LOC.
- **Verification**:
  - Local `npm run test:e2e -- payment-errors.spec.ts` shows `passed`.
  - Local full `npm run test:e2e` shows no regression elsewhere.
- **Work-unit commit**: `fix(checkout): tighten Test 2 RED→GREEN iteration (F9)` (or similar; pick concrete title matching the actual fix).

### T5 — Triple gate verification

- **Description**: Run `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build`. All three must exit 0.
- **Dependencies**: T1, T2, T3, T4 (if executed).
- **Acceptance criteria**:
  - vitest: same pass count as main @ 309818c (1157/1158 with one pre-existing flake known to pass on rerun, OR 1158/1158 on a clean run).
  - tsc: 0 errors.
  - build: 0 errors.
- **Verification**: capture exit codes; report in apply-progress.
- **Work-unit commit**: none (verification step).

### T6 — Push branch + open PR

- **Description**: Push `frontend/F9-payment-errors-unauthenticated-redirect` and open a PR against `main`. PR body documents:
  - Two main work-unit commits (T1 docs + T3 test, with T4 fix if applicable).
  - Reference to obs #1940-#1943 (explore/proposal/spec/design) for context.
  - Explicit "out of scope" note: F4 spec drift (R1-R6) deferred to a separate change.
  - Test 2 was deferred by F4 (PR #141-era, obs #1901); F9 closes that gap.
- **Dependencies**: T5 green.
- **Acceptance criteria**:
  - PR is open against main.
  - CI e2e job from F5 must pass.
  - PR title: `test(checkout): re-enable Test 2 unauthenticated redirect (F9/S-UNAUTH.1)`.
- **Verification**: PR URL captured for archive-report.
- **Work-unit commit**: N/A (PR open step).

### T7 — Document apply-progress in Engram

- **Description**: After T6 succeeds (or after the bounded iteration that surfaces a CI flake to be addressed), write an apply-progress observation summarizing the actual outcomes vs the forecasts in this task list. Mirror the structure used by F8 (#1935) and F5.
- **Dependencies**: T6.
- **Acceptance criteria**:
  - Engram observation persisted under topic key `sdd/follow-ups/sprint-5-stripe-upsert/f9-payment-errors-unauthenticated-redirect/apply-progress`.
  - Mentions: which tasks completed, T4 status (executed / skipped), CI retry decision (executed / skipped), test counts.
- **Verification**: observation retrievable via `engram search`.
- **Work-unit commit**: none.

## Notes for sdd-apply

- Apply happens in manual mode (Path B, per session decision). The native `gentle-ai sdd-continue` dispatcher is NOT used. Git branch creation, commits, push, and PR open are the user's call under their ordinary repository policy; the orchestrator holds the instructions but does not autonomously execute them.
- Tools used during apply: `git`, `npm run test:e2e`, `npx vitest`, `npx tsc`, `npm run build`. No new dependencies.
- Hardware-aware vitest: always `npx vitest run --maxWorkers=2` (AGENT.md).
- Strict TDD mode: `openspec/config.yaml:13`. T3's "RED check" is the explicit RED milestone; GREEN on first run is the GREEN milestone. No REFACTOR expected for a 1-character test flip.

## Branch and Commit Strategy

- One branch: `frontend/F9-payment-errors-unauthenticated-redirect`.
- Two-three work-unit commits:
  1. `docs(openspec): add Unauthenticated Visitor Redirect requirement to checkout-error-display`
  2. `test(checkout): re-enable Test 2 unauthenticated redirect (F9/S-UNAUTH.1)` — this commit may include T2's comment rewrite
  3. (Optional, T4 only) `fix(checkout): <concrete fix title>` if RED surfaced a flake or defect

## Open Architectural Decisions

None at task-list level. All resolved at design (#1943).

