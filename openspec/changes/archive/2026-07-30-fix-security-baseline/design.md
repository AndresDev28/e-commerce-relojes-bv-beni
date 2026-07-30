# Design: fix-security-baseline (DEBT-10)

## Context

Manifest-only bump to clear five auto-fixable npm audit findings in the development-dependency tree, satisfying the six requirements in `openspec/changes/fix-security-baseline/specs/security-baseline/spec.md`. The change is one Conventional Commit on `frontend/debt-10-fix-security-baseline`, gated by a green `.github/workflows/security.yml` Trivy run. No source, test, config, or workflow files are touched. Forecast total diff ~280-355 lines, well under the 400-line review budget.

Cite: Engram #1416 (proposal), #1417 (spec sync), #1415 (explore), #1400 (Trivy cascade lesson), #2 (project context).

## Architecture

### package.json exact edits

Three contiguous direct devDep bumps for the vitest trio plus two additive override entries preserving alphabetical order.

#### devDependencies (lines 56-57 and 72 — non-contiguous)

```diff
   "devDependencies": {
     ...
     "@vitejs/plugin-react": "^5.0.4",
-    "@vitest/browser": "^3.2.4",
+    "@vitest/browser": "^3.2.7",
-    "@vitest/coverage-v8": "^3.2.4",
+    "@vitest/coverage-v8": "^3.2.7",
     "autoprefixer": "^10.4.16",
     ...
-    "vitest": "^3.2.4"
+    "vitest": "^3.2.7"
   },
```

> Note: `vitest` lives at line 72 (end of devDependencies); the other two live at lines 56-57. The diff shows both insertion sites. The three bumps together are one logical change but produce two hunks in `git diff`.

#### overrides (lines 74-81 — alphabetical preservation)

Current block (already alphabetical by package name):

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

Proposed — `@babel/core` sorts first (scoped `@` precedes alpha letters), `js-yaml` sorts between `fast-uri` and `postcss`:

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

Alphabetic verification: `@babel/core` < `brace-expansion` < `esbuild` < `fast-uri` < `js-yaml` < `postcss` < `sharp` < `ws` — confirmed.

### npm install + lockfile regeneration

- Command: `npm install` (no flags). Standard install; will resolve the three direct bumps + two overrides and rewrite `package-lock.json`.
- Expected output: lockfile churn ~280-350 lines per exploration #1415 (8 `@vitest/*` + 15 `@babel/*` + 1 `js-yaml` + transient `yallist` add/remove).
- No `--force`, no `--legacy-peer-deps`. EOVERRIDE risk is nil because `js-yaml` and `@babel/core` have no direct dep to conflict with; the vitest trio bumps land within the existing direct range window.
- Forecast total PR diff (manifest + lockfile): ~285-355 lines, comfortable under the 400-line budget.

### Verification sequence (execute IN ORDER before commit/push)

| # | Command | Pass criterion |
|---|---|---|
| 1 | `npm audit --json` and inspect `.vulnerabilities` | `critical:0, high:0` for vitest, `@vitest/browser`, `@vitest/coverage-v8`; `high:0` for `js-yaml`; no finding of any severity for `@babel/core` (covers Requirements 1-3) |
| 2 | `npx vitest run --maxWorkers=2` | Same pass/fail/total count as `main` baseline — STOP if delta |
| 3 | `npx next build` | Build completes with no new errors (catches `@babel/core` cascade regression — Next.js 15.5.21 uses SWC for app build but Babel appears in any plugin path via `@vitejs/plugin-react` or Storybook-adjacent tooling) |
| 4 | `npm run lint` | ESLint passes; indirectly exercises `js-yaml` via `@eslint/eslintrc@3.3.1` config loader |
| 5 | `git diff --stat` | Confirms only `package.json` and `package-lock.json` are changed (Requirement 5) |
| 6 | Grep check: confirm `overrides` block is alphabetical | `grep -E '^\s*"@babel/core"|^\s*"brace-expansion"|^\s*"esbuild"|^\s*"fast-uri"|^\s*"js-yaml"|^\s*"postcss"|^\s*"sharp"|^\s*"ws"' package.json` returns lines in expected order (Requirement 6) |

Local Trivy is optional — the authoritative Trivy gate runs on CI. If `trivy` CLI is installed locally, run `trivy fs --severity HIGH,CRITICAL --exit-code 1 .` from the worktree to preview.

### Risk mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| `@babel/core` cascade pulls 15 `@babel/*` sub-packages to versions Next.js or `@vitejs/plugin-react` did not test against | Low | `next build` is the canary (step 3). Next.js 15.5.21 uses SWC for app compilation; Babel is only invoked via vitest/storybook paths. If broken, fall back to (a) widen override to `"@babel/preset-env": "^7.x.y"` per sub-package, or (b) defer `@babel/core` to `fix-security-baseline-b`. |
| vitest 3.2.6 → 3.2.7 patch alters reporter output or coverage semantics | Low | Full `vitest run` comparison (step 2). GHSA-p63j-vcc4-9vmv is a permission-gate fix in `@vitest/browser`'s `browser.commands`; behavior change is additive. If snapshots fail, inspect diff — accept reporter-only churn, reject semantic regressions and file follow-up. |
| `js-yaml` 4.1.1 → 4.3.0 breaks ESLint config parser | Low | Step 4 (`npm run lint`) exercises the `@eslint/eslintrc@3.3.1` → `js-yaml` transitive path. On failure: narrow override to exact pin `"js-yaml": "4.3.0"` (no caret). |
| Trivy data lag — 4.3.0 / 7.29.7 / 3.2.7 not yet in Trivy vuln DB | Medium | Re-run security.yml on the PR branch (Trivy job exits 0 because `package.json` resolves to fixed versions in its lockfile view). sdd-verify asserts Trivy `exit-code: 0` before merge. |
| Lockfile churn exceeds 400-line budget | Low | Forecast 280-350 (exploration #1415). If overshoot, move to chained PR per the contingency below. |

### @babel/core cascade — 15 sub-packages expected to bump

The single override on `@babel/core` triggers npm's transitive resolution to pull every `@babel/*` package that resolves through it. Per exploration #1415, the likely set is: `@babel/types`, `@babel/traverse`, `@babel/template`, `@babel/parser`, `@babel/helpers`, `@babel/helper-validator-option`, `@babel/helper-module-transforms`, `@babel/helper-validator-identifier`, `@babel/helper-module-imports`, `@babel/helper-string-parser`, `@babel/helper-compilation-targets`, `@babel/helper-globals`, `@babel/generator`, `@babel/compat-data`, `@babel/code-frame`. All are within the 7.x caret window; npm will pick the highest 7.29.7+ version each sub-package already declares. Any `yallist` add/remove is a transient resolution shuffle, not an active dep change.

## Commit & PR structure

### Work unit

Per `work-unit-commits`: this is a SINGLE work unit. Rationale:

- All 5 package changes are interdependent: `npm install` rewrites the lockfile atomically against the new manifest. Splitting risks partial lockfile states that don't `npm install` cleanly.
- The change has one purpose (clear the 5 auto-fixable audit findings).
- Rollback is one revert — no schema, data, or migration rollback needed.
- Diff stays well under 400 lines.

### Commit message

Single commit on `frontend/debt-10-fix-security-baseline`:

```text
chore(deps): fix security baseline (vitest trio + js-yaml + @babel/core overrides)

- Bump vitest, @vitest/browser, @vitest/coverage-v8 to ^3.2.7
- Add overrides: js-yaml ^4.3.0, @babel/core ^7.29.7
- Regenerate package-lock.json
- Closes DEBT-10; no source/test/config changes
```

PR title matches: `chore(deps): fix security baseline (DEBT-10 — vitest trio + js-yaml + @babel/core overrides)`.

### Branch

- Name: `frontend/debt-10-fix-security-baseline` (per `AGENT.md` repository convention `frontend/{TICKET-ID}-{description-slug}`).
- Base: `main`.
- Worktree path: `<repo-parent>/e-commerce-relojes-bv-beni-worktrees/debt-10-fix-security-baseline/`.

### PR

- Label: `type:chore` (manifest-only).
- Auto-merge: OFF. Wait for `security.yml` green + Trivy `exit-code: 0` + human review.
- Body: link the DEBT-10 issue, paste the 5 package changes summary, cite Trivy gate, note zero source/test/config drift.

## Files touched (forecast)

| File | Lines changed | Why |
|---|---|---|
| `package.json` | +5 / -3 | 3 direct vitest bumps (`@vitest/browser`, `@vitest/coverage-v8`, `vitest`) + 2 additive override entries (`@babel/core`, `js-yaml`) |
| `package-lock.json` | +280-350 / -280-350 | `npm install` regenerates against new manifest: 8 `@vitest/*` + 15 `@babel/*` + 1 `js-yaml` + transient `yallist` |
| **Total** | **~285-355** | Comfortably under 400-line budget |

No other files touched (Requirement 5). `vitest.config.ts`, `vitest.setup.ts`, `next.config.ts`, `.github/workflows/security.yml`, and the entire `src/` tree are read-only during this change.

## Cascade contingency (single PR → chained PR escape hatch)

If during verification one of the 5 packages breaks something:

1. Revert the breaking package locally.
2. Commit the working subset as the first PR (`frontend/debt-10-fix-security-baseline` ships 4-of-5).
3. Open `frontend/debt-10-fix-security-baseline-b` (absorbs the broken package + the deferred Storybook / `@react-email/preview-server` minor/major bumps). This follows the `chained-pr` skill's Feature Branch Chain pattern.

Trigger conditions that force the split: `@babel/core` cascade breaks `next build` AND a narrower override does not recover; OR vitest 3.2.7 changes test semantics AND the change is not accept-by-attrition.

## Threat Matrix

N/A — this change is manifest-only (`package.json` + `package-lock.json` regeneration). No routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is touched.

## Acceptance gate

sdd-verify will assert, in this order:

| Spec Requirement | Verification |
|---|---|
| Requirement 1: vitest trio clean | `npm audit --json` shows no critical findings for `vitest`, `@vitest/browser`, `@vitest/coverage-v8` |
| Requirement 2: js-yaml clean | `npm audit --json` shows no high findings for `js-yaml` |
| Requirement 3: @babel/core clean | `npm audit --json` shows no finding of any severity for `@babel/core` |
| Requirement 4: Trivy gate green | `security.yml` `trivy` job exits 0 on the PR branch |
| Requirement 5: manifest-only diff | `git diff --name-only main...HEAD` returns exactly `package.json` and `package-lock.json` |
| Requirement 6: alphabetical overrides | Grep check on `package.json` confirms insertion order: `@babel/core` < `brace-expansion` < `esbuild` < `fast-uri` < `js-yaml` < `postcss` < `sharp` < `ws` |

## References

- Proposal: `openspec/changes/fix-security-baseline/proposal.md`, Engram #1416.
- Spec: `openspec/changes/fix-security-baseline/specs/security-baseline/spec.md`, Engram #1417.
- Exploration: `openspec/changes/fix-security-baseline/exploration.md`, Engram #1415.
- Trivy cascade: Engram #1400.
- Project context: Engram #2.
- Workflow gate: `.github/workflows/security.yml` (Trivy `severity: HIGH,CRITICAL`, `exit-code: "1"`).
