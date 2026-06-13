# Tasks: GitHub Actions Workflows (CI, Security, Release-please)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150-180 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All 6 files: configs + 3 workflows | PR 1 | Single cohesive change; all files are additive config |

## Phase 1: Shared Configuration

- [x] 1.1 Create `.node-version` with content `22` — single-source Node version for all workflows
- [x] 1.2 Create `release-please-config.json` with `release-type: node`, `private: true`, `include-v-in-tag: true`
- [x] 1.3 Create `.release-please-manifest.json` with `{".": "0.1.0"}` — initial version tracking

## Phase 2: CI Workflow

- [x] 2.1 Create `.github/workflows/ci.yml` — trigger on `pull_request` to main + `push` to main
- [x] 2.2 Add `lint` job: `npm ci` + `npm run lint` with `actions/setup-node@v4` using `node-version-file: .node-version`
- [x] 2.3 Add `build` job: depends on lint, runs `npm run build`
- [x] 2.4 Add `test` job: depends on build, runs `npm run test:only -- --project=unit --project=integration`
- [x] 2.5 Set `permissions: contents: read` and `timeout-minutes: 15` on workflow

## Phase 3: Security Workflow

- [x] 3.1 Create `.github/workflows/security.yml` — trigger on `schedule: "0 6 * * 1"` + `workflow_dispatch`
- [x] 3.2 Add `audit` job: `npm ci` + `npm audit --audit-level=high`, fail on HIGH+
- [x] 3.3 Add `codeql` job: `github/codeql-action/init@v3` with `languages: javascript`, then `analyze@v3`
- [x] 3.4 Add `trivy` job: `aquasecurity/trivy-action@master` scanning filesystem with `severity: HIGH,CRITICAL`
- [x] 3.5 Set `permissions: contents: read, security-events: write` for CodeQL upload

## Phase 4: Release-please Workflow

- [x] 4.1 Create `.github/workflows/release-please.yml` — trigger on `push` to main branch only
- [x] 4.2 Add `release-please` job using `googleapis/release-please-action@v4` with `token: ${{ secrets.GITHUB_TOKEN }}`
- [x] 4.3 Set `permissions: contents: write, pull-requests: write` for release PR creation

## Phase 5: Verification

- [x] 5.1 Validate all YAML files with `actionlint` or manual syntax check
- [x] 5.2 Verify `test:only` command matches spec: excludes e2e and storybook projects
- [x] 5.3 Confirm all three workflows reference `.node-version` (not hardcoded version)
- [x] 5.4 Verify release-please config matches design contract: `private: true`, `release-type: node`
