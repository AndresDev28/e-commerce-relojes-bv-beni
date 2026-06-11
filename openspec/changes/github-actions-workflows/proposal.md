# Proposal: Implement GitHub Actions Workflows (CI, Security, Release-please)

## Intent

The frontend project has **zero CI/CD automation** — all linting, building, and testing is manual. This creates risk of broken builds reaching `main`, undetected security vulnerabilities, and no release automation. The backend already has proven workflows. We will mirror and adapt them for the frontend, plus add release-please for automated versioning.

## Scope

### In Scope
- **CI workflow** (`ci.yml`): lint → build → test on PRs and pushes to `main`
- **Security workflow** (`security.yml`): weekly `npm audit` + CodeQL + Trivy filesystem scan
- **Release-please workflow** (`release-please.yml`): automated versioning, changelog, and release PRs on `main`
- **`.node-version` file**: Node 22 (LTS) for `actions/setup-node`

### Out of Scope
- E2E workflow (Playwright needs running dev server; `webServer` is commented out)
- Storybook browser-mode tests in CI (flaky; keep local-only)
- `test:integration` script (no `package.json` script exists; fix deferred)

## Capabilities

### New Capabilities
- `github-actions-ci`: Continuous integration for lint, build, and unit/integration tests
- `github-actions-security`: Automated security scanning (audit, CodeQL, Trivy)
- `github-actions-release-please`: Automated versioning and changelog generation

### Modified Capabilities
- None (no existing spec-level behavior changes)

## Approach

Mirror the backend's three-workflow pattern with frontend-specific adaptations:

1. **CI**: Use `npm run test:only` (not `npm test` which double-builds). Run on `ubuntu-latest` with Node 22 via `.node-version`. Exclude E2E and storybook from this workflow.
2. **Security**: Weekly cron (`0 6 * * 1`) + manual dispatch. CodeQL language: `javascript` (CodeQL treats JS/TS together). Trivy severity: `HIGH,CRITICAL`.
3. **Release-please**: Use `googleapis/release-please-action@v4` with `release-type: node`. Package is `"private": true` — configure release-please to handle this explicitly via `release-please-config.json` and `.release-please-manifest.json`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | New | Lint, build, test on PR/push to main |
| `.github/workflows/security.yml` | New | Weekly security scanning |
| `.github/workflows/release-please.yml` | New | Automated releases on main |
| `.node-version` | New | Node 22 LTS reference for setup-node |
| `release-please-config.json` | New | Release-please package config |
| `.release-please-manifest.json` | New | Version manifest tracking |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Node 22 vs local v25 mismatch | Low | `.node-version` enforces CI version; local stays free |
| release-please fails on private package | Med | Explicit `release-type: node` config + manifest |
| npm audit fails with high-severity deps | Low | Fix before merge; security workflow runs weekly |
| E2E missing from CI | Med | Documented out of scope; add later with dev server |

## Rollback Plan

Delete `.github/workflows/` files and revert any `package.json` changes. No production impact — workflows are additive CI automation.

## Dependencies

- `googleapis/release-please-action@v4` (GitHub Marketplace)
- `github/codeql-action@v3` (GitHub native)
- `aquasecurity/trivy-action@master` (GitHub Marketplace)

## Success Criteria

- [ ] CI workflow passes on PR and push to `main` (lint, build, test)
- [ ] Security workflow passes weekly with no HIGH/CRITICAL findings unaddressed
- [ ] Release-please creates release PRs and publishes GitHub releases
- [ ] All three workflows use Node 22 via `.node-version`
- [ ] No E2E or storybook tests are required to pass in CI
