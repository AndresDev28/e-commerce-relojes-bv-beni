# Tasks: Fix ESLint v9 Migration (Flat Config)

## Summary

Single atomic commit on `frontend/fix-eslint-v9-migration`, ~100 changed lines (additions + deletions), 4 paths: create `eslint.config.mjs` at repo root, modify `package.json` `scripts.lint` from `next lint` to `eslint .`, delete `.eslintrc.js` and `.eslintignore`. All seven work units land in one commit — splitting them would create a broken-lint intermediate commit (design R4). The seven WUs below are review checkpoints inside that one commit, executed in order.

## Work Units

### WU-1: Author `eslint.config.mjs` with FlatCompat bridge

Sub-steps:

- [ ] 1.1 Create `/home/adreidev/dev/personal-projects/e-commerce-relojes-bv-beni/eslint.config.mjs` at the project root (ESM).
- [ ] 1.2 Add the seven ESM imports per design §"`eslint.config.mjs` Plan": `FlatCompat` from `@eslint/eslintrc`, `@eslint/js`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-config-prettier/flat`. All seven are already resolvable (verified: `@eslint/js@9.30.1`, `@typescript-eslint/parser@8.38.0`, `eslint-plugin-react-hooks@5.2.0`, `eslint-plugin-react@7.37.5` present in `node_modules`); no new devDependencies needed.
- [ ] 1.3 Instantiate `FlatCompat({ baseDirectory: import.meta.dirname, recommendedConfig: js.configs.recommended })` — uses `import.meta.dirname` per design (modern ESLint v9 pattern).
- [ ] 1.4 Emit the top-level `ignores` block with literal globs (NO `{...}` brace expansion — the repo's `brace-expansion@^5.0.8` override breaks minimatch brace expansion, design §"`eslint.config.mjs` Plan` last sentence). Patterns: `node_modules/**`, `.next/**`, `out/**`, `dist/**`, `public/**`, `build/**`, `coverage/**`, `storybook-static/**`, `playwright-report/**`, `test-results/**`, `next-env.d.ts`, `test/**`, `tailwind.config.ts`, `vitest.setup.ts`, `**/__tests__/**`, `*.test.ts`, `*.test.tsx`, `src/__lint-fixtures__/**`.
- [ ] 1.5 Build the array in this exact order: (1) `ignores` block → (2) `js.configs.recommended` → (3) `...compat.extends('next/core-web-vitals', 'next/typescript')` → (4) parser/plugins/rules block carrying over `react/react-in-jsx-scope: off`, `no-empty: ['error', { allowEmptyCatch: true }]`, and the `@typescript-eslint/no-unused-vars` config with `argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'`, `caughtErrorsIgnorePattern: '^_'` (mirrors `.eslintrc.js` lines 17–26) + `settings.react.version: 'detect'` → (5) `files:` block naming exactly `src/features/catalog/components/ShopLoopHead.tsx` and `src/lib/api.ts` setting `@typescript-eslint/no-unused-vars: off` → (6) Prettier flat config LAST.
- [ ] 1.6 Save the file (do NOT delete legacy files yet).

**Verification** (gates this WU):

- `npx eslint .` exits 0 with no warnings (design step 1) — proves FlatCompat bridge loads, ignores apply, and current tree is clean.
- `cat eslint.config.mjs | grep -c 'compat.extends'` reports exactly 1 line containing `next/core-web-vitals` and exactly 1 line containing `next/typescript`.

**Rollback**: `rm eslint.config.mjs`. The legacy `.eslintrc.js` and `.eslintignore` are untouched at this stage.

**Requirements satisfied**: REQ-LCF-1, REQ-LCF-3, REQ-LCF-4, REQ-LCF-5, REQ-LCF-6, REQ-LCF-8 (creates the canonical flat config; legacy deletions and lint-script change come in WU-5 and WU-4).

**Risks addressed**: R2 (HIGH — `eslint-config-next@15.3.5` has no ESM `exports` field, bridged via FlatCompat), R3 (MEDIUM — rule keys preserved verbatim from `.eslintrc.js` lines 17–43), R1 (HIGH — named `files:` block carries over the per-file override before legacy deletion).

---

### WU-2: Smoke-test that the new flat config catches dead declarations

Sub-steps:

- [ ] 2.1 Create the fixture directory if it does not exist: `mkdir -p src/__lint-fixtures__` (already covered by the global `ignores` block per design).
- [ ] 2.2 Write the probe file: `printf 'export const x = 1;\n' > src/__lint-fixtures__/unused-probe.ts`.
- [ ] 2.3 Run `npx eslint src/__lint-fixtures__/unused-probe.ts; echo "EXIT=$?"` — expect non-zero exit and stderr including `@typescript-eslint/no-unused-vars`.
- [ ] 2.4 Remove the probe: `rm src/__lint-fixtures__/unused-probe.ts`.
- [ ] 2.5 Verify `src/__lint-fixtures__/` is still empty (no leftover artifacts to commit): `ls src/__lint-fixtures__/`.

**Verification** (gates this WU):

- Design step 4 (`PROBE_EXIT -ne 0` AND stderr mentions `@typescript-eslint/no-unused-vars`) — proves the project's flat config catches dead declarations end-to-end and covers REQ-LCF-3 + REQ-LCF-9 expectations.
- `git status` after step 2.4: zero paths under `src/__lint-fixtures__/` are staged.

**Rollback**: `rm -rf src/__lint-fixtures__/`. The fixture is intentionally outside the lint surface (ignored via `src/__lint-fixtures__/**` in WU-1's ignores block) and removed before commit.

**Requirements satisfied**: REQ-LCF-3, REQ-LCF-9 (end-to-end rule enforcement before the legacy deletion).

**Risks addressed**: R3 (MEDIUM — silent rule loss during flat-config translation; the probe is the empirical proof that `@typescript-eslint/no-unused-vars` is wired in).

---

### WU-3: Smoke-test per-file overrides for `ShopLoopHead.tsx` and `src/lib/api.ts`

Sub-steps:

- [ ] 3.1 Run `npx eslint src/features/catalog/components/ShopLoopHead.tsx src/lib/api.ts` — expect exit 0 (design step 2). Proves the named `files:` block is wired and the two files are still in scope.
- [ ] 3.2 Run the negative probe: introduce a temporary unused export in `src/features/catalog/components/ShopLoopHead.tsx` (e.g., append `export const _overrideProbe = 1;`), run `npx eslint src/features/catalog/components/ShopLoopHead.tsx`, expect exit 0 (override suppresses `no-unused-vars`). Then revert the edit. Repeat for `src/lib/api.ts`.
- [ ] 3.3 Confirm `git status` for both files reports zero changes after revert — the probe edits MUST NOT land in the commit.

**Verification** (gates this WU):

- Design step 2: `npx eslint src/features/catalog/components/ShopLoopHead.tsx src/lib/api.ts` exits 0.
- Negative probe (step 3.2): exit 0 on both files despite intentional unused export — proves `@typescript-eslint/no-unused-vars: off` is in effect for those exact paths.
- `git diff src/features/catalog/components/ShopLoopHead.tsx src/lib/api.ts` returns empty after revert.

**Rollback**: `git checkout -- src/features/catalog/components/ShopLoopHead.tsx src/lib/api.ts` (the probe edits are discarded; the override files themselves are unchanged in the commit).

**Requirements satisfied**: REQ-LCF-5 (Per-File Unused-Variables Override Preserved — explicitly named in the `files:` block).

**Risks addressed**: R1 (HIGH — per-file overrides lost when porting `.eslintrc.js` lines 33–43; this WU is the headline guard against R1).

---

### WU-4: Switch `package.json` `scripts.lint` from `next lint` to `eslint .`

Sub-steps:

- [ ] 4.1 Edit `/home/adreidev/dev/personal-projects/e-commerce-relojes-bv-beni/package.json` line 9 only: change `"lint": "next lint"` to `"lint": "eslint ."`. No other fields change; `@eslint/eslintrc` stays in `devDependencies` as already declared (line 39).
- [ ] 4.2 Confirm `grep -E '"next lint"' package.json` exits 1 (design step 9).
- [ ] 4.3 Confirm `node -e "console.log(require('./package.json').scripts.lint)"` prints a string containing `eslint` and NOT `next lint`.

**Verification** (gates this WU):

- Design step 9: `grep -E '"next lint"' package.json` exits 1.
- `npm run lint` exits 0 with no `ESLintRCConfigFile` deprecation warning — full clean lint run.

**Rollback**: `git checkout HEAD -- package.json` reverts the one-line change.

**Requirements satisfied**: REQ-LCF-7 (Lint Script Bypasses `next lint`), REQ-LCF-9 (Lint Is a Real Pre-Merge Gate — `npm run lint` still invoked by `.github/workflows/ci.yml` line 42).

**Risks addressed**: R4 (MEDIUM — atomic swap ordering; this WU runs BEFORE WU-5 so the working tree has the new script but still has legacy config files, so `npm run lint` could pick the wrong config; mitigated because `eslint.config.mjs` from WU-1 takes priority over `.eslintrc.js` when both exist).

---

### WU-5: Delete `.eslintrc.js` and `.eslintignore`

Sub-steps:

- [ ] 5.1 `git rm .eslintrc.js` — confirm `git status` shows `D .eslintrc.js`.
- [ ] 5.2 `git rm .eslintignore` — confirm `git status` shows `D .eslintignore`.
- [ ] 5.3 Run `git grep -E '\.eslintrc\.(js|json|cjs|mjs)' -- ':!*.md'` — expect exit 1 (design step 8). Any stray references in source code are a discoverable problem; surface to orchestrator if found.
- [ ] 5.4 Run `npx eslint .` — expect exit 0, no warnings (design step 1, post-deletion). Proves the legacy files are truly gone and the flat config is the sole source.

**Verification** (gates this WU):

- Design step 8: `git grep -E '\.eslintrc\.(js|json|cjs|mjs)' -- ':!*.md'` exits 1.
- Design step 1 (post-deletion): `npx eslint .` exits 0 with no warnings — the canonical "flat config is the only config" state.

**Rollback**: `git checkout HEAD -- .eslintrc.js .eslintignore` restores both files.

**Requirements satisfied**: REQ-LCF-1 (Flat Config as Single Source of Truth — no `.eslintrc.*` or `.eslintignore` tracked).

**Risks addressed**: R4 (MEDIUM — atomic swap; this WU runs only after WU-1, WU-2, WU-3, WU-4 are green, so the working tree never reaches a state where lint is broken).

---

### WU-6: Full verification sequence (regression guards)

Sub-steps:

- [ ] 6.1 `npx eslint .` — exit 0, no warnings (design step 1).
- [ ] 6.2 `npx tsc --noEmit` — exit 0 (design step 5).
- [ ] 6.3 `npx vitest run --maxWorkers=2` — exit 0 (design step 6).
- [ ] 6.4 `git status` — expect exactly four paths: `?? eslint.config.mjs` (or staged as new), `M package.json`, `D .eslintrc.js`, `D .eslintignore`. Any extra path is a blocker; surface to orchestrator.

**Verification** (gates this WU):

- Design steps 1, 5, 6 all green.
- `git status --short | wc -l` reports exactly 4 (one for each of: `eslint.config.mjs`, `package.json`, `.eslintrc.js`, `.eslintignore`).

**Rollback**: full rollback per design §7 last sentence: `git checkout HEAD -- .eslintrc.js .eslintignore package.json && rm eslint.config.mjs`. Returns the working tree to a state identical to `HEAD`.

**Requirements satisfied**: REQ-LCF-2 (clean exit, no warnings), REQ-LCF-9 (lint is a real pre-merge gate — verified alongside `tsc` and `vitest` which CI also runs).

**Risks addressed**: R3 (MEDIUM — full-tree regression check catches any silent rule loss across all source files, not just the probe in WU-2).

---

### WU-7: Stage exactly 4 paths and create single atomic commit

Sub-steps:

- [ ] 7.1 `git add eslint.config.mjs package.json && git rm .eslintrc.js .eslintignore` — stage all four paths.
- [ ] 7.2 `git status --short` — confirm exactly four staged entries, no extras.
- [ ] 7.3 `git diff --cached --stat` — confirm the staged names match the four expected paths and the line counts are inside forecast (~100 changed lines).
- [ ] 7.4 Create the single commit using the locked commit message from design §"Commit Strategy":

  ```
  chore(lint): migrate to ESLint v9 flat config via FlatCompat
  ```

  Body: `Replace deprecated next lint with the ESLint v9 flat config, preserving presets, ignores, and overrides. Closes the Slice B lint-gate leak where dead useState escaped tsc/vitest. Motivation: Engram #1403. IDE extensions may need Developer: Reload Window; not a CI blocker.`
- [ ] 7.5 `git log -1 --format=%B` — confirm the message body is intact (no AI attribution per global rules; conventional-commit scope).

**Verification** (gates this WU):

- `git show --stat HEAD | tail -5` reports 4 files changed, ~100 insertions, ~51 deletions (within ±20%).
- `git log -1 --format=%s` matches `chore(lint): migrate to ESLint v9 flat config via FlatCompat`.
- `git log -1 --format=%b` contains the literal strings `Engram #1403`, `Slice B`, and `Developer: Reload Window`.

**Rollback**: `git reset --soft HEAD~1` (un-commit, keep staged); or `git reset --hard HEAD~1` (un-commit and discard). The legacy files are deleted on disk and recoverable from `git reflog` for ~30 days.

**Requirements satisfied**: All nine REQ-LCF-N (REQ-LCF-1 through REQ-LCF-9) — the commit is the contract that bundles them.

**Risks addressed**: R4 (MEDIUM — atomic swap; the single commit guarantees no commit in history where lint is broken).

## Cross-cutting Checks

- **Lint is a real pre-merge gate post-merge**: `npm run lint` MUST exit 0 with no `ESLintRCConfigFile` warning. Both `sdd-apply` and `sdd-verify` run design step 1 as the headline gate.
- **No chained PRs**: forecast fits 400-line single-PR budget (~100 changed lines, ~25% utilization). Single-commit atomic swap per locked decision.
- **IDE stale diagnostics**: after merge, contributors may need `Developer: Reload Window`. Documented in commit body, not a CI blocker.
- **CI contract unchanged**: `.github/workflows/ci.yml` line 42 still runs `npm run lint`; line 48 still gates on it. No CI edits needed.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| files_changed_estimate | 4 |
| lines_changed_estimate | 100 (~49 inserts + ~51 deletes) |
| chained_pr_recommended | No |
| 400_line_budget_risk | Low |
| estimated_review_minutes | 10–15 |
| decision_needed_before_apply | No |
| delivery_strategy_compliance | `ask-on-risk`: forecast is Low-risk and ~25% of the 400-line budget; no decision or exception required. |

Detailed forecast (matches Slice B tasks precedent):

- `eslint.config.mjs` create: ~49 lines (7 imports, 1 FlatCompat, ~20 ignores, 6 array blocks). Adds ~49.
- `.eslintrc.js` delete: 44 lines. Deletes 44.
- `.eslintignore` delete: 7 lines. Deletes 7.
- `package.json` modify: 1-line change inside `scripts` object. Adds 1, deletes 1.
- **Total**: +50 / -52 = **~102 changed lines**. Honest estimate: 100 (rounded). Within ±10% of the design's 110-line forecast.

Plain-text guard lines (downstream enforcement):

```
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low
```

The forecast honors the cached `ask-on-risk` delivery strategy: the `ask-on-risk` heuristic only fires when the estimate is `Medium` or `High` risk. This forecast is `Low` (well under the 400-line budget), so no orchestrator prompt is needed before `sdd-apply` launches.

## Risks & Mitigations

| ID | Severity | Description | Mitigation WU(s) |
|----|----------|-------------|------------------|
| R1 | HIGH | Per-file overrides lost when porting `.eslintrc.js` lines 33–43 | WU-1 carries the named `files:` block verbatim; WU-3 is the empirical smoke-test. |
| R2 | MEDIUM | `eslint-config-next@15.3.5` has no ESM `exports` field | WU-1 imports `FlatCompat` from `@eslint/eslintrc` and calls `compat.extends('next/core-web-vitals', 'next/typescript')`. |
| R3 | MEDIUM | Rule keys renamed silently between eslintrc and flat config | WU-1 follows the Next.js official flat-config template; WU-2 (dead-declaration probe) + WU-6 (`npx eslint .` over the whole tree) prove no rule was dropped. |
| R4 | MEDIUM | `.eslintrc.js` deleted before `eslint.config.mjs` is committed leaves lint broken | WU-5 deletes only after WU-1/2/3/4 are green; WU-7 stages all four paths into a single atomic commit. Working tree never has `eslint.config.mjs` removed while legacy files are still present, and never has legacy files removed before `eslint.config.mjs` is validated. |

## Out of Scope Reminder

This change is strictly the atomic flat-config swap. NOT in scope:

- No new lint rules, no new plugins, no tightening of existing rule severity.
- No IDE / editor configuration changes (`.vscode/`, `.idea/`).
- No CI workflow changes (`.github/workflows/ci.yml` is contract, not change target).
- No formatter changes (`prettier` config untouched).
- No `eslint-config-next` upgrade and no other ESLint-adjacent dependency bumps.
- No `tsconfig.json` or `README.md` edits.
- No migration to `typescript-eslint` v8 native flat-config API (FlatCompat only).
- No removal of `@eslint/eslintrc` from `devDependencies`.
- No changes to `openspec/specs/lint-config-flat/spec.md` — it is already canonical; `sdd-archive` will sync the delta spec after merge.

If `sdd-apply` discovers a missing transitive dep during `eslint.config.mjs` import resolution, STOP and surface to orchestrator as `blocked-clarify` — DO NOT silently add a devDependency (locked decision 6 forbids it).