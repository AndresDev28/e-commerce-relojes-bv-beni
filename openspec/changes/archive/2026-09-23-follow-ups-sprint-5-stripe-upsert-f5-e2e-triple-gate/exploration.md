# Exploration: follow-ups/sprint-5-stripe-upsert/F5-e2e-triple-gate

## Current State

- `.github/workflows/ci.yml:3-11,16-98` triggers on pull requests to and pushes to `main`, uses cancel-in-progress concurrency, and currently runs only `lint → build → test`; each job has a 15-minute timeout, and the test job executes `npm run test:only -- --project=unit` at `.github/workflows/ci.yml:72-98`.
- `package.json:5-17` already exposes `npm run test:e2e` as `playwright test`; no package-script change is required. `npx playwright test --list` enumerated 68 tests in 16 files from the current `tests/e2e/` suite.
- `playwright.config.ts:6-17,30-58` configures `tests/e2e`, CI retries twice with one worker, uses the HTML reporter, and runs Chromium plus Firefox. `playwright.config.ts:60-79` currently starts `npm run dev` plus `tests/e2e/mock-strapi-server.mjs` on port 1337; `reuseExistingServer: !process.env.CI` already refuses to reuse an existing server in CI.
- The e2e suite is predominantly deterministic boundary-mock coverage: `tests/e2e/checkout-order-upsert.spec.ts:99-140,155-176` mocks catalog/session/payment/order calls, and `tests/e2e/payment-errors.spec.ts:7-18,26-40` mocks catalog/session/payment-intent failures. The Strapi mock exposes `/health`, `/api/products`, and `/api/categories` on the configured port at `tests/e2e/mock-strapi-server.mjs:20,90-122`.
- F7's environment findings are directly relevant: fresh CI `.next` state can trigger slow first compilation and the Next dev-server bootstrap flake (Engram #1916). The current dev-server webServer at `playwright.config.ts:66-72` therefore leaves the exact instability F5 is meant to close. The existing CI `reuseExistingServer: false` behavior means CI should not silently attach to a stale port; adding `pkill` is unnecessary and risks the self-match problem documented by F7.
- The canonical CI spec still says E2E is excluded at `openspec/specs/github-actions-ci/spec.md:37-43`, so it must be updated with the workflow change. `AGENT.md:58-61` documents only the Vitest hardware rule and does not define the complete CI verify-gate vocabulary.
- CI can avoid real service credentials: `src/lib/stripe/server.ts:15-20` documents lazy server initialization so builds succeed without Stripe secrets; however the client key getter requires a correctly formatted publishable key at `src/lib/stripe/config.ts:48-79`, and the layout provider lazily calls it at `src/components/providers/StripeProviderWrapper.tsx:14-22`. Build-time `NEXT_PUBLIC_*` values must therefore be supplied as safe CI test values. `.env.example:58-60,85-99` documents the Strapi and Stripe variable names; the e2e mock and browser routes mean no live Stripe or Strapi secret is needed.

## Affected Areas

- `.github/workflows/ci.yml:16-98` — add an `e2e` job after the existing unit-test gate, preserving npm caching, Node setup, and the release-please exclusion condition used by `.github/workflows/security.yml:17-21`.
- `playwright.config.ts:60-79` — select `npm run start` under CI while retaining `npm run dev` locally; the e2e job must run `npm run build` first so the production server never cold-compiles during browser tests.
- `openspec/specs/github-actions-ci/spec.md:16-43` — replace the E2E exclusion requirement with the new e2e gate contract.
- `AGENT.md:58-61` (or a more appropriate project test-gate section) — document that CI verification is lint, build, unit tests, and Playwright e2e, while retaining the `--maxWorkers=2` Vitest rule.
- `tests/e2e/**/*` — no test-source change is required for F5; the current 68-test, Chromium/Firefox matrix is the scope to run and baseline.
- `.env.example:58-60,85-99` — reference only; the CI job should set non-secret mock/test values rather than commit or require production credentials.

## Approaches Evaluated

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| Keep `next dev` and add only a workflow job | Smallest diff; no Playwright config change | Leaves F7's fresh `.next` first-compile and missing-bootstrap failure modes in the new gate; does not make CI deterministic | Low |
| CI-aware production server (`next build` + `next start`) | Directly addresses F7's recommendation; removes dev bootstrap/first-compile flake; preserves local dev ergonomics; existing two-server `webServer` shape supports it | Repeats the build in the e2e job because GitHub jobs do not share `.next`; requires safe build-time env values and one config change | Medium |
| Export/download `.next` from the existing build job | Avoids the duplicate build | Adds artifact lifecycle, retention, coupling, and cache/Next-version failure modes for a 30-minute CI change; still needs CI webServer switch | High |

### Recommendation

Use the CI-aware production-server approach. Add an e2e job with `needs: test`, the same checkout/setup/cache/npm-ci pattern, `npm run build`, `npx playwright install --with-deps chromium firefox`, `npm run test:e2e`, and `actions/upload-artifact@v4` for `playwright-report/` on failure. Set only mock/test environment values (`STRAPI_API_URL` and `NEXT_PUBLIC_STRAPI_API_URL` to `http://localhost:1337`, plus a non-secret `pk_test_...` publishable key) during the build/test job; do not add Stripe or Strapi secrets. Keep the existing Chromium + Firefox projects, CI serial worker, and retries. Apply the same release-please PR skip condition as `security.yml:21`. Update the canonical CI spec and `AGENT.md` gate vocabulary. Keep the e2e timeout at 15 minutes initially to match `.github/workflows/ci.yml:20,47,75`, then adjust only the e2e job after a real test PR if the 68-test/two-browser run approaches the limit.

## Risks

- **WARNING — CI runtime:** 68 listed tests execute across Chromium and Firefox with one CI worker and up to two retries (`playwright.config.ts:9-15,30-58`); the existing 15-minute job timeout may be tight. The list-only run completed in under one second but does not estimate execution time; measure the first CI test PR.
- **WARNING — Browser installation:** `npx playwright install --with-deps` can be slow or fail on runner package/browser changes. Install only the configured `chromium firefox` projects (`playwright.config.ts:31-40`) and retain the 15-minute budget initially.
- **WARNING — Environment/secrets:** client Stripe initialization requires a `pk_test_...`-shaped value (`src/lib/stripe/config.ts:48-79`), while server Stripe initialization is lazy (`src/lib/stripe/server.ts:15-20`). Supplying a CI-only test publishable key and mock Strapi URLs avoids live credentials; accidentally wiring production secrets would be a security and reliability defect.
- **WARNING — Pre-existing e2e flakiness:** F7/F4 evidence reports cart-priming failures on baseline `main` and Firefox/dev bootstrap failures (Engram #1916; `tests/e2e/checkout-order-upsert.spec.ts:122-140`). Production `next start` mitigates cold dev startup, but the first CI run must distinguish baseline suite failures from F5 wiring failures.
- **SUGGESTION — Specification drift:** `openspec/specs/github-actions-ci/spec.md:37-43` currently mandates E2E exclusion; changing the workflow without changing that spec would leave the SDD source of truth contradictory.

## Ready for Proposal

Yes. The proposal should commit to the production-server strategy, CI-only mock/test environment values, scoped browser installation, report upload on failure, the release-please skip, and synchronized CI/AGENT documentation. It should explicitly treat the first test-PR run as the runtime/baseline validation before increasing the e2e timeout or changing the browser matrix.
