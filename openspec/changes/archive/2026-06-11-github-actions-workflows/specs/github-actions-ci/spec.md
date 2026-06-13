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
The CI workflow MUST run lint, build, and test:only sequentially.

#### Scenario: Successful run
- GIVEN clean code
- WHEN the CI workflow runs
- THEN lint, build, and test jobs MUST pass

#### Scenario: Build failure
- GIVEN code that fails to build
- WHEN the build job runs
- THEN the workflow MUST fail and stop

### Requirement: Node Version
The CI workflow MUST use the Node version from .node-version.

#### Scenario: Node alignment
- GIVEN .node-version contains 22
- WHEN setup-node runs
- THEN it MUST use Node 22

### Requirement: E2E Exclusion
The CI workflow MUST NOT run E2E or storybook tests.

#### Scenario: Scope check
- GIVEN the CI workflow is active
- WHEN tests execute
- THEN only test:only MUST run
