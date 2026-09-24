# GitHub Actions CI

## Purpose
Automated lint, build, and test on every PR and push to main.

## Requirements

### Requirement: CI Triggers
The CI workflow MUST trigger on pull requests to main and pushes to main.

#### Scenario: PR opened
- GIVEN a PR targeting main
- WHEN the PR is opened or synchronized
- THEN the CI workflow MUST run

### Requirement: CI Jobs
The CI workflow MUST run lint, build, test, and e2e sequentially, and the e2e gate MUST depend on test succeeding.
(Previously: "The CI workflow MUST run lint, build, and test:only sequentially." — e2e was not a gate.)

#### Scenario: Successful run
- GIVEN clean code
- WHEN the CI workflow runs
- THEN the lint, build, test, and e2e jobs MUST pass

#### Scenario: Build failure
- GIVEN code that fails to build
- WHEN the build job runs
- THEN the workflow MUST fail and stop
- AND the downstream test and e2e jobs MUST NOT run

#### Scenario: E2E failure blocks the pipeline
- GIVEN a browser-level regression that passes lint, build, and test
- WHEN the CI workflow runs
- THEN the e2e job MUST fail the workflow

#### Scenario: E2E success completes the workflow
- GIVEN lint, build, and test passed
- WHEN the e2e job completes successfully
- THEN the workflow MUST succeed

### Requirement: Node Version
The CI workflow MUST use the Node version from .node-version.

#### Scenario: Node alignment
- GIVEN .node-version contains 22
- WHEN setup-node runs
- THEN it MUST use Node 22

### Requirement: E2E Inclusion
The CI workflow MUST run the Playwright end-to-end suite as a required verification gate against the application served in production mode. The gate MUST cover the configured browser matrix, MUST pass using only non-secret test environment values, MUST publish the HTML report as a workflow artifact on failure, and MUST skip release-automation pull requests. Storybook tests SHALL NOT be part of the workflow.
(Previously: E2E Exclusion — "The CI workflow MUST NOT run E2E or storybook tests.")

#### Scenario: E2E gate executes
- GIVEN a pull request to main that is not a release-automation PR
- WHEN the workflow reaches the e2e job
- THEN the suite MUST run against a production-mode server and the local Strapi mock

#### Scenario: Browser matrix scope
- GIVEN the e2e job provisions browsers
- WHEN tests execute
- THEN only Chromium and Firefox projects MUST run

#### Scenario: Non-secret environment values only
- GIVEN the e2e job supplies only a test publishable Stripe key and localhost mock Strapi URLs
- WHEN the production server starts and tests run
- THEN the job MUST complete without live Stripe or Strapi credentials
- AND if a required build-time value is missing, the job MUST fail rather than silently pass

#### Scenario: Release-automation skip
- GIVEN a pull request from a release-please branch
- WHEN the CI workflow triggers
- THEN the e2e job MUST be skipped

#### Scenario: Report uploaded on failure
- GIVEN an e2e run with one or more failing tests
- WHEN the job ends
- THEN the Playwright HTML report MUST be downloadable as a workflow artifact

#### Scenario: Local development preserved
- GIVEN a developer running `npm run test:e2e` outside CI
- WHEN Playwright starts the webServer locally
- THEN the dev server MUST be used (production mode MUST NOT activate)

