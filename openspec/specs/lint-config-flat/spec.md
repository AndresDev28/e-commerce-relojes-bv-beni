# Lint Config Flat Specification

## Purpose

The project runs ESLint as a hard pre-merge gate. This spec defines the
required shape of the ESLint configuration: ESLint v9's native flat-config
format loaded from `eslint.config.mjs`, `next/core-web-vitals` bridged
through `FlatCompat` from `@eslint/eslintrc`, per-file overrides preserved
for two known noisy files, and test files excluded from the lint surface.

## Requirements

### Requirement: Flat Config as Single Source of Truth

`eslint.config.mjs` (ESM) at the repo root is the only ESLint configuration.
No `.eslintrc.{js,cjs,json,mjs}` or `.eslintignore` file MAY be tracked.

#### Scenario: Only `eslint.config.mjs` is tracked

- GIVEN the merged commit on the default branch
- WHEN `git ls-files | grep -E '\.eslint(rc|ignore)(\.[a-z]+)?$'` runs
- THEN zero paths are returned AND `eslint.config.mjs` is in `git ls-files`

### Requirement: `npm run lint` Exits Zero Without Deprecation Warnings

`npm run lint` on a clean tree MUST exit 0 with no `ESLintRCConfigFile`,
FlatCompat, or "config file not found" message in output.

#### Scenario: Clean tree passes lint silently

- GIVEN a working tree satisfying every other requirement in this spec
- WHEN `npm run lint` runs
- THEN exit code is 0 AND no `ESLintRCConfigFile` or `Cannot find config file` is printed

### Requirement: `@typescript-eslint/no-unused-vars` Enforced

A new unused declaration in any `.ts`/`.tsx` file MUST cause `npm run lint`
to exit non-zero with `@typescript-eslint/no-unused-vars` in stderr.

#### Scenario: Dead `useState` import fails lint

- GIVEN a `.tsx` file with a new unused `useState` import
- WHEN `npm run lint` runs
- THEN exit code is non-zero AND stderr includes `@typescript-eslint/no-unused-vars`

### Requirement: `react-hooks/exhaustive-deps` Enforced

A `useEffect` whose callback references a value missing from its deps array
MUST cause `npm run lint` to exit non-zero with `react-hooks/exhaustive-deps`
in stderr.

#### Scenario: Missing dependency fails lint

- GIVEN a `useEffect` whose deps array omits a referenced value
- WHEN `npm run lint` runs
- THEN exit code is non-zero AND stderr includes `react-hooks/exhaustive-deps`

### Requirement: Per-File Unused-Variables Override Preserved

The flat config MUST set `@typescript-eslint/no-unused-vars: off` for
`ShopLoopHead.tsx` and `src/lib/api.ts`.

#### Scenario: Override files allow intentional unused exports

- GIVEN a deliberate unused declaration in `ShopLoopHead.tsx` and `src/lib/api.ts`
- WHEN `npm run lint` runs
- THEN exit code is 0 AND no `no-unused-vars` error is reported on either file

### Requirement: Test Files Excluded From Lint Scope

The top-level `ignores` block MUST list `**/__tests__/**`, `*.test.ts`, and
`*.test.tsx`. Test files MUST NOT be reported even when their contents would
fail active rules.

#### Scenario: Test ignored, non-test source still linted

- GIVEN a new `*.test.tsx` with an unused import AND a non-test `.ts` with an unused import
- WHEN `npm run lint` runs
- THEN exit code is non-zero AND only the non-test file is reported

### Requirement: Lint Script Bypasses `next lint`

`package.json` `scripts.lint` MUST invoke `eslint .` directly, NOT
`next lint`.

#### Scenario: `scripts.lint` does not reference `next lint`

- GIVEN the merged `package.json`
- WHEN `node -e "console.log(require('./package.json').scripts.lint)"` runs
- THEN output contains `eslint` AND does NOT contain `next lint`

### Requirement: FlatCompat Bridge for `eslint-config-next`

`eslint.config.mjs` MUST import `FlatCompat` from `@eslint/eslintrc` and use
`compat.extends(...)` for `next/core-web-vitals` and `next/typescript`,
because `eslint-config-next@15.3.5` has no ESM `exports` field.

#### Scenario: FlatCompat extends Next preset

- GIVEN `eslint.config.mjs` at the repo root
- WHEN the file is inspected
- THEN it imports `FlatCompat` from `@eslint/eslintrc` AND calls `compat.extends('next/core-web-vitals', 'next/typescript')` AND `@eslint/eslintrc` stays in `devDependencies`

### Requirement: Lint Is a Real Pre-Merge Gate

`npm run lint` MUST be a hard pre-merge gate. `github-actions-ci` (already
running lint on every PR) MUST continue to fail the build when lint exits
non-zero.

#### Scenario: CI fails the build when lint exits non-zero

- GIVEN `github-actions-ci` is unmodified from its current state
- WHEN a PR introduces code that breaks lint
- THEN the lint job reports failure AND merge stays blocked until lint is green
