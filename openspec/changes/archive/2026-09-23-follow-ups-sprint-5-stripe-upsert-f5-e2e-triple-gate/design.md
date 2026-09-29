# Design: follow-ups/sprint-5-stripe-upsert/F5-e2e-triple-gate

## Technical Approach

Add a fourth required GitHub Actions job (`e2e`) after the existing `lint → build → test` chain so browser-level regressions fail CI before merge. The job will follow the repository's existing workflow pattern (fresh checkout, Node from `.node-version`, npm cache, `npm ci`) and then explicitly prepare a production-mode Playwright target with `npm run build`, browser provisioning, and `npm run test:e2e`.

To close the F7 instability documented in the exploration and proposal, `playwright.config.ts` will switch only the Next.js web server command in CI from `npm run dev` to `npm run start`, while keeping local runs on `npm run dev`. This preserves the existing local developer ergonomics and aligns the CI gate with the delta spec requirement that production mode be used only inside CI.

This design implements the modified `github-actions-ci` delta spec, especially:

- `CI Jobs` — e2e becomes the final required gate and is part of the success path.
- `E2E Inclusion` — Playwright runs against production-mode Next.js plus the local Strapi mock, with only non-secret test environment values and a failure artifact.

## Architecture Decisions

### Decision: Run e2e as a dedicated CI job after unit tests

**Choice**: Add a new `e2e` job in `.github/workflows/ci.yml` with `needs: test`, its own checkout/setup/cache/install sequence, then `npm run build`, `npx playwright install --with-deps chromium firefox`, `npm run test:e2e`, and `actions/upload-artifact@v4` for `playwright-report/` on failure.

**Alternatives considered**: Reuse the existing `test` job; run e2e before unit tests; share `.next` from the build job via artifacts.

**Rationale**: A separate job keeps the existing gate layering explicit and matches the delta spec's sequential `lint → build → test → e2e` contract. `needs: test` ensures the new scenario `E2E success completes the workflow` is structurally true: workflow success now requires the e2e job to finish. Rebuilding inside the e2e job is intentional because GitHub jobs do not share workspace build output, and artifact-sharing would add more moving parts than this follow-up needs.

### Decision: Use Playwright's existing multi-webServer pattern, but branch the Next command on `process.env.CI`

**Choice**: Keep the two-entry `webServer` array in `playwright.config.ts`, preserve the mock Strapi server entry unchanged, and compute the Next.js server command as `process.env.CI ? 'npm run start' : 'npm run dev'`.

**Alternatives considered**: Hard-code `npm run start`; add a second Playwright config for CI; drive startup through shell wrappers or extra npm scripts.

**Rationale**: The project already uses a simple centralized Playwright config with CI-aware toggles for retries, workers, and `reuseExistingServer`. Extending that same pattern is the lowest-friction change. Hard-coding `start` would violate the `Local development preserved` scenario. A second config or extra shell scripts would scatter behavior and make the gate harder to reason about.

### Decision: Supply CI-only mock environment values in the workflow instead of changing application code

**Choice**: Set `STRAPI_API_URL=http://localhost:1337`, `NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1337`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_ci_mock_123456789` in the e2e job environment.

**Alternatives considered**: Commit new `.env` files for CI; inject live/staging credentials; add code fallbacks that bypass Stripe validation.

**Rationale**: The existing application code already supports this safely. `getStrapiServerUrl()` prefers `NEXT_PUBLIC_STRAPI_API_URL`/`STRAPI_API_URL`, the mock server already serves on port 1337 by default, and Stripe client validation only requires the publishable key to match the `^pk_(test|live)_` shape. Server Stripe initialization is lazy, so no `STRIPE_SECRET_KEY` is required unless server code actually touches Stripe during the run. This keeps secrets out of CI while preserving realistic startup behavior.

### Decision: Mirror the release-please skip condition exactly from security.yml

**Choice**: Add `if: ${{ github.event_name != 'pull_request' || !startsWith(github.head_ref, 'release-please--') }}` to the new `e2e` job.

**Alternatives considered**: No skip condition; a similar-but-not-identical branch check; workflow-level filtering.

**Rationale**: The spec explicitly requires release-automation PR skipping, and `.github/workflows/security.yml` already establishes the exact repository convention. Mirroring the condition avoids subtle drift between workflows and keeps future maintainers from debugging two near-identical policies.

### Decision: Keep the 15-minute timeout for the first rollout

**Choice**: Start the e2e job with `timeout-minutes: 15`, matching the existing CI jobs.

**Alternatives considered**: Increase immediately to 20–30 minutes; reduce retries/workers further; shard the suite now.

**Rationale**: The proposal and exploration both call out that runtime is unknown and must be measured on the first real CI run. Changing the timeout before measurement would be guessing. The design therefore preserves the current budget, accepts the first run as the measurement point, and treats any later timeout change as data-driven follow-up work.

## Data Flow

The new workflow path is:

```text
pull_request/push to main
        │
        ▼
     lint job
        │
        ▼
     build job
        │
        ▼
      test job
        │
        ▼
      e2e job
        │
        ├─ sets mock env values
        ├─ npm run build
        ├─ installs Chromium + Firefox
        └─ npm run test:e2e
                │
                ▼
      Playwright webServer[]
        ├─ Next server: start in CI / dev locally
        └─ mock Strapi server on :1337
                │
                ▼
          Browser tests run
                │
      ┌─────────┴─────────┐
      ▼                   ▼
   all pass            any fail
      │                   │
      ▼                   ├─ upload playwright-report/
workflow succeeds         ▼
                     workflow fails
```

Key runtime interactions inside the e2e job:

1. GitHub Actions starts a fresh Ubuntu runner and installs repo dependencies.
2. The job exports mock Strapi URLs and a `pk_test_...` publishable key.
3. `npm run build` creates `.next` ahead of Playwright, avoiding F7's first-compile instability under `next dev`.
4. `npm run test:e2e` loads `playwright.config.ts`.
5. In CI, Playwright starts `npm run start` on port 3000 and the existing mock Strapi server on port 1337.
6. Browser tests hit the built Next app; app code resolves Strapi calls to the mock URL and Stripe client init accepts the test publishable key.
7. Failures produce the HTML report artifact for diagnosis.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | Modify | Add the required `e2e` job, release-please skip condition, CI-safe env values, browser install, and report upload on failure. |
| `playwright.config.ts` | Modify | Branch the Next.js webServer command on `process.env.CI` so CI uses `npm run start` and local runs keep `npm run dev`. |
| `AGENT.md` | Modify | Extend the test/verify guidance so CI gate vocabulary explicitly includes Playwright e2e in addition to lint, build, and unit tests. |
| `openspec/changes/follow-ups-sprint-5-stripe-upsert-F5-e2e-triple-gate/design.md` | Create | Record this implementation design for the change. |

## Interfaces / Contracts

### GitHub Actions e2e job contract

```yaml
e2e:
  name: E2E
  runs-on: ubuntu-latest
  timeout-minutes: 15
  needs: test
  if: ${{ github.event_name != 'pull_request' || !startsWith(github.head_ref, 'release-please--') }}
  env:
    STRAPI_API_URL: http://localhost:1337
    NEXT_PUBLIC_STRAPI_API_URL: http://localhost:1337
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_ci_mock_123456789
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version-file: .node-version
    - uses: actions/cache@v4
      with:
        path: ~/.npm
        key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-npm-
    - run: npm ci
    - run: npm run build
    - run: npx playwright install --with-deps chromium firefox
    - run: npm run test:e2e
    - if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report/
        if-no-files-found: ignore
```

Notes:

- `needs: test` makes e2e part of the required success path while preserving earlier fail-fast behavior.
- The artifact step is conditional so successful runs stay lean.
- No `STRIPE_SECRET_KEY` is provided by design.

### Playwright server-selection contract

```ts
const nextServerCommand = process.env.CI ? 'npm run start' : 'npm run dev'

webServer: [
  {
    command: nextServerCommand,
    url: 'http://localhost:3000/favicon.svg',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  {
    command: 'MOCK_STRAPI_PORT=1337 node tests/e2e/mock-strapi-server.mjs',
    url: 'http://localhost:1337/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
]
```

Behavioral contract:

- **CI path**: `process.env.CI` is truthy on GitHub Actions, so Playwright starts the already-built production server via `npm run start`.
- **Local path**: outside CI, Playwright continues to use `npm run dev`, satisfying the `Local development preserved` scenario.
- The mock Strapi process remains unchanged so existing tests continue to target the same API surface.

### Environment-value contract

```text
STRAPI_API_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1337
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_ci_mock_123456789
```

These values are intentionally safe:

- both Strapi URLs point to the already-checked-in local mock server,
- the Stripe key uses the required `pk_test_` prefix and contains no live credential,
- omitted server secrets stay omitted because the current design does not need them.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Playwright config branch behavior if extracted into a small constant/helper during implementation | Add a focused Vitest test only if the implementation introduces testable branching logic outside the config object; otherwise rely on workflow/E2E verification because no app logic changes. |
| Integration | CI workflow structure and documented gate vocabulary consistency | Review diff against `.github/workflows/security.yml`, `AGENT.md`, and the delta spec so the `needs`, `if`, env names, and artifact step exactly match the contract. |
| E2E | Full Playwright gate behavior in CI and local preservation semantics | Run `npm run test:e2e` locally to confirm non-CI still uses `npm run dev`; in CI or a CI-like run (`CI=1 npm run build && CI=1 npm run test:e2e`) confirm the production server path, browser scope (Chromium + Firefox), and failure artifact generation. |

RED expectations to carry into apply/tasks:

- A CI-like run without the mock env values should fail early rather than silently pass.
- A local non-CI run must still boot the dev server, not production mode.
- An intentional Playwright failure should still upload `playwright-report/` in the workflow.

## Threat Matrix

N/A — this change does not introduce application routing, shell-command ingestion, subprocess orchestration from product code, VCS/PR automation logic, executable-file classification, or process-integration boundaries beyond deterministic CI workflow wiring and a Playwright config branch.

## Migration / Rollout

No data migration required.

Rollout plan:

1. Land the workflow and Playwright config changes together so CI and test bootstrap stay aligned.
2. Treat the first non-release-please PR run as the baseline measurement for runtime and remaining suite flakiness.
3. If the first run approaches or exceeds 15 minutes, create a follow-up change to adjust timeout and/or execution strategy based on measured evidence rather than guesswork.

## Open Questions

- [ ] Does `AGENT.md` want the CI verify-gate wording under the existing Test Execution section or a new CI-specific subsection for long-term clarity?
- [ ] After the first real CI run, does the current 15-minute timeout remain sufficient for the 68-test two-browser suite with retries enabled?
