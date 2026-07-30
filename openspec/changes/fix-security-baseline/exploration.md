# sdd-explore: fix-security-baseline

**Project**: e-commerce-relojes-bv-beni (Next.js 15 + React 19 frontend)
**Branch base**: `main` (commit `79680ef`, clean tree)
**Change scope**: 5 auto-fixable vulns from `npm audit` (DEBT-10 / roadmap item #1)
**Out of scope**: Storybook 9.0.16 → 9.1.20 minor, `@react-email/preview-server` 5.x → 4.3.2 major, nested `next` 16.2.3 cascade (deferred to `fix-security-baseline-b` follow-up)
**Conflicting change check**: `security-hardening-critical-fixes` is an unrelated cookie/JWT/CSP workstream — **no overlap** with this change.

---

## Current state (npm audit, isolated to 5 in-scope packages)

Full audit metadata: **8 total vulnerabilities** (1 low, 0 moderate, 4 high, 3 critical). All 8 entries:

| Package | Sev | Current | Fixed (advisory) | Direct/Transitive | Via | GHSA/CVE |
|---|---|---|---|---|---|---|
| `vitest` | critical | 3.2.6 | 3.2.7 | Direct (devDep) | `vitest@^3.2.4` | GHSA-p63j-vcc4-9vmv (via @vitest/browser) |
| `@vitest/browser` | critical | 3.2.6 | 3.2.7 | Direct (devDep) | `@vitest/browser@^3.2.4` | **GHSA-p63j-vcc4-9vmv** |
| `@vitest/coverage-v8` | critical | 3.2.6 | 3.2.7 | Direct (devDep) | `@vitest/coverage-v8@^3.2.4` | inherited from `@vitest/browser` |
| `js-yaml` | high | 4.1.1 | 4.3.0 | **Transitive** (devDep tree) | `@eslint/eslintrc@3.3.1` | **GHSA-h67p-54hq-rp68** (moderate) + **GHSA-52cp-r559-cp3m** (high) |
| `@babel/core` | low | 7.28.4 | 7.29.7 | **Transitive** (devDep tree) | `@vitejs/plugin-react@5.0.4`, `@storybook/react-vite@9.0.16 → react-docgen@8.0.0` | **GHSA-4x5r-pxfx-6jf8** |

**Out-of-scope entries** (for context, NOT fixed by this change):
| Package | Sev | Reason deferred |
|---|---|---|
| `@react-email/preview-server` | high | Direct bump is **SemVer-major** (5.x → 4.3.2). Risk of breaking email preview dev workflow. |
| `next` (nested) | high | Resolved only via `node_modules/@react-email/preview-server/node_modules/next@16.2.3`. Top-level `next@15.5.21` is unaffected. Fix path is the `@react-email/preview-server` major bump above. |
| `storybook` | high | Project is on `9.0.16`; fix is `9.1.20` (minor). Deferred per user direction (risk of breaking config/stories). |

`npm audit fix --dry-run` confirms the 5 in-scope vulns are all auto-fixable with patch/minor bumps — no SemVer-major required for any of them.

---

## Fix strategy per package

### vitest (3.2.6 → 3.2.7, critical)
- **Approach**: Direct devDep bump. `^3.2.4` → `^3.2.7` in `package.json` devDependencies.
- **Risk**: Low. Patch bump within 3.x. `@storybook/addon-vitest@9.0.16` peer constraint is `vitest: '^3.0.0'` — 3.2.7 satisfies it.
- **Override entry**: **NOT needed** (direct dep already exists).
- **Direct dep alignment**: N/A (already aligned).
- **Downstream cascade**: `npm audit fix --dry-run` shows it pulls the entire `@vitest/*` sub-tree (@vitest/snapshot, @vitest/pretty-format, @vitest/runner, @vitest/utils, @vitest/mocker, @vitest/spy, @vitest/expect, @vitest/coverage-v8, @vitest/browser) from 3.2.6 → 3.2.7. Internal Monorepo-wide pin via vitest's own dependencies.

### @vitest/browser (3.2.6 → 3.2.7, critical)
- **Approach**: Direct devDep bump. `^3.2.4` → `^3.2.7` in `package.json` devDependencies.
- **Risk**: Low. Patch bump. Same peer constraint applies (`@storybook/addon-vitest@9.0.16` peer: `@vitest/browser: '^3.0.0'`).
- **Override entry**: **NOT needed**.
- **Direct dep alignment**: N/A.
- **Downstream cascade**: Pulls `@vitest/utils@3.2.7` and `@vitest/pretty-format@3.2.7` transitively (already resolved by parent vitest bump).

### @vitest/coverage-v8 (3.2.6 → 3.2.7, critical)
- **Approach**: Direct devDep bump. `^3.2.4` → `^3.2.7` in `package.json` devDependencies.
- **Risk**: Low. Patch bump. Coverage config (`coverage: { provider: 'v8', reporter: ['text', 'html', 'json'], ... }`) is stable across 3.x patches — no behavior change.
- **Override entry**: **NOT needed**.
- **Direct dep alignment**: N/A.

### js-yaml (4.1.1 → 4.3.0, high — transitive)
- **Approach**: Override only. No direct dep. Add `"js-yaml": "^4.3.0"` to `overrides` block.
- **Risk**: Low. Minor bump within 4.x. Two advisories:
  - GHSA-h67p-54hq-rp68 (moderate) — fixed in `4.1.2` per advisory range `>=4.0.0 <=4.1.1`.
  - GHSA-52cp-r559-cp3m (high) — fixed in `4.3.0` per advisory range `>=4.0.0 <4.3.0`.
  - `npm audit fix --dry-run` resolves both in one bump to 4.3.0.
- **Override entry**: **`"js-yaml": "^4.3.0"`** (alphabetically between `fast-uri` and `postcss`).
- **Direct dep alignment**: N/A (no direct dep — no `EOVERRIDE` risk).
- **Why not direct devDep**: Adding `js-yaml` as a direct devDep would commit to its constant maintenance. The override pattern (already used for `fast-uri`, `sharp`, `ws`, `esbuild`) is the established path for transitive-only fixes.

### @babel/core (7.28.4 → 7.29.7, low — transitive)
- **Approach**: Override only. No direct dep. Add `"@babel/core": "^7.29.7"` to `overrides` block.
- **Risk**: Low. Minor bump within 7.x. Advisory range `<=7.29.0` — fix is 7.29.1+. Latest 7.x is 7.29.7.
- **Override entry**: **`"@babel/core": "^7.29.7"`** (alphabetically first — `@` precedes alpha letters).
- **Direct dep alignment**: N/A (no direct dep).
- **Downstream cascade**: `npm audit fix --dry-run` shows the cascade pulls the entire `@babel/*` tree (`@babel/types`, `@babel/traverse`, `@babel/template`, `@babel/parser`, `@babel/helpers`, `@babel/helper-validator-option`, `@babel/helper-module-transforms`, `@babel/helper-validator-identifier`, `@babel/helper-module-imports`, `@babel/helper-string-parser`, `@babel/helper-compilation-targets`, `@babel/helper-globals`, `@babel/generator`, `@babel/compat-data`, `@babel/code-frame`) from 7.28.4 → 7.29.7. Single override entry on `@babel/core` triggers all of them via npm's transitive resolution.
- **Note on `next-env.d.ts`**: That file is a Next.js-generated TypeScript declaration file (NOT a runtime dependency). The actual `@babel/core` transitive path is via `@vitejs/plugin-react@5.0.4` (devDep, used by vitest projects) and `@storybook/react-vite@9.0.16 → react-docgen@8.0.0` (devDep, used by Storybook). All transitives are in the dev tree.

---

## Cascade risk assessment

**Per #1400 (Trivy cascade pattern)**: Trivy filters dev-only deps by default (the "Suppress dev dependencies" flag is implicit). All 5 in-scope vulns are in the dev tree:

- `vitest`, `@vitest/browser`, `@vitest/coverage-v8` — direct devDeps
- `js-yaml` — transitive via `@eslint/eslintrc` (devDep)
- `@babel/core` — transitive via `@vitejs/plugin-react` (devDep) and `@storybook/react-vite → react-docgen` (devDep)

**Expected Trivy delta on this PR**: **Likely zero / minimal**. Trivy should not fail on these dev-tree fixes. The CI `npm audit` job (which does see all deps) will go from 8 findings → 3 findings (the 3 out-of-scope: `@react-email/preview-server`, nested `next`, `storybook`).

**Cascade expansion risk**: After merging, the next CI push will still see the 3 OOS findings — they are not unlocked by these fixes (they are independent: Storybook minor, `@react-email/preview-server` major, nested `next`). So the cascade does NOT continue with this PR. The follow-up `fix-security-baseline-b` change will tackle those.

**Bundle of fix-transitives**: `@vitest/*` internal cascade (8 sub-packages) and `@babel/*` cascade (15 sub-packages) are scoped to safe within-3.x / within-7.x version trains. No SemVer-major bumps anywhere in the 5-package resolution.

---

## package.json overrides — proposed diff

Current `overrides` block (already alphabetical — preserves convention):

```json
"overrides": {
  "brace-expansion": "^5.0.8",
  "esbuild": "^0.28.1",
  "fast-uri": "^3.1.3",
  "postcss": "^8.5.18",
  "sharp": "^0.35.0",
  "ws": "^8.21.0"
}
```

Proposed (additive only, alphabetical order preserved):

```diff
   "overrides": {
+    "@babel/core": "^7.29.7",
     "brace-expansion": "^5.0.8",
     "esbuild": "^0.28.1",
     "fast-uri": "^3.1.3",
+    "js-yaml": "^4.3.0",
     "postcss": "^8.5.18",
     "sharp": "^0.35.0",
     "ws": "^8.21.0"
   }
```

## package.json devDependencies — proposed diff

```diff
     "@vitejs/plugin-react": "^5.0.4",
-    "@vitest/browser": "^3.2.4",
+    "@vitest/browser": "^3.2.7",
-    "@vitest/coverage-v8": "^3.2.4",
+    "@vitest/coverage-v8": "^3.2.7",
     "autoprefixer": "^10.4.16",
     ...
-    "vitest": "^3.2.4"
+    "vitest": "^3.2.7"
```

---

## Vitest trio special notes

| Concern | Verdict |
|---|---|
| Storybook addon-vitest peer `vitest: '^3.0.0'` | ✅ Compatible with 3.2.7 |
| Storybook addon-vitest peer `@vitest/browser: '^3.0.0'` | ✅ Compatible with 3.2.7 |
| `projects: [...]` array in `vitest.config.ts` | ✅ Stable across 3.x patches (3 projects: storybook browser, unit jsdom, integration node) |
| `coverage: { provider: 'v8', reporter: ['text', 'html', 'json'] }` | ✅ Stable — no reporter API change in 3.2.7 |
| Storybook project depends on `headless: true` browser provider | ✅ Compatible (3.2.7 fixes a permission gate bug, doesn't change provider behavior) |
| Test runner command (`vitest --maxWorkers=2`) | ✅ Unchanged |
| `--project` flag still works | ✅ Unchanged |
| Snapshot config | ✅ Unchanged (no `.snap` files touched) |
| API contract for `@vitest/browser` (the GHSA fix) | ✅ Additive — only patches the file-access permission gate in `browser.commands` |

**Confidence**: High. The fix is a security-only patch; no `vitest.config.ts` or `vitest.setup.ts` changes needed.

## @babel/core special notes

| Concern | Verdict |
|---|---|
| Used by `@vitejs/plugin-react` (devDep, in vitest projects) | ✅ Cascade handled by override |
| Used by `@storybook/react-vite → react-docgen` (devDep) | ✅ Cascade handled by override |
| Used by `@babel/helper-module-transforms` | ✅ Cascade handled |
| Used by `@babel/plugin-transform-react-jsx-{self,source}` | ✅ Cascade handled |
| Any production-runtime use? | ❌ No — all paths are dev/test/storybook |
| Side-effect on `next-env.d.ts` (mentioned in prompt) | ❌ None — `next-env.d.ts` is a TypeScript declaration file, not a runtime dependency. The `next` build itself does not invoke `@babel/core` directly (it uses SWC). |
| Risk of `ESLint` config breakage | ✅ None — `eslint.config.mjs` does not import `@babel/core` directly; it uses `@typescript-eslint/parser` |

**Confidence**: High. Override-only is the right pattern (matches existing `esbuild`, `fast-uri`, `sharp`, `ws` precedent).

---

## Trivy gate implications

Per memory #1400 + verification of `.github/workflows/security.yml`:

- **`trivy` job**: `severity: HIGH,CRITICAL`, `exit-code: "1"`. Defaults to filtering dev-only deps (Trivy builtin `--severity HIGH,CRITICAL` does NOT auto-skip dev deps, but the standard `fs` scan profile in the trivy-action does skip `node_modules` by default for project files; `node_modules` is scanned separately as a library).
- **`npm audit` job**: `npm audit --audit-level=high` with `continue-on-error: true`. Reports but doesn't block.

**Concrete effects**:
1. Trivy MAY report on `js-yaml` if it tracks the eslintrc transitive (some Trivy profiles do scan `node_modules` for known-vuln libs). This is most likely the only one of the 5 to surface in Trivy output. The override doesn't change Trivy's view — it changes the lockfile resolution.
2. **`npm audit` CI job will clean**: 8 findings → 3 findings (the 3 OOS). Audit-job is non-blocking anyway.
3. **Trivy delta uncertain**: if Trivy has been skipping dev deps, the fix won't change Trivy output. If Trivy flags the eslintrc path, it will clear after override. **Recommend re-running security.yml on the PR to confirm before merge.**

**Action item for sdd-verify**: run security.yml on the PR branch and ensure Trivy does not block. If it does block on `js-yaml`, the override fix is the resolved path; the failure would be a Trivy-data lag (3.2.7/4.3.0/7.29.7 not yet in Trivy's vuln DB), not a real regression.

---

## Cascade risk: single PR vs chained

- **Diff forecast**: ~280-350 lines total. Component breakdown:
  - `package.json`: ~5 lines (3 devDep version bumps + 2 override entries)
  - `package-lock.json`: ~280-350 lines (~28 transitive package version bumps × ~10 lines each: 8 @vitest/* + 15 @babel/* + 1 js-yaml + 1 yallist add/remove)
  - **No source code changes** — zero in `src/`, `vitest.config.ts`, `vitest.setup.ts`, or workflow files.
- **400-line budget risk**: **Low**. Comfortably under 400.
- **Recommended strategy**: **Single PR**. No chaining needed.
- **Branch name**: `frontend/fix-security-baseline` (per repo convention `frontend/{TICKET-ID}-{description-slug}`).
- **Commit strategy** (work-unit-commits skill): one commit `fix(deps): clear 5 auto-fixable npm audit findings (vitest trio, js-yaml, @babel/core)`. Atomic — diff is not cleanly splittable (every lockfile chunk depends on the package.json edits).
- **No `EOVERRIDE` risk**: vitest trio bumps are within direct dep range; js-yaml and @babel/core are pure overrides with no direct dep to conflict with.

---

## Open questions for user

1. **CI re-run strategy**: should we wait for a green security.yml run on the PR before merging, or merge and re-run on `main`? **Recommendation**: wait for green on PR — the cascade insight from #1400 says Trivy gate surprises are real.
2. **`yallist` transient add/remove**: `npm audit fix --dry-run` shows `yallist@3.1.1` added then removed in the babel cascade. This is npm's resolution shuffle (babel transitively depends on it for some sub-package). **No action needed** — it's a net-zero in the lockfile. Flagging for awareness.
3. **Should we also remove the `^3.2.4` lower bound on vitest trio** to lock down to 3.2.7 exactly (`3.2.7` without `^`)? **Recommendation**: keep `^3.2.7` — matches the existing `^3.2.4` style and allows patch upgrades. If user wants strict pinning, we can use `"3.2.7"` (no `^`). Confirm preference.
4. **Should we add a script `npm run audit:fix:dry`** to surface this proactively next time? **Recommendation**: out of scope for this change. Optional separate chore.
5. **Follow-up PR for the 3 OOS vulns** (`@react-email/preview-server`, nested `next`, `storybook` minor): should `fix-security-baseline-b` be opened automatically after this merges, or held for a separate decision? **Recommendation**: hold for a separate decision — the user's explicit "OUT OF SCOPE" wording suggests they want to triage those manually.

---

## Next recommended phase

- **sdd-propose** with scope decisions baked in:
  - Single PR (no chaining)
  - `frontend/fix-security-baseline` branch
  - Triggers: `Closes #DEBT-10` (or equivalent issue id — confirm in propose phase)
  - Files touched: `package.json`, `package-lock.json` (only)
  - No spec/design changes needed (no behavior change, no architectural decision)

## Discovery artifacts

- `npm audit --json` (full output, 8 entries)
- `npm audit fix --dry-run` (lists exact resolution changes: 8 @vitest/* + 15 @babel/* + 1 js-yaml + 1 yallist transient)
- `npm ls` resolution paths for all 5 packages
- `vitest.config.ts` (stable — no changes needed)
- `vitest.setup.ts` (stable — no changes needed)
- `@storybook/addon-vitest@9.0.16` peer constraints (verified compatible with 3.2.7)
- `.github/workflows/security.yml` (Trivy + npm audit + CodeQL jobs)
- Cross-checked: `security-hardening-critical-fixes` change has no overlap (it addresses JWT cookie migration, X-Trace-Id, CSP — not npm audit deps)

---

## Status

- **Strict-mode**: read-only ✅. No `npm install`, no `npm audit fix` (only `--dry-run`), no file modifications.
- **Vitest command**: not invoked (no tests run in explore phase).
- **CodeGraph**: queried for vitest projects wiring; verified stable.
- **OpenSpec target**: `openspec/changes/fix-security-baseline/exploration.md` (this file).
- **Engram target**: `sdd/fix-security-baseline/explore` (saved separately).
