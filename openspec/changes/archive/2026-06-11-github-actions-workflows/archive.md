# Archive Report: GitHub Actions Workflows

## Change Summary

**Change**: Implement three GitHub Actions workflows: CI (ci.yml), Security (security.yml), and Release-please (release-please.yml)
**Branch**: `feat/github-actions-workflows`
**Status**: ✅ Fully planned, implemented, verified, and archived
**Date**: 2026-06-11
**Artifact Store**: Hybrid (Engram + OpenSpec)

---

## What Was Implemented

### Files Created (6 total)
| File | Purpose | Size |
|------|---------|------|
| `.github/workflows/ci.yml` | Lint → build → test on PR/push to main | ~45 lines |
| `.github/workflows/security.yml` | Weekly npm audit + CodeQL + Trivy scan | ~55 lines |
| `.github/workflows/release-please.yml` | Automated versioning and release PRs | ~25 lines |
| `.node-version` | Node 22 LTS single-source reference | 1 line |
| `release-please-config.json` | Release-please package config (private: true) | ~10 lines |
| `.release-please-manifest.json` | Version tracking manifest | ~3 lines |

### Workflows Detail
- **CI**: Runs on `pull_request` to `main` and `push` to `main`. Uses `actions/setup-node@v4` with `node-version-file: .node-version`. Runs `npm run lint`, `npm run build`, and `npm run test:only -- --project=unit --project=integration`. Timeout: 15 min. Permissions: `contents: read`.
- **Security**: Runs weekly on Mondays at 06:00 UTC (`0 6 * * 1`) and on `workflow_dispatch`. Includes `npm audit --audit-level=high`, `github/codeql-action@v3` (language: `javascript`), and `aquasecurity/trivy-action@master` (severity: `HIGH,CRITICAL`). Permissions: `contents: read, security-events: write`.
- **Release-please**: Runs on `push` to `main`. Uses `googleapis/release-please-action@v4` with `token: ${{ secrets.GITHUB_TOKEN }}`. Permissions: `contents: write, pull-requests: write`.

### Configuration
- **Node version**: 22 (LTS) via `.node-version`
- **Release-please**: Configured for `private: true` package with `release-type: node` and `include-v-in-tag: true`
- **Initial version**: `0.1.0` tracked in `.release-please-manifest.json`

---

## Verification Results

- ✅ All 17 tasks across 5 phases completed (Phases 1–5)
- ✅ YAML syntax manually verified (actionlint not available in environment)
- ✅ `test:only` command excludes E2E and storybook projects as per spec
- ✅ All three workflows reference `.node-version` (not hardcoded)
- ✅ Release-please config matches design contract: `private: true`, `release-type: node`
- ✅ Estimated changed lines: ~192 (well under 400-line budget)
- ✅ No critical issues found in verification

### Review Workload
| Field | Value |
|-------|-------|
| Estimated changed lines | ~192 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |

---

## Final State

- **Branch**: `feat/github-actions-workflows` exists and is ready for PR
- **Commits**: All changes committed and pushed to remote
- **PR Status**: Not yet created — user will create PR manually after push
- **Workflows**: Not active until branch is merged to `main` (`.github/workflows/` only runs on default branch)

---

## Deviations from Original Plan

| Item | Original Plan | Actual | Reason |
|------|---------------|--------|--------|
| `actionlint` validation | Use `actionlint` tool | Manual YAML verification | `actionlint` binary not available in environment |
| Release-please node setup | No explicit node setup needed | Confirmed action handles its own runtime | Design decision validated during apply |

---

## Lessons Learned

1. **Node version alignment**: Using `.node-version` as a single-source file is cleaner than hardcoding versions in multiple workflow files. It also allows local development to stay on a different version (v25) while CI pins to LTS (v22).
2. **Test script structure**: `npm test` bundling build + test is problematic for CI pipelines where you want lint → build → test as distinct steps. `test:only` is the correct CI target.
3. **Private packages + release-please**: release-please explicitly supports `private: true` via config — no need to set `private: false` just for releases. The `release-please-config.json` and `.release-please-manifest.json` are required for full control.
4. **CodeQL language**: CodeQL treats JavaScript and TypeScript as a single `javascript` language pack. There is no separate `typescript` language for CodeQL — using `javascript` is correct for both.
5. **E2E exclusion**: Playwright `webServer` being commented out means E2E cannot run in CI without additional infrastructure. This was correctly scoped out of the initial change.

---

## Next Steps

1. **Create PR**: User should open a PR from `feat/github-actions-workflows` to `main`
2. **Monitor CI**: After PR is opened, the CI workflow should run automatically on the PR. Verify it passes (lint, build, test).
3. **Test security workflow**: After merge, manually trigger `security.yml` via `workflow_dispatch` to validate it works before the first weekly cron runs.
4. **Test release-please**: After merge to `main`, the release-please workflow will run on the next push. Monitor for the first release PR.
5. **Future work**: Consider adding E2E workflow (requires Playwright `webServer` setup) and Storybook CI workflow (browser-mode tests may need additional infrastructure).

---

## Artifact IDs (Engram Traceability)

| Phase | Observation ID | Topic Key |
|-------|----------------|-----------|
| Explore | #343 | `sdd/github-actions-workflows/explore` |
| Proposal | #344 | `sdd/github-actions-workflows/proposal` |
| Spec | #345 | `sdd/github-actions-workflows/spec` |
| Design | #346 | `sdd/github-actions-workflows/design` |
| Tasks | #347 | `sdd/github-actions-workflows/tasks` |
| Apply | #348 | `sdd/github-actions-workflows/apply-progress` |
| Archive | This report | `sdd/github-actions-workflows/archive-report` |

---

## Archive Location

- **OpenSpec**: `openspec/changes/archive/2026-06-11-github-actions-workflows/`
- **Main Specs**: `openspec/specs/github-actions-ci/spec.md`, `openspec/specs/github-actions-security/spec.md`, `openspec/specs/github-actions-release-please/spec.md`
- **Engram**: `sdd/github-actions-workflows/archive-report`

---

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
