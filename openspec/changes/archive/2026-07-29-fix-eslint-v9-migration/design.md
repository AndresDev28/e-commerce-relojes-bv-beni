# Design: ESLint v9 Flat-Config Migration

## Goals & Non-goals
Make `npm run lint` invoke ESLint v9 directly, exit 0 with no legacy warnings, and catch Slice B dead declarations and missing hook dependencies before merge. Preserve current rules, overrides, and the test boundary.

Non-goals: rule/plugin additions, IDE or CI config, formatter or `tsconfig` changes, or adjacent dependency upgrades.

## Architectural Approach
One root ESM `eslint.config.mjs`. `eslint-config-next@15.3.5` has no ESM `exports` field, so its subpaths need `FlatCompat` from `@eslint/eslintrc` to bridge `next/core-web-vitals` and `next/typescript` with minimal rule drift.

## File-by-file Change Manifest

| File | Action | Reason / Requirements |
|---|---|---|
| `eslint.config.mjs` | create | Flat source, presets, rules, ignores, override, bridge (R1–R6, R8). |
| `.eslintrc.js` | delete | Remove legacy source (R1). |
| `.eslintignore` | delete | Flat ignores; remove v9 warning (R1–R2). |
| `package.json` | modify | `scripts.lint` → `eslint .`; retain `@eslint/eslintrc` (R2, R7–R8). |
| `openspec/specs/lint-config-flat/spec.md` | no action | Already canonical; `sdd-archive` syncs delta later. |
| `.github/workflows/ci.yml` | no action | `npm run lint` already gates build (R9). |

Four implementation paths change; the final two rows are contracts.

## `eslint.config.mjs` Plan

Imports: `FlatCompat`, `@eslint/js`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-config-prettier/flat`. Instantiate `FlatCompat({ baseDirectory: import.meta.dirname, recommendedConfig: js.configs.recommended })`.

Array order: (1) global `ignores` with `node_modules/**`, `.next/**`, `out/**`, `dist/**`, `public/**`, `build/**`, `coverage/**`, `storybook-static/**`, `playwright-report/**`, `test-results/**`, `next-env.d.ts`, `test/**`, `tailwind.config.ts`, `vitest.setup.ts`, plus literal `**/__tests__/**`, `*.test.ts`, `*.test.tsx`, and `src/__lint-fixtures__/**` (transient verification probes; excluded so they never get linted or accidentally committed); (2) `js.configs.recommended`; (3) `...compat.extends('next/core-web-vitals', 'next/typescript')`; (4) parser/plugins, React detection, and the existing `react/react-in-jsx-scope`, `no-empty`, and configured `@typescript-eslint/no-unused-vars` rules; (5) `files:` naming exactly `src/features/catalog/components/ShopLoopHead.tsx` and `src/lib/api.ts`, setting that rule `off`; (6) Prettier flat config LAST. Use literal extension globs, never `{...}` patterns: the repo’s `brace-expansion` override breaks minimatch brace expansion.

## Commit Strategy
Branch `frontend/fix-eslint-v9-migration`; one atomic commit after all checks:

`chore(lint): migrate to ESLint v9 flat config via FlatCompat`

Body: `Replace deprecated next lint with the ESLint v9 flat config, preserving presets, ignores, and overrides. Closes the Slice B lint-gate leak where dead useState escaped tsc/vitest. Motivation: Engram #1403. IDE extensions may need Developer: Reload Window; not a CI blocker.`

## Verification Plan
Run these nine checks, in order, before commit:

1. `npx eslint .` — exit 0, no warnings.
2. `npx eslint src/features/catalog/components/ShopLoopHead.tsx src/lib/api.ts` — exit 0.
3. `npx eslint --rule '{"@typescript-eslint/no-unused-vars":"error"}' src/features/checkout/components/CheckoutForm.tsx` — exit 0.
4. Inline rule-positive probe (proves the project's flat config catches dead declarations end-to-end — covers REQ-LCF-3 and REQ-LCF-9 in one shot): `printf 'const probeUnused = 1;\n' > src/__lint-fixtures__/unused-probe.ts && npx eslint --no-ignore --no-warn-ignored src/__lint-fixtures__/unused-probe.ts; PROBE_EXIT=$?; rm src/__lint-fixtures__/unused-probe.ts; test $PROBE_EXIT -ne 0` — non-zero exit, reports `@typescript-eslint/no-unused-vars`. Two corrections vs. the original draft: (a) probe body uses `const probeUnused = 1;` (NOT `export const`) because `@typescript-eslint/no-unused-vars` excludes exports by default — exports may be imported from elsewhere, so they count as "used"; (b) `--no-ignore --no-warn-ignored` is needed because `src/__lint-fixtures__/**` is in the global `ignores` block (so the probe is intentionally invisible to a plain `npx eslint` run; we explicitly bypass that here to prove the rule still fires when the file is linted). The probe directory stays in the global `ignores` block so transient probes never get accidentally linted or committed. (Earlier draft used `/tmp/test-unused.ts` + `--no-eslintrc`, which fails on ESLint 9.30.1: `--no-eslintrc` is the legacy flag renamed to `--no-config-lookup`, and ESLint 9 refuses paths outside its base path.)
5. `npx tsc --noEmit` — exit 0.
6. `npx vitest run --maxWorkers=2` — exit 0.
7. `git status` — only new `eslint.config.mjs`, modified `package.json`, deleted `.eslintrc.js`/`.eslintignore`.
8. `git grep -E '\.eslintrc\.(js|json|cjs|mjs)' -- ':!*.md'` — exit 1.
9. `grep -E '"next lint"' package.json` — exit 1.

## Risk-driven Execution Order

1. Create `eslint.config.mjs` (malformed shape; preserve legacy rules).
2. `npx eslint .` (R2; require exit 0).
3. Smoke-test rule enforcement (silent loss; prove REQ-LCF-3/4/9).
4. Smoke-test both override files (R1, HIGH; require exit 0).
5. Smoke-test test ignores (R3-equivalent scope).
6. Change `scripts.lint` (CI shim risk).
7. Delete legacy files only after green checks (broken state risk).
8. Run all §6 checks (regression).
9. Stage four paths and commit (non-atomic index); inspect names first. Rollback: `git checkout HEAD -- .eslintrc.js .eslintignore package.json && rm eslint.config.mjs`.

## Cross-cutting Concerns
- IDE stale diagnostics may need reload window; commit body note, not blocker.
- CI: `.github/workflows/ci.yml` already runs `npm run lint`; transparent change.
- Hooks: no `.husky`/lint-staged; pre-commit runs `tsc` only.
- `openspec/specs/github-actions-ci/spec.md` unchanged.

### Threat matrix
| Boundary | Status / response / RED |
|---|---|
| Documentation-like paths | N/A; no executable classification. |
| Git repository selection | N/A; no selector automation; repo root assumed. |
| Commit state | Applicable: four staged paths only; extras/omissions fail/rollback; RED staged-name assertion. |
| Push state | N/A; no push automation. |
| PR commands | N/A; no PR automation. |

## Out of Scope Confirmation
NO rule or plugin additions, IDE or CI config, formatter changes, `eslint-config-next` upgrade, ESLint-adjacent bumps, or `tsconfig`/README edits.

## Acceptance criteria for sdd-verify
| Requirement | File/contract |
|---|---|
| Flat Config as Single Source of Truth | `eslint.config.mjs` + two legacy deletions. |
| `npm run lint` exits zero without warnings | Config + `package.json`. |
| `@typescript-eslint/no-unused-vars` enforced | Config rule/preset. |
| `react-hooks/exhaustive-deps` enforced | Next compat presets. |
| Per-File Unused-Variables Override Preserved | Named `files:` block. |
| Test Files Excluded From Lint Scope | Top-level `ignores`. |
| Lint Script Bypasses `next lint` | `package.json`. |
| FlatCompat Bridge for `eslint-config-next` | Config import/call; devDep retained. |
| Lint Is a Real Pre-Merge Gate | `package.json` via unchanged CI. |
