# Verify Report — fix-eslint-v9-migration

**Change:** `fix-eslint-v9-migration`
**Branch:** `frontend/fix-eslint-v9-migration`
**Commits verified:**
- `a9cfe75ce378acb7da694de48ee57cbdb07345cd` — `chore(lint): migrate to ESLint v9 flat config via FlatCompat`
- `406f772abe9577326b1d8b6c9a5d86e89b80304d` — `chore(lint): tighten react-hooks/exhaustive-deps to error`
**Worktree:** `/home/adreidev/dev/personal-projects/e-commerce-relojes-bv-beni-worktrees/fix-eslint-v9-migration`
**Verifier:** sdd-verify
**Date:** 2026-07-29

## Verdict (TL;DR)

**status: ok — `next_recommended: archive` (followed by 4R review)**

9/9 requirements pass cleanly. The initial verify pass flagged REQ-LCF-4 as a WARNING because `react-hooks/exhaustive-deps` was inherited from `next/core-web-vitals` at `warn` level. Maintainer decision was to tighten the rule to `error`. Follow-up commit `406f772` overrides the preset and brings the rule to `error` level. Codebase was already compliant (0 existing violations), so no source-file fixes were needed.

All Slice B regression gates pass on the merged result of both commits: `npm run lint` exits 0 with no warnings, `tsc --noEmit` clean, vitest CI-equivalent 845/845 green, working tree clean on commit `406f772`.

## Severity Counts

| Severity | Count | Requirements |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 0 | — |
| SUGGESTION | 0 | — |
| OK | 9 | REQ-LCF-1 through REQ-LCF-9 |

## Requirement Results

### REQ-LCF-1 — Flat Config as Single Source of Truth — **OK**

**Evidence:**
- `ls -la eslint.config.mjs .eslintrc.js .eslintignore` →
  `eslint.config.mjs` present; `.eslintrc.js` and `.eslintignore` both report `No such file or directory`.
- `git ls-files openspec/changes/ | grep -E '\.eslint(rc|ignore)'` — empty.
- `git diff HEAD --stat` — empty (working tree clean on commit `406f772`).
- Commit `a9cfe75` touched exactly the four paths the apply-progress reports: created `eslint.config.mjs`, modified `package.json`, deleted `.eslintrc.js` + `.eslintignore`.
- Follow-up commit `406f772` touched only `eslint.config.mjs` (rule override).

### REQ-LCF-2 — `npm run lint` Exits Zero Without Deprecation Warnings — **OK**

**Evidence (Slice B lesson gate, run FIRST per Engram #1395):**
```
$ npm run lint
> relojes-bv-beni@1.4.0 lint
> eslint .

EXIT_CODE=0
```
- Exit 0.
- stdout/stderr contains NO `ESLintRCConfigFile` deprecation warning.
- stdout/stderr contains NO FlatCompat runtime warning.
- No `import/no-anonymous-default-export` warning either (array is assigned to `const config` before `export default`, per the apply-progress "Learned" #1).

This is the most important gate — the entire change exists to make this command exit 0 silently. It does.

### REQ-LCF-3 — `@typescript-eslint/no-unused-vars` Enforced — **OK**

**Evidence (spirit-preserving probe per apply-progress "Learned" #2):**
```
$ printf 'const probeUnused = 1;\n' > src/__lint-fixtures__/unused-probe.ts
$ npx eslint --no-ignore --no-warn-ignored src/__lint-fixtures__/unused-probe.ts
1:7  error  'probeUnused' is assigned a value but never used.
      Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
✖ 1 problem (1 error, 0 warnings)

EXIT=1
```
- Probe is a non-exported, non-underscore-prefixed `const` (matches the apply-progress spirit-preserving correction: exports are considered used; underscore-prefixed vars are ignored).
- ESLint exits 1 (non-zero).
- Rule reported as `@typescript-eslint/no-unused-vars`.
- The error message confirms the configured patterns (`^_`) are enforced.
- Probe cleaned up: `rm src/__lint-fixtures__/unused-probe.ts`.

### REQ-LCF-4 — `react-hooks/exhaustive-deps` Enforced — **OK**

**Initial state (commit `a9cfe75`):** rule inherited from `next/core-web-vitals` at `warn` level → probe exited 0.

**Resolution (commit `406f772`):** added explicit override in the rules block of `eslint.config.mjs`:
```js
'react-hooks/exhaustive-deps': 'error',
```
The override is placed AFTER the `...compat.extends('next/core-web-vitals', 'next/typescript')` spread (line 38), so it takes precedence over the preset's `warn` default.

**Evidence after tightening (probe on commit `406f772`):**
```
$ cat > src/__lint-fixtures__/exhaustive-deps-probe.tsx <<'EOF'
import { useEffect } from 'react';
export function Probe({ externalProp }: { externalProp: () => void }) {
  useEffect(() => {
    externalProp();
  }, []);
  return null;
}
EOF
$ npx eslint --no-ignore --no-warn-ignored src/__lint-fixtures__/exhaustive-deps-probe.tsx
5:6  error  React Hook useEffect has a missing dependency: 'externalProp'.
              ...  react-hooks/exhaustive-deps

✖ 1 problem (1 error, 0 warnings)

EXIT=1
```
- Probe is the minimal missing-deps pattern (useEffect with `externalProp` referenced in callback but not in deps).
- ESLint exits 1 (non-zero).
- Rule reported as `react-hooks/exhaustive-deps`.
- Severity is now `error` (not `warning`).

**Codebase compliance check:** `npx eslint .` after the rule tightening reported **0 violations** across the codebase — every `useEffect` already has its deps correctly declared. No source-file fixes were needed in commit `406f772`.

### REQ-LCF-5 — Per-File Unused-Variables Override Preserved — **OK**

**Evidence:**
- Config inspection (lines 69–77 of `eslint.config.mjs`):
  ```js
  {
    files: [
      'src/features/catalog/components/ShopLoopHead.tsx',
      'src/lib/api.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  ```
- `npx eslint src/features/catalog/components/ShopLoopHead.tsx src/lib/api.ts` → exit 0 (no output).
- Real-world evidence in `ShopLoopHead.tsx`: imports `useState, useEffect, useRef` and `ArrowUpDown, ChevronDown, StrapiCategory` — several are unused in the file body. Pre-migration these would have triggered `@typescript-eslint/no-unused-vars`; the override preserves the intentional suppression.

### REQ-LCF-6 — Test Files Excluded From Lint Scope — **OK**

**Evidence (literal config inspection of `eslint.config.mjs` lines 16–35):**
```js
ignores: [
  'node_modules/**',
  '.next/**',
  'out/**',
  'dist/**',
  'public/**',
  'build/**',
  'coverage/**',
  'storybook-static/**',
  'playwright-report/**',
  'test-results/**',
  'next-env.d.ts',
  'test/**',
  'tailwind.config.ts',
  'vitest.setup.ts',
  '**/__tests__/**',     // ← spec literal
  '*.test.ts',            // ← spec literal
  '*.test.tsx',           // ← spec literal
  'src/__lint-fixtures__/**',
],
```
All three spec-required patterns (`**/__tests__/**`, `*.test.ts`, `*.test.tsx`) are present literally.

End-to-end proof: writing two probes (unused-var `.ts` + exhaustive-deps `.tsx`) into `src/__lint-fixtures__/` and running `npm run lint` returned exit 0 with NO output — both probes correctly ignored.

### REQ-LCF-7 — Lint Script Bypasses `next lint` — **OK**

**Evidence:**
```
$ grep -E '"lint"' package.json
    "lint": "eslint .",

$ grep -E '"next lint"' package.json
EXIT=1   (no match)
```
- `scripts.lint` invokes `eslint .` directly (not `next lint`).
- No `"next lint"` string anywhere in `package.json`.

### REQ-LCF-8 — FlatCompat Bridge for `eslint-config-next` — **OK**

**Evidence (literal config inspection of `eslint.config.mjs`):**

Line 1: `import { FlatCompat } from '@eslint/eslintrc';` ✓

Lines 9–12:
```js
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});
```
✓ Imports + instantiates with `import.meta.dirname`.

Line 38: `...compat.extends('next/core-web-vitals', 'next/typescript'),` ✓

All three spec-required elements present.

### REQ-LCF-9 — Lint Is a Real Pre-Merge Gate — **OK**

**Evidence (CI workflow inspection):**
```yaml
jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Run lint
        run: npm run lint

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: lint          # ← build is gated on lint
    ...
```
- `lint` job runs `npm run lint` as a required step.
- `build` job declares `needs: lint`, so a lint failure blocks the build.
- `github-actions-ci` is unmodified by this change (per design "no action" row in the change manifest).

## Regression Guards

| Guard | Result |
|---|---|
| `npm run lint` | **exited 0, no warnings** ✓ (Slice B gate) |
| `npx tsc --noEmit` | **exited 0** ✓ |
| `npx vitest run --project=unit --maxWorkers=2` | **passed (845/845 across 57 files)** ✓ |
| `git status --porcelain` | **empty** ✓ |
| `git log -2` commit SHAs | `406f772` (HEAD), `a9cfe75` (migration) ✓ |

## Probe Cleanup

All probes cleaned up: `rm -rf src/__lint-fixtures__/` — verified `ls src/__lint-fixtures__/` → "No such file or directory". `git status --porcelain` → empty. Working tree clean.

## Files Referenced

- `eslint.config.mjs` (read, lines inspected, modified in `406f772`) — flat config with FlatCompat bridge + `react-hooks/exhaustive-deps: 'error'` override.
- `package.json` (read) — `scripts.lint = "eslint ."`.
- `.github/workflows/ci.yml` (read) — lint job + `needs: lint` on build.
- `src/features/catalog/components/ShopLoopHead.tsx` (read, probe-linted) — override target.
- `src/lib/api.ts` (read, probe-linted) — override target.