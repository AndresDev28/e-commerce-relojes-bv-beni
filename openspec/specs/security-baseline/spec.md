# Security Baseline

## Purpose

Establish a maintainable dependency-security baseline for the frontend project's development dependencies. PRs SHALL NOT reintroduce critical or high npm audit findings in any in-scope package, and the Trivy gate SHALL remain green. The `github-actions-security` capability continues to own the workflow configuration; this capability owns the dependency-version floor below it.

## Requirements

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

### Requirement: Storybook family baseline (9.1.20)

The project SHALL report zero high-severity npm audit findings against the `storybook` audit key when the seven direct devDependencies for the Storybook family — `storybook`, `@storybook/addon-a11y`, `@storybook/addon-docs`, `@storybook/addon-onboarding`, `@storybook/addon-vitest`, `@storybook/nextjs-vite`, and `eslint-plugin-storybook` — are pinned at `^9.1.20` or later in the 9.1.x range. The Storybook packages `@storybook/react-vite`, `@storybook/react`, and `@storybook/builder-vite` are transitive (resolved nested under `@storybook/nextjs-vite`) and SHALL follow the direct devDependencies on bump without requiring a manifest entry. When any direct package in the family is updated, every other direct Storybook family devDependency SHALL be updated to the same minor version in the same PR, preserving family alignment.

> Spec correction (per `apply-progress.md:17-36` and `verify-report.md:98-107`): the original delta enumerated eight packages as direct. `npm ls --all` cross-check confirmed only seven are declared in `package.json`; the eighth (`@storybook/react-vite`) is transitive, as are `@storybook/react` and `@storybook/builder-vite`. Canonical text reflects the corrected 7-direct + 3-transitive split.

#### Scenario: storybook clean

- GIVEN the seven direct devDependencies for the Storybook family are pinned at `^9.1.20`
- WHEN `npm audit --json` is executed against the project
- THEN no high-severity finding SHALL be reported for the `storybook` audit key

#### Scenario: family version alignment

- GIVEN a PR updates any single direct package within the Storybook family
- WHEN the PR is reviewed
- THEN the PR SHALL update every other direct Storybook family devDependency to the same minor version, with no mixed 9.0/9.1 graph in `package.json`

### Requirement: React Email preview-server absence

The project SHALL report zero high-severity npm audit findings against `@react-email/preview-server` and zero high-severity findings against the nested `next` audit key by REMOVING `@react-email/preview-server` from `devDependencies` in `package.json` (the package is dead code: the `npm run email:dev` script that would invoke it is not declared in `package.json`, per Engram #1426). The `react-email` CLI SHALL remain installed at its current version for future workflow repair. Without the preview-server dependency, the nested `next@16.2.3` chain SHALL NOT exist in the project's dependency graph, and no advisory SHALL be reported for `@react-email/preview-server` (the package is absent). No future PR SHALL re-introduce `@react-email/preview-server` without a separately-scoped change that first demonstrates the package is in active use and audit-clean.

#### Scenario: preview-server absent

- GIVEN `@react-email/preview-server` is not declared in `package.json` `dependencies` or `devDependencies`
- WHEN `npm audit --json` is executed against the project
- THEN no high-severity finding SHALL be reported for `@react-email/preview-server` (the audit key exists only when the package is present)

#### Scenario: nested-next absent

- GIVEN `@react-email/preview-server` is not declared in `package.json`
- WHEN `npm ls next --all` is executed
- THEN no `next` resolution SHALL exist under any `@react-email/preview-server` node path, and no high-severity finding SHALL be reported for the `next` audit key as a transitive of `@react-email/preview-server`

#### Scenario: react-email CLI retained

- GIVEN the project SHALL keep `react-email` CLI installed for future workflow repair
- WHEN `package.json` is reviewed
- THEN `react-email` SHALL remain in `dependencies` at its current version, and SHALL NOT be removed by this change

#### Scenario: re-introduction requires separately-scoped change

- GIVEN `@react-email/preview-server` has been removed from the project
- WHEN a future PR proposes to re-add the package
- THEN the PR SHALL be accompanied by a separate SDD change proving the package is in active use and pulls an audit-clean `next` transitive