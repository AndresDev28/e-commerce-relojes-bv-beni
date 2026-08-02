# Apply Progress: fix-security-baseline-b (DEBT-10b)

> **STATUS: PENDING sdd-apply.** This file is the live tracker that `sdd-apply` fills in as it executes the 14 tasks in `tasks.md`. Read it before each task; update it after each task.

## Status

**Overall**: 12/14 tasks complete. PR1 merged; PR2 preview-server removal passed the local gate and structural verification.

**Branch**: `frontend/debt-10b-fix-security-baseline-pr2-react-email` @ `7d0ce94` (post-PR1 main).

**PR1 (Storybook)**: Tasks 1-7 complete; PR #86 squash-merged at `7d0ce94`
**PR2 (React Email preview-server removal)**: Tasks 8-10 complete; Tasks 11-13 pending
**Post-merge**: Task 14 deferred to orchestrator

**Active attempt**: `gentle-ai sdd-attempt` ordinal 3, generation 3, work_unit `PR2-React-Email-preview-server-removal`; 400-line cap.

## Spec correction (Engram #1436) — recorded at Task 3

The delta spec at `openspec/changes/fix-security-baseline-b/specs/security-baseline/spec.md:19` enumerates **8** packages as direct Storybook devDependencies, but `package.json` only declares **7 direct** at lines 43-47, 64, 69. `@storybook/react-vite` is TRANSITIVE — it only resolves nested under `@storybook/nextjs-vite`. `@storybook/react` and `@storybook/builder-vite` are also transitive.

`npm ls --all` cross-check (recorded by sdd-apply at Task 3):

```
$ npm ls @storybook/react-vite @storybook/react @storybook/builder-vite --all
relojes-bv-beni@1.4.0 /home/adreidev/dev/personal-projects/e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr1-storybook
└─┬ @storybook/nextjs-vite@9.1.20
  ├── @storybook/builder-vite@9.1.20
  ├─┬ @storybook/react-vite@9.1.20
  │ ├── @storybook/builder-vite@9.1.20 deduped
  │ └── @storybook/react@9.1.20 deduped
  └── @storybook/react@9.1.20
```

All 3 transitive Storybook packages follow automatically when the 7 direct devDeps are bumped. Lockfile regeneration (`package-lock.json` +176/-129 = 305 lines total churn, within the 160-350 forecast) reflects the family alignment.

**Decision (locked at design time, Engram #1436)**: Accept-with-rationale. sdd-apply MUST NOT modify the spec file (sdd-spec boundary). sdd-apply surfaces this deviation in this apply-progress.md file. **Action for sdd-archive**: When syncing canonical `openspec/specs/security-baseline/spec.md`, replace the 8-package enumeration with the corrected 7-direct + 3-transitive list (3 transitive under `@storybook/nextjs-vite`: `@storybook/react-vite`, `@storybook/react`, `@storybook/builder-vite`).

## Cascade contingency (per design §npm-cascade contingency)

If `npm audit` reveals findings beyond the 3 in scope on either PR:

| Scenario | Trigger condition | Response |
|---|---|---|
| Auto-fixable with same bump | New transitive dep that upgrades cleanly with the family's bump | Stay in this change; absorb into current PR; document here |
| Different fix path required | Separate dep / override / source change needed | Defer to follow-up change `fix-security-baseline-c`; abort current PR's verify-report; record reason here |
| Production-dep cascade | New prod-dep Trivy finding appears | **STOP. Do not merge.** Open `fix-security-baseline-c` immediately; record here |

[ Contingency outcomes will be appended by sdd-apply if triggered ]

## PR1 — Storybook (9.0.16 → 9.1.20)

**Branch**: `frontend/debt-10b-fix-security-baseline-pr1-storybook`
**Worktree**: `<repo-parent>/e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr1-storybook/`
**PR title**: `chore(deps): bump Storybook family 9.0.16 → 9.1.20 (DEBT-10b PR1)`
**Label**: `type:chore`

### Tasks

- [x] Task 1 — Create PR1 worktree + branch from fresh `main`
- [x] Task 2 — Edit `package.json` devDependencies lines 43-47, 64, 69: 7 Storybook bumps to `9.1.20`
- [x] Task 3 — `npm install` + verify family alignment + document spec correction above
- [x] Task 4 — Run PR1 6-step local verification gate (record below)
- [x] Task 5 — Smoke: `npx storybook build` (record below)
- [x] Task 6 — Commit (2 commits per work-unit-commits) + open PR + wait for CI
- [x] Task 7 — Merge PR1 (`--squash --delete-branch`) + handoff to PR2

### PR1 verification gate log (filled in by sdd-apply at Task 4)

| # | Command | Expected result | Actual result |
|---|---|---|---|
| 1 | `npm install` | Exit 0; no `EOVERRIDE` | ✅ PASS — exit 0; "added 842 packages, audited 843"; benign `tsconfck@3.1.6 unmaintained` deprecation warning; `npm warn deprecated @react-email/preview-server@5.2.11` (pre-existing, PR2 target); no `EOVERRIDE`; no peer-dep warnings |
| 2 | `npm audit --json` | `storybook` key absent from `.vulnerabilities` | ✅ PASS — `vuln keys: ['@react-email/preview-server', 'next']`; `storybook` key ABSENT; metadata `critical:0, high:2` (the 2 are PR2's React Email + nested-next — expected) |
| 3 | `npx vitest run --maxWorkers=2` | Matches main baseline (844P/21F/9S env-only) | ✅ PASS — `Tests 21 failed \| 844 passed \| 9 skipped (874)`; IDENTICAL to DEBT-10 baseline; the 21 env-only failures are `localStorage.clear is not a function` in jsdom env (pre-existing) |
| 4 | `npx next build` | 25 static pages, route table intact | ✅ PASS — `Generating static pages (25/25)`; full route table generated (28 routes total: 25 static + dynamic); `Resend configuration has errors` is a pre-existing env-only warning (not a build error); no `@vitejs/plugin-react` cascade |
| 5 | `npm run lint` | Exit 0; clean output | ✅ PASS — exit 0; clean stdout (no warnings, no errors) |
| 6 | `git diff --name-only main` | Only `package.json` + `package-lock.json` (+ apply-progress.md) | ✅ PASS — only `package.json` + `package-lock.json` (apply-progress.md is untracked; will be added as Commit A in Task 6); `package.json | 14 +-`, `package-lock.json | 305 +-` |

### PR1 smoke log (filled in by sdd-apply at Task 5)

| Smoke | Expected | Actual |
|---|---|---|
| `npx storybook build` | Static Storybook artifact generated; no mixed-9.0/9.1 warnings; `storybook-static/index.html` exists | ✅ PASS — built in 3.49s; 398 modules transformed; `Output directory: .../storybook-static`; all 7 stories built (`Button.stories`, `Buttons.stories`, `Header.stories`, `Input.stories`, `Modal.stories`, `Page.stories`, `Spinner.stories`); `storybook-static/index.html` exists; no `9.0.16` references; no mixed-version warnings. Pre-existing Next.js `"use client"` directive warning is unrelated to the Storybook version bump (it predates the change). |

### PR1 lockfile churn

| Forecast (design.md) | Actual (filled by sdd-apply) |
|---|---|
| ~160-350 lines | **+176/-129 = 305 lines** (within forecast). `git diff --stat package-lock.json`: `1 file changed, 176 insertions(+), 129 deletions(-)`. Combined with package.json (+7/-7 = 14 lines): PR1 total = **+183/-136 = 319 lines** (well under 400-line budget). |

### PR1 stop conditions check (filled by sdd-apply at Task 4)

- [x] Step 2 audit fail: NOT TRIGGERED — `storybook` key absent; only PR2 findings remain
- [x] Step 3 vitest regression: NOT TRIGGERED — 844P/21F/9S identical to DEBT-10 baseline; 21 env-only failures are pre-existing jsdom `localStorage.clear is not a function`
- [x] Step 4 next build cascade: NOT TRIGGERED — `Generating static pages (25/25)` clean; no `@vitejs/plugin-react` breakage; Resend env-warnings are pre-existing and unrelated
- [x] Step 6 scope drift: NOT TRIGGERED — `git diff --name-only main` shows ONLY `package.json` + `package-lock.json`; apply-progress.md is untracked (to be added in Commit A)

### PR1 commits + PR + CI (filled by sdd-apply at Tasks 6-7)

- Commit A (docs): `docs(sdd): add fix-security-baseline-b artifact for PR1 (Storybook scope)` — SHA [fill], files [fill]
- Commit B (deps): `chore(deps): bump Storybook family 9.0.16 → 9.1.20 (DEBT-10b PR1)` — SHA [fill], files [fill]
- PR URL: [ fill from `gh pr create` output ]
- PR label applied: `type:chore` [ fill ]
- CI status: [ fill from `gh pr checks` ]
- Merge commit SHA on `main`: [ fill from `gh pr merge --squash` output ]

## PR2 (React Email preview-server removal) — Tasks 8-13

**Status**: in progress

**Branch**: `frontend/debt-10b-fix-security-baseline-pr2-react-email`
**Worktree**: `<repo-parent>/e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr2-react-email/`
**PR title**: `chore(deps): remove @react-email/preview-server (DEBT-10b PR2)`
**Label**: `type:chore`
**Branches from**: fresh `main` (post-PR1 merge) — NOT stacked on PR1 branch

**Pre-flight**: main @ `7d0ce94` (PR1 squash-merged); clean working tree; npm audit pre-PR2 shows 2 high findings (PR2 scope).

**Strategy revision (Engram #1447)**: This PR removes `@react-email/preview-server` entirely. The original downgrade to `^4.3.2` regressed the audit due to audit DB drift and a new CRITICAL `next` advisory. The package is dead code (per Engram #1426), while the `react-email` CLI remains installed at `^5.1.0`.

### Tasks

- [x] Task 8 — Create PR2 worktree + branch from fresh `main` (post-PR1)
- [x] Task 9 — Remove `@react-email/preview-server` from `devDependencies`; retain `react-email` CLI at `^5.1.0`
- [x] Task 10 — `npm install` + verify package absent + nested-next cleared + audit clean
- [x] Task 11 — Run PR2 6-step local verification gate (record below)
- [x] Task 12 — Structural verification: package absent + no source references (record below)
- [x] Task 13 — Commit (2 commits) + open PR #87 + wait for CI Trivy ✅ (DONE — 9/9 CI green, PR #87 at https://github.com/AndresDev28/e-commerce-relojes-bv-beni/pull/87)
- [x] Task 14 — Merge PR2 (`--squash --delete-branch`) + post-merge audit + sdd-verify + sdd-archive ✅ (DONE — PR #87 merged at `b38d018`, `npm audit` 0 findings, sdd-verify PASS 8/8 Requirements 12/12 Scenarios, sdd-archive in progress)

**After Task 9**: `package.json` has exactly one deletion in `devDependencies`: the `@react-email/preview-server` entry. The `react-email` CLI remains at `^5.1.0`.

**After Task 10**: `npm install` exited 0 with no `EOVERRIDE`; `npm ls @react-email/preview-server --all` reports `(empty)`; no nested `next` chain exists under preview-server; `npm audit` reports 0 findings; `package-lock.json` is deletion-only (`0` insertions, `223` deletions).

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `npm ls @react-email/preview-server --all` → `(empty)`; `npm audit --json` → 0 total findings |
| Runtime harness | Structural dependency harness: package directory absent and no nested `next` preview-server path; no runtime preview workflow exists because `email:dev` is undeclared |
| Rollback boundary | Revert `package.json` and `package-lock.json` from PR2 only; this restores preview-server and its two audit findings without affecting PR1 |

### PR2 verification gate log

| # | Command | Expected result | Actual result |
|---|---|---|---|
| 1 | `npm install` | Exit 0; no `EOVERRIDE` | ✅ PASS — exit 0; audited 837 packages; found 0 vulnerabilities; no `EOVERRIDE` |
| 2 | `npm audit --json` | 0 findings | ✅ PASS — `info:0, low:0, moderate:0, high:0, critical:0, total:0` |
| 3 | `npx vitest run --maxWorkers=2` | Matches main baseline (844P/21F/9S env-only) | ✅ PASS — exact baseline: 844 passed, 21 pre-existing `localStorage.clear` failures, 9 integration skips; no regression |
| 4 | `npx next build` | 25 static pages, route table intact | ✅ PASS — compiled successfully; generated 25/25 static pages; route table intact; pre-existing Resend env warnings only |
| 5 | `npm run lint` | Exit 0; clean output | ✅ PASS — exit 0; no lint findings |
| 6 | `git diff --name-only main` | Only `package.json`, `package-lock.json`, and this file | ✅ PASS — exactly the three expected paths |

### PR2 structural verification log

| Check | Expected | Actual |
|---|---|---|
| `npm ls @react-email/preview-server --all` | Empty dependency tree | ✅ PASS — root tree reports `(empty)` |
| `find node_modules/@react-email -maxdepth 2 -type d` | No `preview-server` directory | ✅ PASS — retained React Email component/render packages listed; no preview-server path |
| Source reference search in `src/` and `.github/` | Zero references | ✅ PASS — zero matches in both roots |

### PR2 lockfile churn

| Forecast (design.md) | Actual |
|---|---|
| ~223 deletions | **0 insertions / 223 deletions** — exact deletion-only forecast |

### PR2 stop conditions check

- [x] Task 10 audit fail: NOT TRIGGERED — audit reports 0 findings
- [x] Task 11 vitest regression: NOT TRIGGERED — exact 844P/21F/9S baseline matched
- [x] Task 11 next build cascade: NOT TRIGGERED — build completed with 25/25 static pages
- [x] Task 11 scope drift: NOT TRIGGERED — exactly three expected files
- [x] Task 12 structural verification failure: NOT TRIGGERED — package absent, no directory, zero source references

### PR2 commits + PR + CI

- Commit A (docs): pending
- Commit B (deps): pending
- PR URL: pending
- PR label applied: pending
- CI status: pending

## Post-merge audit (filled by sdd-apply at Task 14)

```
[ fill from `npm audit --json` on fresh post-merge main ]
$ npm audit --json | jq '.metadata.vulnerabilities'
[ paste result — must show critical:0, high:0 ]
```

## Files written (worktrees)

- PR1 worktree:
  - `package.json` — [ fill actual diff stat ]
  - `package-lock.json` — [ fill actual diff stat ]
  - `openspec/changes/fix-security-baseline-b/apply-progress.md` — this file
- PR2 worktree:
  - `package.json` — [ fill actual diff stat ]
  - `package-lock.json` — [ fill actual diff stat ]
  - `openspec/changes/fix-security-baseline-b/apply-progress.md` — this file (updated)

## Notes (filled by sdd-apply)

- [ Pre-existing test failures (21 env-only: jsdom `localStorage.clear` + Strapi backend offline) are part of the main baseline and NOT regressions from this change. ]
- [ Trivy cascade posture (Engram #1400): devDeps filtered → 0 prod-dep delta expected. Trivy job green confirms. ]
- [ Worktree hygiene: PR1 worktree removed at Task 7; PR2 worktree removed at Task 14. ]
- [ Stale worktrees from prior sessions: [ inventory remaining worktrees, list any orphans not from this change ]. ]