# Exploration: GitHub Actions Workflows (CI, Security, Release-please)

## Current State

The frontend project (`e-commerce-relojes-bv-beni`) is a **Next.js 15 + React 19 + TypeScript** e-commerce application deployed on Vercel. It has **no `.github/workflows/` directory** — zero CI/CD automation exists today. All linting, testing, and building is done locally by the developer.

The **backend project** (`e-commerce-relojes-bv-beni-api`) already has three workflows:
- `ci.yml` — lint → build → test on PRs/pushes to main
- `security.yml` — weekly npm audit + CodeQL + Trivy scans
- `release.yml` — tag-based GitHub Release via `softprops/action-gh-release@v2`

The frontend uses **npm** (lockfile v3), Node.js (local v25.9.0, backend uses `.node-version` with `22`), Vitest for unit/integration tests, Playwright for E2E, and Storybook for component tests.

## Affected Areas

- **`.github/workflows/`** — Does not exist yet; needs to be created
- **`package.json`** — Scripts may need adjustment for CI (notably `test` bundles build+test; `test:only` skips build)
- **`.node-version`** — Missing; CI needs a Node version reference
- **`vitest.config.ts`** — Defines test projects (unit, storybook, integration); CI should run specific projects
- **`playwright.config.ts`** — `webServer` is commented out; E2E in CI needs a running server

## Approaches

### 1. Mirror Backend Workflows (Recommended)

Adapt the backend's three workflows to the frontend, adjusting commands and adding frontend-specific concerns.

- **Pros**: Consistent pattern across repos; proven in backend; easy to implement
- **Cons**: `release.yml` in backend uses tag-based releases, not release-please; need to decide if we want release-please or keep the simpler approach
- **Effort**: Low

### 2. Mirror + Release-please Instead of Tag-based Release

Same as Approach 1 but replace `release.yml` with a proper `release-please` workflow that auto-creates PRs for version bumps and generates changelogs.

- **Pros**: Automated versioning; CHANGELOG generation; semantic versioning enforcement; industry best practice
- **Cons**: Slightly more setup; needs `release-please-config.json` and `.release-please-manifest.json`; package is `"private": true` which may need config adjustment
- **Effort**: Medium

### 3. Minimal CI Only

Just add `ci.yml` with lint/build/test; skip security and release workflows for now.

- **Pros**: Quick to implement; catches the most critical issues (broken builds on PRs)
- **Cons**: No security scanning; no release automation; incomplete compared to backend
- **Effort**: Low

## Recommendation

**Approach 2: Mirror + Release-please.** This gives the best value:
- CI workflow catches broken builds/lint/test failures on every PR
- Security workflow catches vulnerable dependencies and code issues weekly
- Release-please automates versioning and changelog — the user explicitly asked for this over the simpler tag-based release

### CI Workflow Details (`ci.yml`)

- **Triggers**: PRs to main + pushes to main
- **Steps**: checkout → setup node (using `.node-version`) → npm ci → lint → build → test (unit + integration via `vitest run`)
- **Key decision**: Use `npm run test:only` (not `npm test` which bundles build) since build runs as a separate step
- **Skip E2E in CI**: Playwright E2E needs a running server + browser setup; keep as separate workflow or manual trigger
- **Skip Storybook tests**: Browser-mode tests are flaky in CI; run locally or in a dedicated workflow

### Security Workflow Details (`security.yml`)

- **Triggers**: Weekly schedule (cron) + manual dispatch
- **Steps**: checkout → setup node → npm ci → npm audit → CodeQL analysis → Trivy filesystem scan
- **Languages for CodeQL**: `javascript` (not `typescript` — CodeQL treats JS/TS together)

### Release-please Workflow Details (`release-please.yml`)

- **Triggers**: Pushes to main branch
- **Uses**: `googleapis/release-please-action@v4`
- **Config**: Needs `release-please-config.json` and `.release-please-manifest.json`
- **Note**: Package is `"private": true`; release-please can still work with `"private": true` but needs explicit config to handle it

## Risks

- **No `.node-version` file**: CI will need one or a hardcoded version. Should create this file.
- **`npm test` bundles `npm run build`**: Using `npm test` in CI would double the build step. Must use `npm run test:only` or restructure scripts.
- **E2E tests need a running server**: Playwright config has `webServer` commented out. Cannot be easily run in CI without additional setup. Recommend excluding from CI for now.
- **Storybook tests use browser mode**: Vitest's storybook project uses Playwright browser — may need special CI permissions and is flaky. Recommend excluding from CI.
- **`"private": true`**: release-please may need explicit config to create releases for private packages.
- **Node version mismatch**: Local machine runs v25.9.0 but backend uses v22. Should standardize on v22 (LTS) for CI.

## Ready for Proposal

**Yes.** Proceed to `sdd-propose` with the change: "Implement GitHub Actions workflows: CI (ci.yml), Security (security.yml), and Release-please (release-please.yml)"