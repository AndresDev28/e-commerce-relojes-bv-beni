# Proposal: Fix ESLint v9 Migration (Flat Config)

## Intent

ESLint v9.30.1 is already installed in this project, but the lint path still runs
through `next lint`'s deprecated compatibility shim. Today that shim masks the
problem and `npm run lint` exits 0 — but Next.js 16 will remove the shim
entirely, and at that point lint will fail to load our config. There is a more
immediate reason to fix this now: the Slice B lint-gate leak we discovered (a
dead `useState` import that TypeScript ignored and ESLint should have caught)
proves our current config is brittle. Migrating to ESLint v9's native flat
config format is the supported, future-proof shape and unblocks adding stricter
rules in a follow-up without carrying legacy-rc baggage.

## Scope

In scope for this change:

- Create `eslint.config.mjs` at the project root using ESLint v9's flat config
  format.
- Bridge the existing `next/core-web-vitals` preset via `FlatCompat` from
  `@eslint/eslintrc`, because `eslint-config-next@15.3.5` has no `exports`
  field and cannot be imported directly under flat config.
- Preserve every existing rule override currently declared in `.eslintrc.js`,
  including the per-file suppressions for
  `src/features/catalog/components/ShopLoopHead.tsx` and `src/lib/api.ts`.
- Preserve test-file ignore patterns (`*.test.ts`, `*.test.tsx`, `__tests__/**`)
  in the new config's `ignores` block.
- Verify the new config loads and produces zero errors against the working
  tree before deleting the old files.
- Delete `.eslintrc.js` and `.eslintignore` from the working tree once the new
  config is validated.
- Keep `@eslint/eslintrc` in `devDependencies` (still needed by the bridge).

## Out of Scope / Non-Goals

The following are explicitly **not** part of this change. They are deferred to
follow-up work so this PR stays small and reviewable.

- No new lint rules, no new plugins, no tightening of existing rule severity.
- No changes to `tsconfig.json`, `package.json` scripts (other than the devDep
  note above), or CI workflows.
- No changes to IDE / editor configuration (`.vscode/`, `.idea/`).
- No changes to `prettier` config — Prettier keeps owning formatting, ESLint
  keeps owning code quality, the boundary stays the same.
- No removal of `@eslint/eslintrc` from `devDependencies` — it stays as long as
  the FlatCompat bridge does.
- No migration to ESLint v9's built-in TypeScript support
  (`typescript-eslint` v8 flat-config native API). We stay with FlatCompat
  + the existing plugins to minimize blast radius.
- No docs beyond what this proposal already states; no README rewrite.

## Approach

We are taking **Approach B1 — Flat Config via `FlatCompat`** (locked decision #1).

The implementation is a single atomic swap, structured as follows:

1. **Write `eslint.config.mjs`** at the project root. It imports
   `@eslint/eslintrc`'s `FlatCompat`, builds a compat layer that points at the
   project directory, and exports a flat config array. The array contains, in
   order:
   - An `ignores` block for `node_modules`, `.next`, `out`, `dist`,
     `next-env.d.ts`, and the test-file patterns
     (`*.test.ts`, `*.test.tsx`, `__tests__/**`).
   - A main config object that uses `FlatCompat.extends(...)` to pull in
     `eslint:recommended`, `plugin:@typescript-eslint/recommended`,
     `plugin:react/recommended`, `plugin:react-hooks/recommended`,
     `next/core-web-vitals`, and `prettier`.
   - A `files:` block that targets
     `src/features/catalog/components/ShopLoopHead.tsx` and `src/lib/api.ts`
     and sets `@typescript-eslint/no-unused-vars: off` (locked decision #3 —
     this preserves the existing per-file suppression).
   - A `languageOptions` block with `parser: tsParser` and the React
     `settings.react.version: 'detect'` carry-over.
2. **Validate the new config without removing the old one.** Run
   `npx eslint .` against the new `eslint.config.mjs` to confirm it loads and
   the working tree is clean. If it fails, fix the new config before touching
   the old files.
3. **Delete the legacy files** — `.eslintrc.js` and `.eslintignore` — once the
   new config is verified. The swap is atomic in a single commit (locked
   decision #2): the new config and the deletions land together, so there is no
   commit in the history where lint is broken.
4. **Run the regression guards** listed in the Acceptance Criteria section
   below.

Per-file overrides (locked decision #3) are not optional. `.eslintrc.js` lines
33–43 explicitly silence `no-unused-vars` in two files; without an equivalent
block in the flat config, those files will start failing lint on the very next
CI run after this PR merges.

Test-file ignore patterns (locked decision #4) are also not optional. The new
config's `ignores` block must list `*.test.ts`, `*.test.tsx`, and
`__tests__/**` so the project keeps its current surface (no test-lint rules
today, none after).

We keep `@eslint/eslintrc` in `devDependencies` (locked decision #5). It is the
official bridge documented by Next.js and it stays valid as long as the bridge
stays in use.

## Acceptance Criteria

Each bullet is independently verifiable in CI by a reviewer running the listed
command or reading the listed file. The change is "done" only when **all** of
these are true.

- [ ] `npm run lint` exits 0 **and** prints no `ESLintRCConfigFile` deprecation
      warning. (Proves flat config is in use and the legacy shim is no longer
      required.)
- [ ] Introducing a dead `useState` import in any `.tsx` file (temporary edit,
      reverted before merge) causes `npm run lint` to fail with
      `@typescript-eslint/no-unused-vars`. (Proves the Slice B class of bug is
      still caught.)
- [ ] Deleting a dependency from a `useEffect` deps array in any `.tsx` file
      (temporary edit, reverted before merge) causes `npm run lint` to fail
      with `react-hooks/exhaustive-deps`. (Proves the hook-rules preset is
      still loaded through the bridge.)
- [ ] `src/features/catalog/components/ShopLoopHead.tsx` and `src/lib/api.ts`
      still suppress `@typescript-eslint/no-unused-vars` — a deliberately
      unused variable introduced in those files does **not** fail lint.
      (Proves the per-file override was ported, not lost.)
- [ ] `npx tsc --noEmit` exits 0. (Regression guard for the type-checker path
      that lint runs alongside in CI.)
- [ ] `npx vitest run --maxWorkers=2` exits 0. (Regression guard for the test
      suite.)
- [ ] `.eslintrc.js` and `.eslintignore` are absent from the working tree on
      the merged commit (verifiable with `git ls-files | grep eslint`).
- [ ] `eslint.config.mjs` exists at the project root and is tracked by git.

## Risk Register

Risks are inherited from the exploration phase. Each is cited with its explore
ID so the spec and design phases can cross-reference.

- **R1 — HIGH (mitigated):** Per-file overrides lost when porting `.eslintrc.js`
  → flat config. Mitigation: an explicit `files:` block in the new config
  targeting the two files listed in locked decision #3; verified by the
  per-file override acceptance criterion above.
- **R2 — MEDIUM (mitigated):** `eslint-config-next` has no `exports` field and
  cannot be imported directly under flat config. Mitigation: use the
  officially documented `FlatCompat` bridge from `@eslint/eslintrc`.
- **R3 — MEDIUM (mitigated):** Rule keys renamed between eslintrc and flat
  config (`parser` → `languageOptions.parser`, etc.) can silently drop rules.
  Mitigation: follow the Next.js official flat-config template; apply the new
  config to the working tree and validate file-by-file that lint output is
  unchanged before deleting the legacy files.
- **R4 — MEDIUM (mitigated):** `.eslintrc.js` deleted before `eslint.config.mjs`
  is committed leaves lint broken in the working tree. Mitigation: atomic
  single-commit swap — the new file is created and validated first, and only
  then are the legacy files deleted in the same commit.

## Effort & PR Forecast

- **Files changed:** 4
  - `eslint.config.mjs` — new file (~40 lines).
  - `.eslintrc.js` — deleted.
  - `.eslintignore` — deleted.
  - `package.json` — no functional change; `@eslint/eslintrc` remains listed
    in `devDependencies` (already present). If it turns out the devDep is
    already declared elsewhere and only needs no edit, this row drops to 3
    files; the spec phase will confirm.
- **Lines changed:** ~110 (under the 400-line single-PR budget).
- **PR shape:** **Single PR.** Not chained, not stacked. The atomic-swap
  decision (locked decision #2) means splitting the change would force a
  broken-lint intermediate commit, which is exactly what we are avoiding.
- **Reviewer focus:** the flat config block ordering, the `files:` block, and
  the `ignores` block. Everything else is mechanical deletion.

## Open Questions for Spec Phase

None — ready for spec.

The exploration phase surfaced every variable that could have blocked the spec
(authoritative config format, bridge mechanism, override preservation, atomic
swap, ignore patterns, devDep retention, effort budget), and all six locked
decisions are in place. The spec phase can proceed directly to writing the
delta spec.