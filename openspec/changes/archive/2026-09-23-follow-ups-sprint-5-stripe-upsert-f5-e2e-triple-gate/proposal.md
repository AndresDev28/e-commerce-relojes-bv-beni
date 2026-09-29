# Proposal: follow-ups/sprint-5-stripe-upsert/F5-e2e-triple-gate

## Intent

Add Playwright e2e coverage to CI so PRs catch browser-level regressions that lint, build, and unit tests miss. The current CI workflow stops at `lint → build → test` (`.github/workflows/ci.yml:16-98`) even though the repo already has `npm run test:e2e` (`package.json:5-17`) and a 68-test suite. This change closes that gap while avoiding the dev-server cold-start flakes seen in F7 by using `next build && next start` only in CI (`playwright.config.ts:66-79`).

## Scope

### In Scope

- Add an `e2e` job to `.github/workflows/ci.yml` after `test`, with release-please skipping matching `.github/workflows/security.yml:21`.
- Switch Playwright CI startup from `npm run dev` to a CI-aware production server while keeping local development unchanged (`playwright.config.ts:66-79`).
- Update the canonical CI spec and `AGENT.md` gate vocabulary to include e2e coverage.

### Out of Scope

- WebKit, sharding, or wider browser-matrix expansion.
- E2E test-source changes or fixes for local F7-only flakiness.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `github-actions-ci`: replace the current E2E-exclusion requirement (`openspec/specs/github-actions-ci/spec.md:37-43`) with an E2E-inclusion requirement covering the new Playwright verify gate.

## Approach

Use a dedicated CI `e2e` job with `needs: test`, `npm ci`, `npm run build`, `npx playwright install --with-deps chromium firefox`, and `npm run test:e2e`, then upload `playwright-report/` on failure. Provide only safe CI env values: `STRAPI_API_URL` and `NEXT_PUBLIC_STRAPI_API_URL` pointing to `http://localhost:1337` (`.env.example:60-61`) plus a `pk_test_...` publishable key that satisfies frontend validation (`src/lib/stripe/config.ts:48-79`). No Stripe secret is required because server Stripe init is lazy (`src/lib/stripe/server.ts:15-30`).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | Modified | Add CI e2e gate and artifact upload |
| `playwright.config.ts` | Modified | Use `next start` in CI, keep `next dev` locally |
| `openspec/specs/github-actions-ci/spec.md` | Modified | Replace E2E exclusion with inclusion |
| `AGENT.md` | Modified | Document CI verify-gate vocabulary |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| 68-test two-browser run exceeds 15 min | Med | Measure first PR run before changing timeout |
| Browser install/runtime flakes in CI | Med | Install only Chromium + Firefox and upload HTML report |
| Missing CI env values break frontend startup | Low | Use documented mock URLs and `pk_test_...` key only |

## Rollback Plan

Revert the `e2e` job and Playwright CI server switch, restoring CI to `lint → build → test` only and the current E2E-exclusion spec wording.

## Dependencies

- Existing Playwright suite and `test:e2e` script (`package.json:16`)
- F7 merged to main before apply

## Success Criteria

- [ ] CI runs `lint`, `build`, `test`, and `e2e` on non-release-please PRs to `main`.
- [ ] Playwright CI uses production startup, uploads `playwright-report/` on failure, and requires no live Stripe or Strapi secrets.
