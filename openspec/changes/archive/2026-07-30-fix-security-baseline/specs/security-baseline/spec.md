# Capability: security-baseline

## Purpose

Establish a maintainable dependency-security baseline for the frontend project's development dependencies. PRs SHALL NOT reintroduce critical or high npm audit findings in the five in-scope packages, and the Trivy gate SHALL remain green. The `github-actions-security` capability continues to own the workflow configuration; this capability owns the dependency-version floor below it.

## ADDED Requirements

### Requirement: npm audit baseline — vitest trio

The project SHALL report zero critical-severity npm audit findings against `vitest`, `@vitest/browser`, and `@vitest/coverage-v8` when their direct devDependencies are pinned at `^3.2.7` or later in the 3.x range.

#### Scenario: vitest trio clean

- GIVEN the direct devDependencies for the vitest trio are pinned at `^3.2.7`
- WHEN `npm audit --json` is executed against the project
- THEN no critical-severity finding SHALL be reported for `vitest`, `@vitest/browser`, or `@vitest/coverage-v8`

### Requirement: npm audit baseline — js-yaml override

The project SHALL report zero high-severity npm audit findings against `js-yaml` by pinning an override in `package.json` at `^4.3.0` or later in the 4.x range.

#### Scenario: js-yaml clean

- GIVEN `js-yaml` is pinned via the `overrides` block at `^4.3.0`
- WHEN `npm audit --json` is executed against the project
- THEN no high-severity finding SHALL be reported for `js-yaml`

### Requirement: npm audit baseline — @babel/core override

The project SHALL report zero low-or-higher npm audit findings against `@babel/core` by pinning an override in `package.json` at `^7.29.7` or later in the 7.x range.

#### Scenario: @babel/core clean

- GIVEN `@babel/core` is pinned via the `overrides` block at `^7.29.7`
- WHEN `npm audit --json` is executed against the project
- THEN no finding of any severity SHALL be reported for `@babel/core`

### Requirement: Trivy gate stays green

The Trivy job in `.github/workflows/security.yml` SHALL complete with exit code 0 on every PR that updates this baseline.

#### Scenario: PR with baseline update

- GIVEN a PR modifies `package.json` or `package-lock.json` to update this baseline
- WHEN the security workflow runs on the PR branch
- THEN the Trivy job SHALL exit with code 0 before the PR may be merged

### Requirement: baseline changes are manifest-only

PRs that update this baseline SHALL modify only `package.json` and `package-lock.json`.

#### Scenario: PR diff scope

- GIVEN a PR is opened to update this baseline
- WHEN the diff is reviewed
- THEN it SHALL contain only changes to `package.json` and `package-lock.json`, with no edits under `src/`, `tests/`, `vitest.config.ts`, `vitest.setup.ts`, or any workflow file

### Requirement: alphabetical overrides order

The `overrides` block in `package.json` SHALL maintain alphabetical ordering by package name.

#### Scenario: override entries added

- GIVEN a new override entry is added to the `overrides` block
- WHEN the `package.json` file is committed
- THEN the block SHALL remain in alphabetical order without disturbing existing entries