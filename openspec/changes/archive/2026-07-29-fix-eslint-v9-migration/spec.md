# Delta: ESLint v9 Flat Config Migration

## Purpose

Move to ESLint v9's native flat-config format (`eslint.config.mjs`) so the
lint gate stays loadable past Next.js 16's removal of the `next lint` shim.
Anchored to the Slice B lesson: a dead `useState` import slipped past
TypeScript and was caught only post-merge. Atomic swap — new config
validated, legacy files deleted in the same commit.

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

A new unused declaration in any `.ts`/`.tsx` file MUST make `npm run lint`
exit non-zero with `@typescript-eslint/no-unused-vars`.

#### Scenario: Dead `useState` import fails lint

- GIVEN a `.tsx` with an unused `useState` import
- WHEN `npm run lint` runs
- THEN exit code is non-zero with `@typescript-eslint/no-unused-vars`

### Requirement: `react-hooks/exhaustive-deps` Enforced

A `useEffect` whose callback references a value missing from its deps array
MUST make `npm run lint` exit non-zero with `react-hooks/exhaustive-deps`.

#### Scenario: Missing dependency fails lint

- GIVEN a `useEffect` missing a referenced dep
- WHEN `npm run lint` runs
- THEN exit code is non-zero with `react-hooks/exhaustive-deps`

### Requirement: Per-File Unused-Variables Override Preserved

The flat config MUST set `@typescript-eslint/no-unused-vars: off` for
`ShopLoopHead.tsx` and `src/lib/api.ts`.

#### Scenario: Override files allow intentional unused exports

- GIVEN a deliberate unused declaration in `ShopLoopHead.tsx` and `src/lib/api.ts`
- WHEN `npm run lint` runs
- THEN exit code is 0 AND no `no-unused-vars` error is reported on either file

### Requirement: Test Files Excluded From Lint Scope

The top-level `ignores` block MUST list `**/__tests__/**`, `*.test.ts`, and
`*.test.tsx`. Test files MUST NOT be reported even when contents would fail.

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

`eslint.config.mjs` MUST import `FlatCompat` from `@eslint/eslintrc` and
call `compat.extends('next/core-web-vitals', 'next/typescript')`. Required
because `eslint-config-next@15.3.5` has no ESM `exports` field.

#### Scenario: FlatCompat extends Next preset

- GIVEN `eslint.config.mjs` at the repo root
- WHEN the file is inspected
- THEN it imports `FlatCompat` from `@eslint/eslintrc` AND calls `compat.extends('next/core-web-vitals', 'next/typescript')`

### Requirement: Lint Is a Real Pre-Merge Gate

`npm run lint` MUST be a hard pre-merge gate. `github-actions-ci` MUST
fail the build when lint exits non-zero.

#### Scenario: CI fails the build when lint exits non-zero

- GIVEN `github-actions-ci` is unmodified
- WHEN a PR introduces code that breaks lint
- THEN the lint job reports failure AND merge stays blocked

## Non-functional Properties

Deterministic, no network at lint time, no new devDependencies (bridge
uses `@eslint/eslintrc`, already declared), atomic (one commit).

## Out of Scope

No new rules/plugins/severity. No IDE config. No `github-actions-ci`
changes. No `prettier` changes. No migration to typescript-eslint v8 native
flat-config API. No README rewrite.

## Dependencies

`@eslint/eslintrc@^3` and `eslint-config-next@15.3.5` stay
backward-compatible with `compat.extends(...)`. `eslint@^9` keeps
resolving.

## Verification Hooks

`sdd-verify` and pre-commit hooks MUST check: (1) `git ls-files | grep
eslint(rc|ignore)` is empty; (2) `npm run lint` exits 0 with no
`ESLintRCConfigFile`; (3) dead `useState` fails lint with
`@typescript-eslint/no-unused-vars`; (4) missing `useEffect` dep fails
lint with `react-hooks/exhaustive-deps`; (5) unused in `ShopLoopHead.tsx`
or `src/lib/api.ts` does NOT fail lint; (6) rule-breaking `*.test.tsx`
does NOT fail lint.
