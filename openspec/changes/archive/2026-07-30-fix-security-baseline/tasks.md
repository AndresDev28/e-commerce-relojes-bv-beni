# Tasks: fix-security-baseline

## Summary

| Metric | Value |
|---|---|
| Total tasks | 8 |
| Estimated diff | ~285-355 lines |
| Work units | 1 (single commit, single PR) |
| Strategy | single-pr (chained-PR reserved as escape hatch per design.md) |

## Task list

### Task 1: Create worktree and branch ✅

- **Type**: setup | **Pre-reqs**: on main, clean tree
- **Steps**: `git fetch origin main`; `git worktree add ../e-commerce-relojes-bv-beni-worktrees/debt-10-fix-security-baseline -b frontend/debt-10-fix-security-baseline main`; cd into worktree
- **Acceptance**: branch checked out at `<repo-parent>/e-commerce-relojes-bv-beni-worktrees/debt-10-fix-security-baseline/` ✅
- **Verify**: `git rev-parse --abbrev-ref HEAD` returns the branch ✅ (`frontend/debt-10-fix-security-baseline`)

### Task 2: Edit package.json — vitest trio direct bumps ✅

- **Type**: modify | **Pre-reqs**: Task 1
- **Steps**: lines 56-57: `@vitest/browser` and `@vitest/coverage-v8` `^3.2.4` -> `^3.2.7`; line 72: `vitest` `^3.2.4` -> `^3.2.7`
- **Acceptance**: 3 lines changed, 2 hunks in diff ✅
- **Verify**: `grep -E '"vitest"|"@vitest/browser"|"@vitest/coverage-v8"' package.json` shows three `^3.2.7` ranges ✅

### Task 3: Edit package.json — overrides entries (alphabetical) ✅

- **Type**: modify | **Pre-reqs**: Task 2
- **Steps**: insert `"@babel/core": "^7.29.7",` as FIRST entry (scoped `@` precedes alpha); insert `"js-yaml": "^4.3.0",` between `fast-uri` and `postcss`
- **Acceptance**: 2 new entries at correct alphabetical positions; other 6 entries undisturbed ✅
- **Verify**: alphabetical node check prints `OK` ✅ (order: `@babel/core` < `brace-expansion` < `esbuild` < `fast-uri` < `js-yaml` < `postcss` < `sharp` < `ws`)

### Task 4: Regenerate package-lock.json ✅

- **Type**: regenerate | **Pre-reqs**: Task 3
- **Steps**: `npm install` (no flags); confirm no `EOVERRIDE` errors; confirm no peer-dep warnings escalated
- **Acceptance**: lockfile regenerated cleanly; actual churn 339 lines (under 400 budget) ✅
- **Verify**: `git diff --stat package-lock.json` shows +174/-165 = 339 lines; no `EOVERRIDE` in stderr ✅ (benign peer warning resolved after vitest 3.2.7 propagation)

### Task 5: Local verification gate (6 steps IN ORDER, stop on first failure) ✅

- **Type**: verify | **Pre-reqs**: Task 4
- **Steps**:
  1. `npm audit --json | jq '.metadata.vulnerabilities'` -> `critical:0, high:0, low:0` for in-scope (Req 1-3)
  2. `npx vitest run --maxWorkers=2` -> same pass/fail as main (Req 5)
  3. `npx next build` -> success (catches @babel/core cascade)
  4. `npm run lint` -> clean
  5. `git diff --name-only main...HEAD | grep -vE '^(package\.json|package-lock\.json)$'` -> EMPTY (Req 5)
  6. Alphabetical check from Task 3 (Req 6)
  - **Acceptance**: all 6 pass; log appended to `apply-progress.md` ✅
  - **Stop conditions**: step 1 fail -> revert breaking override, re-run from step 4; step 2 fail -> revert vitest trio, file follow-up; step 3 fail -> revert @babel/core override, move to `fix-security-baseline-b`, re-run steps 1/4/5/6 with 4-package scope
  - **Actual results (executed in worktree)**:
    1. `npm audit --json` → `critical:0, high:0 for in-scope` (in-scope findings: `{}`); 3 high remain (OOS for `fix-security-baseline-b`)
    2. `npx vitest run --maxWorkers=2` → 844 passed, 21 failed — IDENTICAL to `main` baseline (env-only failures: jsdom `localStorage.clear` + Strapi offline). No regression.
    3. `npx next build` → PASS, 25 static pages generated. `@babel/core` cascade clean. Resend env warnings are pre-existing.
    4. `npm run lint` → PASS, clean.
    5. `git diff --name-only main` → `package.json`, `package-lock.json` only.
    6. Alphabetical overrides check → OK.
    - **No stop conditions fired.** Scope stays at 5 packages.

### Task 6: Commit and push ✅

- **Type**: commit | **Pre-reqs**: Task 5 passed
- **Steps**:
  1. `git add` ALL (manifest change + SDD artifacts)
  2. Commit with conventional format
  3. `git push -u origin frontend/debt-10-fix-security-baseline`
- **Note**: commit also includes the SDD artifacts under `openspec/changes/fix-security-baseline/` because they are tracked in git and were untracked on main — they ARE the change deliverable's traceability layer.
- **Verify**: `git log origin/frontend/debt-10-fix-security-baseline -1 --format='%H %s'` shows the commit ✅

### Task 7: Open PR and wait for CI ✅

- **Type**: deliver | **Pre-reqs**: Task 6; PR body stub at `openspec/changes/fix-security-baseline/pr-body.md`
- **Steps**: `gh pr create --base main --head frontend/debt-10-fix-security-baseline --title "chore(deps): fix security baseline (DEBT-10)" --body-file openspec/changes/fix-security-baseline/pr-body.md`; add `type:chore` label; wait for `security.yml` Trivy (exit-code:1 on HIGH,CRITICAL) green + `ci.yml` green; do NOT auto-merge
- **Verify**: `gh pr checks` returns all green ✅

### Task 8: Merge and record ✅

- **Type**: deliver | **Pre-reqs**: Task 7 CI green + human review
- **Steps**: `gh pr merge --squash --delete-branch`; `cd <main-repo>`; `git fetch origin main && git pull --ff-only`; `git worktree remove ../e-commerce-relojes-bv-beni-worktrees/debt-10-fix-security-baseline`
- **Verify**: `git log main --oneline -3` shows the merge commit ✅

## Review Workload Forecast

```yaml
review_workload_forecast:
  estimated_changed_lines: 320       # package.json (~5) + package-lock.json (~280-350)
  estimated_files_changed: 2
  work_units: 1
  chained_prs_recommended: false
  risk_level: low
  budget_400_line_risk: low          # forecast ~285-355, well under 400
  decision_needed_before_apply: false # user locked single-PR + 5-package scope pre-propose
  troncation_strategy: single_commit
  escape_hatch: chained_pr_if_cascade_breaks_build_or_tests
```

## Dependency graph

```
Task 1 (worktree) -> Task 2 (vitest) -> Task 3 (overrides) -> Task 4 (lockfile) -> Task 5 (verify) -> Task 6 (commit) -> Task 7 (PR + CI) -> Task 8 (merge)
```

## References

- Proposal: `openspec/changes/fix-security-baseline/proposal.md`, Engram #1416
- Spec: `openspec/changes/fix-security-baseline/specs/security-baseline/spec.md`, Engram #1417
- Design: `openspec/changes/fix-security-baseline/design.md`, Engram #1419
- Exploration: `openspec/changes/fix-security-baseline/exploration.md`, Engram #1415
- Roadmap: Engram #1402; Trivy cascade: Engram #1400; Project context: Engram #2
- Skills: work-unit-commits, chained-pr, branch-pr