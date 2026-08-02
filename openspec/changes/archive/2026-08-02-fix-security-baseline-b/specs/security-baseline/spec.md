# Delta for security-baseline

## MODIFIED Purpose

**Before (canonical):**

> Establish a maintainable dependency-security baseline for the frontend project's development dependencies. PRs SHALL NOT reintroduce critical or high npm audit findings in the five in-scope packages, and the Trivy gate SHALL remain green. The `github-actions-security` capability continues to own the workflow configuration; this capability owns the dependency-version floor below it.

**After (applied by this delta):**

> Establish a maintainable dependency-security baseline for the frontend project's development dependencies. PRs SHALL NOT reintroduce critical or high npm audit findings in any in-scope package, and the Trivy gate SHALL remain green. The `github-actions-security` capability continues to own the workflow configuration; this capability owns the dependency-version floor below it.

> Justification: This change extends the in-scope set beyond the five DEBT-10 packages to include the Storybook family (9.1.20) and the React Email preview-server package (REMOVED — see strategy revision in Engram #1447). Specific PASS conditions for each in-scope package remain in their respective Requirements. The six existing Requirements from DEBT-10 are NOT re-emitted in this delta — they stay unchanged.

**Strategy revision (2026-08-02, post-apply-failure)**: The original plan was to downgrade `react-email` + `@react-email/preview-server` to `^4.3.2` based on the audit's recommendation at explore time. The audit DB updated between explore and apply: the new advisory covers `4.2.1 - 5.0.0-canary.12` (includes `4.3.2`), and `^4.3.2` pulls nested `next@15.5.2` which has a separate CRITICAL advisory (`9.5.0 - 15.5.20`). The apply phase demonstrated that the downgrade is a regression (1 high + 1 critical vs the original 2 high). The new strategy is to REMOVE `@react-email/preview-server` entirely (it's dead code: the `npm run email:dev` script that would invoke it is not declared in `package.json`). The `react-email` CLI remains installed for future workflow repair.

## ADDED Requirements

### Requirement: Storybook family baseline (9.1.20)

The project SHALL report zero high-severity npm audit findings against the `storybook` audit key when the direct devDependencies for the Storybook family — `storybook`, `@storybook/addon-a11y`, `@storybook/addon-docs`, `@storybook/addon-onboarding`, `@storybook/addon-vitest`, `@storybook/nextjs-vite`, `@storybook/react-vite`, and `eslint-plugin-storybook` — are pinned at `^9.1.20` or later in the 9.1.x range. When any package in the family is updated, every other direct Storybook family devDependency SHALL be updated to the same minor version in the same PR, preserving family alignment.

#### Scenario: storybook clean

- GIVEN the direct devDependencies for the Storybook family are pinned at `^9.1.20`
- WHEN `npm audit --json` is executed against the project
- THEN no high-severity finding SHALL be reported for the `storybook` audit key

#### Scenario: family version alignment

- GIVEN a PR updates any single package within the Storybook family
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
