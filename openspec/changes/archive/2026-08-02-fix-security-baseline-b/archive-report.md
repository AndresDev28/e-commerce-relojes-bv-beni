# Archive Report: fix-security-baseline-b (DEBT-10b)

> **Status**: PASS WITH WARNINGS (semantic verdict; 0 CRITICAL, 0 blockers, 2 accepted WARNINGs — W-1 SDD traceability doc precedent, W-2 pre-existing env-only vitest baseline)
>
> **Archived**: 2026-08-02
>
> **Predecessor**: `openspec/changes/archive/2026-07-30-fix-security-baseline/` (DEBT-10)

## Change summary

| Field | Value |
|---|---|
| Name | `fix-security-baseline-b` |
| Roadmap item | #1b (DEBT-10b) |
| Intent | Close the 3 residual post-DEBT-10 npm audit findings (roadmap #1b) |
| PRs | PR #86 (squash-merged at `7d0ce94`) + PR #87 (squash-merged at `b38d018`) |
| Main HEAD at close | `b38d018c944fae777531dcf2a601002981bbf3d5` |
| `npm audit` final state | 0 findings (`info:0, low:0, moderate:0, high:0, critical:0, total:0`) |
| Lockfile net churn | +176/-352 (PR1 +176/-129; PR2 0/-223) = 528 lines, within scope |
| Work units | 2 chained PRs (Stacked-PRs to main; disjoint dep families, not stacked) |
| Strategy revision | 2026-08-02, post-apply-failure (Engram #1447) — PR2 changed from downgrade to removal |

## What this change does

Manifest-only closure of the 3 residual post-DEBT-10 npm audit findings. Two independent chained PRs from fresh `main` (disjoint dependency families, not stacked):

1. **PR1 — Storybook (9.0.16 → 9.1.20)**: family-aligned bump of the seven direct devDependencies (`storybook`, `@storybook/addon-a11y`, `@storybook/addon-docs`, `@storybook/addon-onboarding`, `@storybook/addon-vitest`, `@storybook/nextjs-vite`, `eslint-plugin-storybook`) to `^9.1.20`. Three transitive packages (`@storybook/react-vite`, `@storybook/react`, `@storybook/builder-vite`) follow automatically under `@storybook/nextjs-vite`. Closes the `storybook` high-severity advisory.

2. **PR2 — React Email preview-server removal**: REMOVE `@react-email/preview-server` from `devDependencies` in `package.json`. The package is dead code (per Engram #1426, the `npm run email:dev` script that would invoke it is not declared in `package.json`). The `react-email` CLI remains installed at `^5.1.0` for future workflow repair. Closes the `@react-email/preview-server` advisory and the nested `next@16.2.3` chain advisory in one go.

Both PRs reuse the DEBT-10 6-step local gate (install → audit → vitest → build → lint → diff-scope) plus per-PR smoke tests. Trivy gate is remote and blocking per PR. GH013: every commit via branch + PR; no direct push to `main`.

## Spec sync applied at archive time

### MODIFIED Purpose

**Before (canonical, from DEBT-10):**

> Establish a maintainable dependency-security baseline for the frontend project's development dependencies. PRs SHALL NOT reintroduce critical or high npm audit findings in the five in-scope packages, and the Trivy gate SHALL remain green. The `github-actions-security` capability continues to own the workflow configuration; this capability owns the dependency-version floor below it.

**After (canonical, post-archive):**

> Establish a maintainable dependency-security baseline for the frontend project's development dependencies. PRs SHALL NOT reintroduce critical or high npm audit findings in any in-scope package, and the Trivy gate SHALL remain green. The `github-actions-security` capability continues to own the workflow configuration; this capability owns the dependency-version floor below it.

### ADDED Requirements

Two Requirements appended to the canonical `## Requirements` section (DEBT-10's six Requirements preserved unchanged):

- `### Requirement: Storybook family baseline (9.1.20)` (2 Scenarios: `storybook clean`, `family version alignment`)
- `### Requirement: React Email preview-server absence` (4 Scenarios: `preview-server absent`, `nested-next absent`, `react-email CLI retained`, `re-introduction requires separately-scoped change`)

### Spec correction accepted: 7-direct / 3-transitive Storybook family

The original delta (`specs/security-baseline/spec.md:19`) enumerated eight packages as direct Storybook devDependencies. Cross-checking with `npm ls --all` (recorded in `apply-progress.md:17-36` and verified in `verify-report.md:98-107`) confirmed that only seven are declared as direct in `package.json` (lines 42-46, 63, 68); the eighth (`@storybook/react-vite`) is transitive, as are `@storybook/react` and `@storybook/builder-vite` — all three resolve nested under `@storybook/nextjs-vite`.

**Resolution (per `apply-progress.md:36` directive + `verify-report.md:174` recommendation)**: the canonical text reflects the corrected 7-direct + 3-transitive split. The Requirement body explicitly enumerates the seven direct devDependencies and the three transitive packages with a `Spec correction` note that documents the deviation from the delta. The 2 Scenarios are preserved as-written (they reference the family's direct devDependencies, not the enumeration).

### Final canonical state

| Element | Count | Notes |
|---|---|---|
| Purpose | 1 | Modified (five → any in-scope) |
| Requirements | 8 | 6 from DEBT-10 untouched + 2 new |
| Scenarios | 12 | 6 from DEBT-10 untouched + 6 new |

## Verification

### Final state (per native review post-apply gate + verify-report re-run)

| Source | Value |
|---|---|
| `npm audit --json` | 0 findings across all keys (`storybook`, `@react-email/preview-server`, `next`, `vitest`, `@vitest/browser`, `@vitest/coverage-v8`, `js-yaml`, `@babel/core`) |
| `npx vitest run --maxWorkers=2` | 844 passed / 21 failed (env-only) / 9 skipped (874 total) — IDENTICAL to DEBT-10 baseline |
| `npx next build` | Exit 0; 25/25 static pages; route table intact |
| `npm run lint` | Exit 0; clean output |
| Trivy gate (CI) | Green on both PRs (PR #86 + PR #87) |

### Verify-report verdict (semantic)

- **Spec requirements PASS**: 8/8 (6 DEBT-10 baseline + 2 ADDED)
- **Spec scenarios PASS**: 12/12 (6 DEBT-10 baseline + 6 ADDED)
- **MODIFIED Purpose verified (passive)**: PASS — synced at archive
- **Native review post-apply gate**: `result: "allow"`, `allowed: true`, `action: "continue"`
- **CRITICAL findings**: 0
- **WARNING findings**: 2 (both accepted)
- **FAIL findings**: 0
- **Both PRs verified**: YES

### Accepted warnings (do not block archive)

**W-1 (precedent, accepted): Manifest-only diff scope includes SDD traceability doc**

`git diff HEAD~2 HEAD` includes `openspec/changes/fix-security-baseline-b/apply-progress.md` (207-line insertion) in addition to `package.json` + `package-lock.json`. Same as the DEBT-10 W-1 precedent. The spec scenario for Requirement 5 (`baseline changes are manifest-only`) explicitly enumerates the forbidden list (`src/`, `tests/`, `vitest.config.ts`, `vitest.setup.ts`, or any workflow file); `apply-progress.md` has zero runtime impact and is not in that forbidden list.

**W-2 (pre-existing baseline, accepted): 21 env-only vitest failures**

`npx vitest run --maxWorkers=2` exits 1 with `Tests 21 failed | 844 passed | 9 skipped (874)` — IDENTICAL to the DEBT-10 baseline. The 21 failures are pre-existing env-only (4 `CookieBanner.test.tsx` + 17 `CartContext.test.tsx` using `localStorage.clear()` in jsdom env which doesn't expose it + 1 Strapi integration suite offline). `git diff HEAD~2 HEAD` shows zero source-code edits; this change cannot regress the test counts. Remediation (jsdom polyfill + integration suite marked properly) is out of scope for this change.

## Final state authority applied

The archive reflects the final state of the change as of `b38d018`, validated by the native review post-apply gate (`review-e7b2bc843da18239`, `chain_identity: sha256:801576c447b9932a92b4f06b1412c4184bc2c2eba40df6e6e23aeb3a21a54af4`):

- **Native review gate** (rank 1): PASSED twice (R1-R4 lenses, 0 BLOCKER/CRITICAL); post-apply validated as `allow`.
- **Persisted tasks artifact** (rank 2): 14/14 tasks complete in `openspec/changes/fix-security-baseline-b/tasks.md` (now archived at `openspec/changes/archive/2026-08-02-fix-security-baseline-b/tasks.md`).
- **Explicit final-state facts in launch prompt** (rank 3): both PRs merged (`7d0ce94` + `b38d018`); `npm audit` 0 findings; canonical spec sync directive provided.
- **`verify-report` + `apply-progress`** (rank 4): intermediate snapshots — superseded by higher-ranked sources where they disagree; preserved as audit trail in the archived folder.

## Engram trail summary

| # | Topic | Role |
|---|---|---|
| #1432 | `sdd/fix-security-baseline-b/proposal` | Proposal artifact (intent, scope, approach) |
| #1434 | `sdd/fix-security-baseline-b/spec` | Delta spec (`MODIFIED Purpose` + `ADDED Requirements`) |
| #1436 | `sdd/fix-security-baseline-b/design-gotchas` | Spec correction gotcha: 8-vs-7 Storybook direct packages |
| #1437 | `sdd/fix-security-baseline-b/design` | Technical design + per-PR plan |
| #1438 | `sdd/fix-security-baseline-b/tasks` | 14-task breakdown with 6-step local gate |
| #1439 | `sdd/fix-security-baseline-b/apply-progress` | Live apply tracker |
| #1441 | `sdd/fix-security-baseline-b/apply-pr1` | PR1 outcome: PR #86 squash-merged at `7d0ce94` |
| #1445 | `sdd/fix-security-baseline-b/apply-pr2-failure` | PR2 attempt 2 failure: downgrade regression analysis |
| #1447 | `sdd/fix-security-baseline-b/strategy-revision` | Strategy revision: downgrade → REMOVAL |
| #1449 | `sdd/fix-security-baseline-b/apply-pr2` | PR2 outcome: PR #87 squash-merged at `b38d018` |
| #1450 | `sdd/fix-security-baseline-b/stale-cleanup` | Post-merge stale worktree/disc cleanup |
| #1452 | `sdd/fix-security-baseline-b/verify` | Independent re-run of `sdd-verify` (pass-2) |
| #1454 | `sdd/fix-security-baseline-b/native-review-1` | Native review pass 1 (R1-R4) |
| #1455 | `sdd/fix-security-baseline-b/native-review-2` | Native review pass 2 (R1-R4) — 0 BLOCKER/CRITICAL |
| #1456 | `sdd/fix-security-baseline-b/native-review-gate` | Post-apply gate validation: `allow` |

## Strategy revision (post-apply-failure)

**Date**: 2026-08-02
**Engram**: #1447

The original plan was to downgrade `react-email` + `@react-email/preview-server` to `^4.3.2` based on the audit's recommendation at explore time (Engram #1428). The apply phase demonstrated that the downgrade is a regression:

- The audit DB drifted between explore and apply: the new advisory covers `4.2.1 - 5.0.0-canary.12` (includes `4.3.2`).
- The `4.3.2` transitive `next@15.5.2` has a separate CRITICAL advisory (`9.5.0 - 15.5.20`).
- Net result: 1 high + 1 critical (regression) vs the original 2 high (no improvement).

**New strategy**: REMOVE `@react-email/preview-server` entirely. The package is dead code (per Engram #1426: the `npm run email:dev` script that would invoke it is not declared in `package.json`). The `react-email` CLI remains installed at `^5.1.0` for future workflow repair. PR2's diff became deletion-only (~-223 lines; lockfile shrinks).

The user explicitly approved the strategy revision between attempt 2 (failed downgrade) and attempt 3 (removal). The proposal/spec/design/apply-progress/verify-report all reflect the revised strategy.

## Task completion gate

All 14 tasks in `openspec/changes/fix-security-baseline-b/tasks.md` are marked complete (`[x]`) and persisted in the archived `tasks.md`. The Task Completion Gate (per sdd-archive skill §Task Completion Gate) passes without reconciliation.

## Native review receipt gate

`gentle-ai review validate --gate post-apply` returned `result: "allow"`, `allowed: true`, `action: "continue"`, `reason: "authoritative transaction, current repository target, and content-bound artifacts match"`. The terminal receipt lineage `review-e7b2bc843da18239` with `chain_identity: sha256:801576c447b9932a92b4f06b1412c4184bc2c2eba40df6e6e23aeb3a21a54af4` matches the final candidate tree, paths digest, policy, ledger, fix delta, and base relationship. Gate passes; archive proceeds.

## Predecessor

`openspec/changes/archive/2026-07-30-fix-security-baseline/` (DEBT-10) — closed via PR #84 + PR #85 on 2026-07-30. DEBT-10 reduced 8 → 3 npm audit findings; DEBT-10b closes the remaining 3.

## Archive contents

| File | Status | Notes |
|---|---|---|
| `proposal.md` | ✅ present | Intent, scope, approach, risks, rollback, success criteria |
| `spec.md` | ✅ present | Change-level spec summary (delta lives in `specs/`) |
| `specs/security-baseline/spec.md` | ✅ present | Delta: MODIFIED Purpose + 2 ADDED Requirements |
| `design.md` | ✅ present | Technical design + per-PR plan + spec-correction section |
| `tasks.md` | ✅ present | 14/14 tasks complete; 6-step local gate documented |
| `apply-progress.md` | ✅ present | Live tracker (both PRs documented; gate logs + structural verification) |
| `verify-report.md` | ✅ present | `verdict: pass`, 8/8 Requirements, 12/12 Scenarios, 0 CRITICAL |
| `exploration.md` | ✅ present | Pre-propose exploration (Engram #1428) |
| `archive-report.md` | ✅ NEW (this file) | Archive closure record |

## References

- Proposal: `openspec/changes/archive/2026-08-02-fix-security-baseline-b/proposal.md`, Engram #1432
- Spec (delta): `openspec/changes/archive/2026-08-02-fix-security-baseline-b/specs/security-baseline/spec.md`, Engram #1434
- Spec (change-level): `openspec/changes/archive/2026-08-02-fix-security-baseline-b/spec.md`
- Design: `openspec/changes/archive/2026-08-02-fix-security-baseline-b/design.md`, Engram #1437
- Tasks: `openspec/changes/archive/2026-08-02-fix-security-baseline-b/tasks.md`, Engram #1438
- Apply progress: `openspec/changes/archive/2026-08-02-fix-security-baseline-b/apply-progress.md`, Engram #1439
- Verify report: `openspec/changes/archive/2026-08-02-fix-security-baseline-b/verify-report.md`, Engram #1452
- Exploration: `openspec/changes/archive/2026-08-02-fix-security-baseline-b/exploration.md`, Engram #1428
- Canonical spec (post-archive): `openspec/specs/security-baseline/spec.md` — 1 Purpose + 8 Requirements + 12 Scenarios
- Predecessor DEBT-10: `openspec/changes/archive/2026-07-30-fix-security-baseline/`
- PR #86: https://github.com/AndresDev28/e-commerce-relojes-bv-beni/pull/86 (squash-merged at `7d0ce94`)
- PR #87: https://github.com/AndresDev28/e-commerce-relojes-bv-beni/pull/87 (squash-merged at `b38d018`)
- Main HEAD at close: `b38d018c944fae777531dcf2a601002981bbf3d5`
- Native review lineage: `review-e7b2bc843da18239`, `chain_identity: sha256:801576c447b9932a92b4f06b1412c4184bc2c2eba40df6e6e23aeb3a21a54af4`
- Verify-report evidence revision: `sha256:dfa4e5c3cbc63ca2a91922eb2c3dc742139b48bd6e11c76c07664fc2d162aa4c`
- Strategy revision: Engram #1447
- Spec correction gotcha: Engram #1436
- Trivy cascade context: Engram #1400
- Project context: Engram #2
