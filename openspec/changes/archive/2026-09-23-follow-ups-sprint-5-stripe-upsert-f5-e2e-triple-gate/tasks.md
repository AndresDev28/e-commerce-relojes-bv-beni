# Tasks: follow-ups/sprint-5-stripe-upsert/F5-e2e-triple-gate

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~40 (35–45 added, 0 deleted) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR with 3 work-unit commits |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (not needed at this scope) |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | CI-aware Playwright server selection preserving local dev ergonomics | PR 1 (single) | `CI=1 STRAPI_API_URL=http://localhost:1337 NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1337 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_ci_mock_123456789 npm run build && CI=1 npm run test:e2e` (same env on both commands) | `npm run test:e2e` without `CI` set — must boot `next dev` | Revert the `process.env.CI` ternary in `playwright.config.ts` only |
| 2 | e2e CI job wiring (4th required gate) | PR 1 (single) | `npx --yes actionlint .github/workflows/ci.yml` | First non-release-please PR run on GitHub Actions — baseline measurement for the 15-minute timeout | Remove the `e2e` job block from `.github/workflows/ci.yml`; CI returns to `lint → build → test` |
| 3 | CI verify-gate vocabulary docs | PR 1 (single) | N/A — documentation-only; behavior verified by units 1–2; verification is content review against `openspec/changes/follow-ups-sprint-5-stripe-upsert-F5-e2e-triple-gate/specs/github-actions-ci/spec.md` (read-only) | N/A — no runtime behavior affected | Revert the added bullets in `AGENT.md` Test Execution section |

## TDD Notes

Strict TDD is active (`openspec/config.yaml` → `apply.tdd: true`), but per the design's Testing Strategy this change introduces no application logic: the server-selection branch lives inside the `playwright.config.ts` config object and the workflow is declarative YAML. RED-GREEN-REFACTOR unit cycles therefore do not apply. The design's RED expectations are carried as behavioral verification tasks (1.3, 1.4, 2.4, 4.x) with concrete expected outcomes mapped to delta-spec scenarios.

Design open question resolved here: the `AGENT.md` CI verify-gate wording goes under the existing `## Test Execution (Hardware-Aware)` section (task 3.1). It is the smallest coherent home, matches the ~5 LOC scope, and avoids structure churn; a separate CI subsection is unnecessary at this size.

## Phase 1: Foundation — CI-Aware Playwright Server Selection

- [x] 1.1 In `playwright.config.ts` (edit target), add `const nextServerCommand = process.env.CI ? 'npm run start' : 'npm run dev'` above the `webServer` array and use it as the first `webServer` entry's `command`. Keep every other property of that entry unchanged: the existing `url` string pointing at the favicon, `reuseExistingServer: !process.env.CI`, and `timeout: 60_000`. Keep the mock Strapi entry byte-identical — its command, the URL pointed at the Strapi health endpoint, `reuseExistingServer: !process.env.CI`, and `timeout: 30_000` all stay unchanged.
- [x] 1.2 Update the comment block above `webServer` in `playwright.config.ts` (currently lines 60-65) to state that CI uses the production `next start` server against the pre-built `.next` (CI jobs run `npm run build` first) while local runs keep `next dev`, so the branch's purpose is discoverable without reading the design doc.
- [x] 1.3 GREEN check — spec scenario `Local development preserved` (E2E Inclusion): run `npm run test:e2e` with no `CI` env set and confirm Playwright boots the dev server (`next dev` / dev-mode ready output) and the suite runs against `http://localhost:3000`. Expected: production mode MUST NOT activate. Caveat: F7 evidence documents pre-existing local flakiness — distinguish baseline suite failures from wiring failures; the server-mode confirmation is the pass criterion, not a flake-free run.
- [x] 1.4 GREEN check — CI-like production path: with no local server already running on `:3000`/`:1337` (`reuseExistingServer` is false under `CI=1`, so a leftover dev server causes a port conflict), run `CI=1 STRAPI_API_URL=http://localhost:1337 NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1337 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_ci_mock_123456789 npm run build` followed by the same env prefix with `CI=1 npm run test:e2e`. Expected: Playwright starts `npm run start` and tests execute against the production build. `NEXT_PUBLIC_*` values must be present at build time for client-bundle inlining.
- [x] 1.5 Commit work unit 1: `chore(ci): playwright config branches Next server on process.env.CI` — records focused-test result (1.4) and runtime-harness result (1.3) in the commit evidence.

## Phase 2: CI Wiring — e2e Job as Fourth Required Gate

- [x] 2.1 Add the `e2e` job to `.github/workflows/ci.yml` after the `test` job (currently ends at line 98) with: `name: E2E`, `runs-on: ubuntu-latest`, `timeout-minutes: 15`, `needs: test`, and the release-please skip `if: ${{ github.event_name != 'pull_request' || !startsWith(github.head_ref, 'release-please--') }}` byte-identical to `.github/workflows/security.yml` (read-only) line 21. Add job-level `env` with exactly: `STRAPI_API_URL: http://localhost:1337`, `NEXT_PUBLIC_STRAPI_API_URL: http://localhost:1337`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_ci_mock_123456789`. No `STRIPE_SECRET_KEY` — server Stripe init is lazy by design.
- [x] 2.2 Add the job steps following the existing named-step pattern of the sibling jobs (mirror `lint`/`build`/`test`): `Checkout` (`actions/checkout@v4`), `Setup Node.js` (`actions/setup-node@v4` with `node-version-file: .node-version`), `Cache npm` (`actions.cache@v4`, `~/.npm`, same key/`restore-keys` as lines 30-36), `Install dependencies` (`npm ci`), then `Build` (`npm run build`), `Install browsers` (`npx playwright install --with-deps chromium firefox`), `Run e2e` (`npm run test:e2e`), and `Upload Playwright report` (`if: failure()`, `actions/upload-artifact@v4`, `name: playwright-report`, `path: playwright-report/`, `if-no-files-found: ignore`).
- [x] 2.3 Validate the workflow: run `npx --yes actionlint .github/workflows/ci.yml` (or a YAML parse check if actionlint is unavailable) and confirm the skip condition matches `.github/workflows/security.yml` (read-only) character-for-character so the two policies cannot drift.
- [x] 2.4 RED check — spec scenario `Non-secret environment values only` (E2E Inclusion): confirm the job env block contains exactly the three safe values and no live credential. The "missing required build-time value MUST fail rather than silently pass" half of the scenario is only cleanly observable on a fresh CI runner (local `.env.local` masks missing values) — record it as a checkpoint for task 4.4's first CI run, not as a local test.
- [x] 2.5 Commit work unit 2: `ci: add e2e job to .github/workflows/ci.yml` — includes actionlint result (2.3) and env review (2.4) as commit evidence.

## Phase 3: Documentation — CI Verify-Gate Vocabulary

- [x] 3.1 Extend the `## Test Execution (Hardware-Aware)` section of `AGENT.md` (currently lines 58-61) with a CI verify-gate vocabulary bullet: CI verification consists of lint, build, unit tests (`npx vitest run --maxWorkers=2`), and Playwright e2e (`npm run test:e2e` — production-mode server in CI, dev server locally, report artifact on failure). Keep the existing maxWorkers rule and hang-recovery bullets unchanged.
- [x] 3.2 Commit work unit 3: `docs(agent): extend CI verify-gate vocabulary to include Playwright e2e`.

## Phase 4: Verification — Triple Gate and Spec Scenario Sweep

- [x] 4.1 Triple-gate sweep: `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build` — all three must pass.
- [x] 4.2 Spec scenario sweep — `CI Jobs` (delta spec `openspec/changes/follow-ups-sprint-5-stripe-upsert-F5-e2e-triple-gate/specs/github-actions-ci/spec.md` (read-only)): structurally verify the `lint` → `build` (needs) → `test` (needs) → `e2e` (needs) chain makes all four scenarios true — `Successful run`, `Build failure` (downstream jobs skip), `E2E failure blocks the pipeline`, and `E2E success completes the workflow`.
- [x] 4.3 Spec scenario sweep — `E2E Inclusion` (same delta spec (read-only)): verify browser install covers exactly `chromium firefox` (Browser matrix scope), env block has only the three non-secret values (Non-secret environment values only), skip condition present (Release-automation skip), and `if: failure()` upload step present (Report uploaded on failure — structural check now; confirm the downloadable artifact on the first real failing run).
- [x] 4.4 First CI run baseline: push the PR and treat the first non-release-please run as the measurement point for (a) the 15-minute timeout against the 68-test/two-browser suite and (b) distinguishing baseline suite failures from F5 wiring failures. Record findings. If runtime approaches or exceeds 15 minutes, open a follow-up change with measured evidence — do NOT bump the timeout inside this change.
- [x] 4.5 Rollback rehearsal (dry check): confirm the rollback plan is three independent reverts — the `e2e` job block in `.github/workflows/ci.yml`, the ternary in `playwright.config.ts`, and the `AGENT.md` bullets — with no unrelated files involved, matching the proposal's rollback plan.
