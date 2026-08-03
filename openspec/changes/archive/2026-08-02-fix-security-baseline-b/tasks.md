# Tasks: fix-security-baseline-b (DEBT-10b)

## Summary

| Metric | Value |
|---|---|
| Total tasks | 14 |
| Estimated diff | PR1 ~+375 lines; PR2 ~-223 lines (deletion-only); combined ~+152 lines net |
| Work units | 2 (PR1 Storybook [DONE] + PR2 React Email preview-server removal) |
| Strategy | chained-pr (Stacked-PRs to main; disjoint dep families, not stacked-feature-branch) |
| TDD mode | Regression gate only (manifest-only change; per DEBT-10 precedent — strict_tdd=true in `openspec/config.yaml` but no new behavior ships) |
| Base branch (both PRs) | fresh `main` (per Engram #1431 locked decision + Engram #1398 worktree convention) |
| Strategy revision | 2026-08-02 (Engram #1447): PR2 changed from downgrade to removal after apply-failure |

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines (PR1) ✅ | +375 lines (manifest +7/-7 + lockfile cascade + apply-progress); merged at `7d0ce94` |
| Estimated changed lines (PR2) | ~-223 lines (manifest -1; lockfile shrinks by ~223 lines, deletion-only) |
| Combined PR diff (across 2 PRs) | ~+152 lines net (PR2 deletion partially offsets PR1 addition) |
| 400-line budget risk | Low (PR2 is deletion-only; PR1 closed at 319 code lines) |
| Chained PRs recommended | Yes |
| Suggested split | PR1 Storybook [DONE] → PR2 React Email preview-server removal |
| Delivery strategy | ask-on-risk (split pre-approved by user Engram #1431) |
| Chain strategy | stacked-to-main (disjoint families — no tracker branch needed) |

```text
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low
```

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 ✅ | Close the `storybook` audit finding via family-aligned 9.0.16 → 9.1.20 bump | PR1 | `npx storybook build` (smoke) + `npx vitest run --maxWorkers=2` (gate step 2) + `npm audit --json` (gate step 1) | `npx storybook build` produces static stories + autodocs + interaction test | `git revert <PR1-merge-commit>` → Storybook returns to 9.0.16; `storybook` audit finding reappears; no other audit key affected |
| 2 | Close `@react-email/preview-server` + nested `next@16.2.3` findings via REMOVAL of `@react-email/preview-server` from `devDependencies` (package is dead code; per Engram #1426, the `npm run email:dev` script that invokes it is missing) | PR2 | `npm ls @react-email/preview-server --all` (structural: empty) + `npx vitest run --maxWorkers=2` (gate step 2) + `npm audit --json` (gate step 1) | `npm ls` confirms package + nested `next` both absent | `git revert <PR2-merge-commit>` → `@react-email/preview-server` returns to `devDependencies`; both audit findings reappear; no other audit key affected |

### Per-PR 6-step local verification gate (must run BEFORE commit/push)

Adapted from `openspec/changes/archive/2026-07-30-fix-security-baseline/apply-progress.md`. Execute **in order**, stop on first failure.

| # | Command | Pass criterion |
|---|---|---|
| 1 | `npm install` (after manifest edit) | Exit 0; no `EOVERRIDE`; no unresolved peer warnings for the bumped family |
| 2 | `npm audit --json` — inspect `.vulnerabilities` | `critical:0, high:0` for the family's audit keys. PR1: `storybook` empty. PR2: `@react-email/preview-server` AND nested-`next` both empty |
| 3 | `npx vitest run --maxWorkers=2` | Same pass/fail/skip counts as `main` baseline (DEBT-10 measured 844P/21F/9S env-only). Any regression → STOP |
| 4 | `npx next build` | Build completes cleanly; 25 static pages route table intact. Catches implicit dep breakage (Storybook family cascades via `@vitejs/plugin-react`) |
| 5 | `npm run lint` | Exit 0; clean output. Indirectly exercises `js-yaml` via `@eslint/eslintrc` |
| 6 | `git diff --name-only main` | Exactly `package.json` + `package-lock.json` (and optionally `apply-progress.md`). Anything else → flag & re-check |

## Task list

### Tasks checklist (for SDD progress gate)

- [x] **Task 1**: Create PR1 worktree + branch from fresh `main` ✅ (DONE — PR #86 squash-merged at `7d0ce94`)
- [x] **Task 2**: Edit `package.json` devDependencies — 7 Storybook family direct bumps `9.0.16` → `9.1.20` ✅ (DONE)
- [x] **Task 3**: Regenerate `package-lock.json` + verify family alignment (PR1 spec correction recorded) ✅ (DONE)
- [x] **Task 4**: Run PR1 6-step local verification gate ✅ (DONE — all 6 steps PASS)
- [x] **Task 5**: Smoke test — `npx storybook build` ✅ (DONE — 7 stories built)
- [x] **Task 6**: Commit (2 commits per work-unit-commits) + open PR #86 + wait for CI Trivy ✅ (DONE — 9/9 CI green)
- [x] **Task 7**: Merge PR1 (`--squash --delete-branch`) + handoff to PR2 ✅ (DONE — squash-merged at `7d0ce94`)
- [x] **Task 8**: Create PR2 worktree + branch from fresh `main` @ `7d0ce94` (NOT PR1) ✅ (DONE)
- [x] **Task 9**: Edit `package.json` — REMOVE `@react-email/preview-server` (1 line deletion) ✅ (DONE — strategy revision per Engram #1447)
- [x] **Task 10**: Regenerate `package-lock.json` + verify package absence + nested-next cleared + audit clean ✅ (DONE — 0 findings)
- [x] **Task 11**: Run PR2 6-step local verification gate ✅ (DONE — all 6 steps PASS)
- [x] **Task 12**: Structural verification — `npm ls @react-email/preview-server --all` empty + no source references ✅ (DONE)
- [x] **Task 13**: Commit (2 commits) + open PR #87 + wait for CI Trivy ✅ (DONE — 9/9 CI green, Trivy 8s PASS)
- [x] **Task 14**: Merge PR2 (`--squash --delete-branch`) + post-merge audit + sdd-verify + sdd-archive ✅ (DONE — PR #87 merged at `b38d018`, `npm audit` 0 findings, sdd-verify PASS 8/8 Requirements 12/12 Scenarios, sdd-archive in progress)

### Task 1: Create PR1 worktree and branch ✅ (DONE — PR #86 merged at `7d0ce94`)

- **Type**: setup | **Pre-reqs**: on `main`, clean tree
- **Inputs**: clean working tree at `main` @ `e14f1b5`; fresh `git fetch origin main`; empty/non-existent worktree at `<repo-parent>/e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr1-storybook/`
- **Steps**:
  1. `git fetch origin main`
  2. `git worktree add ../e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr1-storybook -b frontend/debt-10b-fix-security-baseline-pr1-storybook main`
  3. `cd` into the new worktree
- **Output**: branch `frontend/debt-10b-fix-security-baseline-pr1-storybook` checked out at `<repo-parent>/e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr1-storybook/`
- **Verification**: `git rev-parse --abbrev-ref HEAD` returns `frontend/debt-10b-fix-security-baseline-pr1-storybook`; `git log -1 --oneline` shows `e14f1b5` as HEAD; worktree path exists and contains a fresh `.codegraph/` index.

### Task 2: Edit package.json — Storybook family direct bumps (7 lines) ✅ (DONE)

- **Type**: modify | **Pre-reqs**: Task 1
- **Inputs**: clean `package.json` at line 43-47 (`@storybook/addon-a11y`, `@storybook/addon-docs`, `@storybook/addon-onboarding`, `@storybook/addon-vitest`, `@storybook/nextjs-vite`), line 64 (`eslint-plugin-storybook`), line 69 (`storybook`) — all pinned at `9.0.16`
- **Steps**: replace `9.0.16` → `9.1.20` at exactly those 7 lines. Preserve exact-pin style (no caret). Do NOT add `@storybook/react-vite` to devDependencies — it is TRANSITIVE under `@storybook/nextjs-vite` (per Engram #1436 gotcha + design §Spec corrections). Do NOT touch the `overrides` block (8 entries alphabetical: `@babel/core`, `brace-expansion`, `esbuild`, `fast-uri`, `js-yaml`, `postcss`, `sharp`, `ws`).
- **Output**: `package.json` with 7 lines changed; `git diff package.json` shows 7 insertions / 7 deletions, scoped to devDependencies only.
- **Verification**: `grep -nE '"@storybook|^\s*"storybook|^\s*"eslint-plugin-storybook"' package.json` shows 7 lines with `"9.1.20"` (no `"9.0.16"` left in Storybook family); `git diff --stat` shows `package.json | 14 +-` (7 hunks).

### Task 3: Regenerate package-lock.json + verify family alignment ✅ (DONE)

- **Type**: regenerate | **Pre-reqs**: Task 2
- **Inputs**: edited `package.json` from Task 2; clean lockfile pre-state
- **Steps**:
  1. `npm install` (no flags). Confirm exit 0, no `EOVERRIDE`, no unresolved peer warnings.
  2. `npm ls @storybook/react-vite @storybook/react @storybook/builder-vite --all` — confirm all three resolve at `9.1.20` (transitive follow-through).
  3. `git diff --stat package-lock.json` — record actual churn (forecast 160-350 lines; flag if >400).
  4. Document the spec correction in `openspec/changes/fix-security-baseline-b/apply-progress.md` (Accept-with-rationale: 7 direct bumped, not 8 as the delta spec enumerates; `@storybook/react-vite` + `@storybook/react` + `@storybook/builder-vite` follow transitively).
- **Output**: regenerated `package-lock.json`; `apply-progress.md` populated with the 7-direct/3-transitive rationale
- **Verification**: `npm ls ... --all` shows three transitive Storybook packages at `9.1.20`; `git diff --stat` shows lockfile churn ≤400 lines; no `npm WARN EOVERRIDE` in stderr.

### Task 4: Run PR1 6-step local verification gate ✅ (DONE)

- **Type**: verify | **Pre-reqs**: Task 3
- **Inputs**: installed deps from Task 3; reference baseline (DEBT-10 measured 844P/21F/9S on `main`)
- **Steps**: execute gate steps 1-6 in order per the per-PR 6-step table above. **Stop on first failure.** Record each result in `apply-progress.md` (gate log table).
- **Stop conditions**:
  - Step 2 (`npm audit`) → `storybook` key still shows high finding: revert `package.json` lines 43-47, 64, 69 to `9.0.16`; re-run from Task 2 with `9.1.21` or higher; re-run gate.
  - Step 3 (vitest) regression vs main baseline: revert Storybook bump; file follow-up change.
  - Step 4 (`next build`) broken by `@vitejs/plugin-react` cascade: revert Storybook bump; defer to `fix-security-baseline-c`.
  - Step 6 (`git diff`) shows files outside `package.json` + `package-lock.json` + `apply-progress.md`: STOP, investigate, fix root cause before commit.
- **Output**: `apply-progress.md` gate log table populated with PR1 6-step results (all PASS required to advance)
- **Verification**: every gate step row in `apply-progress.md` says PASS; `npm audit --json | jq '.metadata.vulnerabilities'` returns `critical:0, high:0` with the `storybook` audit key absent from `.vulnerabilities`.

### Task 5: Smoke test — `npx storybook build` ✅ (DONE)

- **Type**: smoke | **Pre-reqs**: Task 4 PASS
- **Inputs**: installed deps from Task 3; 7 story files under `src/**/*.stories.*`; `.storybook/{main,preview,vitest.setup}.ts`
- **Steps**:
  1. `npx storybook build` (no flags).
  2. Inspect stdout for mixed-9.0/9.1 warnings (must be absent).
  3. Confirm build artifact `storybook-static/index.html` exists and references all 7 stories.
  4. Record result in `apply-progress.md` smoke log.
- **Stop conditions**: build fails OR mixed-version warnings appear → revert Task 2 changes; defer to follow-up change.
- **Output**: `apply-progress.md` smoke log row populated (PASS required)
- **Verification**: `ls storybook-static/index.html` returns the file; grep stdout for `9.0.16` returns 0 lines; build exit code 0.

### Task 6: Commit + open PR1 + wait for remote CI ✅ (DONE — PR #86)

- **Type**: deliver | **Pre-reqs**: Task 5 PASS
- **Inputs**: clean working tree with manifest + lockfile edits + apply-progress.md updates; SDD traceability artifacts under `openspec/changes/fix-security-baseline-b/` (untracked on main per DEBT-10 precedent)
- **Steps**:
  1. Per `work-unit-commits`: split into 2 commits per DEBT-10 apply-progress precedent:
     - Commit A: `docs(sdd): add fix-security-baseline-b artifact for PR1 (Storybook scope)` — SDD traceability files only (`openspec/changes/fix-security-baseline-b/{proposal,exploration,design,spec,specs,tasks,apply-progress}.md`).
     - Commit B: `chore(deps): bump Storybook family 9.0.16 → 9.1.20 (DEBT-10b PR1)` — manifest + lockfile only (≤350 lines).
  2. `git push -u origin frontend/debt-10b-fix-security-baseline-pr1-storybook`.
  3. Use `branch-pr` skill: `gh pr create --base main --head frontend/debt-10b-fix-security-baseline-pr1-storybook --title "chore(deps): bump Storybook family 9.0.16 → 9.1.20 (DEBT-10b PR1)" --body-file openspec/changes/fix-security-baseline-b/pr-body.md`; add `type:chore` label.
  4. Wait for `.github/workflows/security.yml` Trivy (exit-code:1 on HIGH,CRITICAL) green + `.github/workflows/ci.yml` green. **Do NOT auto-merge** (repo policy + per DEBT-10 precedent).
- **Output**: PR1 opened with label `type:chore`; both commits on the remote branch; apply-progress.md Task 6 row populated with PR URL + commit SHAs.
- **Verification**: `gh pr checks` returns all green; `git log origin/frontend/debt-10b-fix-security-baseline-pr1-storybook --oneline` shows the 2 commits in order; Trivy job specifically green (Engram #1400 cascade posture: devDeps filtered → zero prod delta expected).

### Task 7: Merge PR1 + record ✅ (DONE — squash-merged at `7d0ce94`)

- **Type**: deliver | **Pre-reqs**: Task 6 CI green + human review approval
- **Inputs**: PR1 in `gh` with all checks green + reviewer approval
- **Steps**:
  1. `gh pr merge --squash --delete-branch` (per DEBT-10 precedent).
  2. In main repo: `git fetch origin main && git pull --ff-only`.
  3. `git worktree remove ../e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr1-storybook`.
  4. Update `apply-progress.md` Status section: PR1 merged; PR2 ready to begin.
- **Output**: PR1 merged into `main`; PR1 worktree removed; `apply-progress.md` records merge commit SHA + Trivy CI confirmation
- **Verification**: `git log main --oneline -3` shows the squash merge commit; `npm audit --json` on `main` shows 2 remaining findings (the React Email + nested-next pair) and `storybook` is gone.

### Task 8: Create PR2 worktree and branch (from fresh main, NOT PR1)

- **Type**: setup | **Pre-reqs**: Task 7 (PR1 merged to main) + strategy revision (Engram #1447) approved
- **Inputs**: `main` HEAD now contains PR1 squash merge (Storybook at 9.1.20, audit shows 2 remaining findings: `@react-email/preview-server` + nested `next`)
- **Steps**:
  1. `git fetch origin main && git pull --ff-only` (in main repo).
  2. `git worktree add ../e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr2-react-email -b frontend/debt-10b-fix-security-baseline-pr2-react-email main`.
  3. `cd` into the new worktree.
- **Critical**: branch from fresh `main` (NOT from PR1 branch — dep families are disjoint, per Engram #1431 locked decision; do NOT stack PR2 on PR1).
- **Output**: branch `frontend/debt-10b-fix-security-baseline-pr2-react-email` checked out at `<repo-parent>/e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr2-react-email/`
- **Verification**: `git rev-parse --abbrev-ref HEAD` returns the PR2 branch name; `git log -1 --oneline` shows the post-PR1 merge commit (`7d0ce94`); worktree path is distinct from PR1 worktree path.

### Task 9: Edit package.json — REMOVE `@react-email/preview-server` (1 line deletion)

- **Type**: modify | **Pre-reqs**: Task 8
- **Inputs**: clean `package.json` at line 42 (`@react-email/preview-server: ^5.1.0` in devDependencies block)
- **Steps**:
  1. DELETE line 42 entirely: `"@react-email/preview-server": "^5.1.0",` is removed from `devDependencies`.
  2. Do NOT touch line 31 (`react-email: ^5.1.0` in `dependencies`) — the CLI stays installed for future workflow repair.
  3. Do NOT touch `react-email`'s production deps (`@react-email/components@^1.0.2`, `@react-email/render@^2.0.0`, `@react-email/preview@^0.0.13` per exploration Engram #1428) — those follow independently.
  4. Do NOT touch the `overrides` block (8 entries alphabetical unchanged).
- **Output**: `package.json` with 1 line removed; `git diff package.json` shows 1 deletion in `devDependencies` only.
- **Verification**: `grep -nE '"@react-email/preview-server"' package.json` returns 0 lines; `grep -nE '"react-email"' package.json` shows line 31 still at `"^5.1.0"`; `git diff --stat` shows `package.json | 1 -` (1 deletion).

### Task 10: Regenerate package-lock.json + verify package absence + nested-next cleared

- **Type**: regenerate | **Pre-reqs**: Task 9
- **Inputs**: edited `package.json` from Task 9 (1 line deletion); clean lockfile pre-state (now at post-PR1 state)
- **Steps**:
  1. `npm install` (no flags). Confirm exit 0, no `EOVERRIDE`, no peer-dep warnings about removed package.
  2. `npm ls @react-email/preview-server --all` — confirm EMPTY (package completely absent from the dep tree).
  3. `npm ls next --all` — confirm NO `next` resolves under any `@react-email/preview-server/node_modules/next` path. Top-level `next@^15.5.21` (out of scope) untouched.
  4. `npm audit --json` — confirm `@react-email/preview-server` AND nested-`next` audit keys are absent (0 high findings total).
  5. `git diff --stat package-lock.json` — record actual churn (forecast -223 lines; flag if any additions).
  6. Document the result in `openspec/changes/fix-security-baseline-b/apply-progress.md`.
- **Output**: regenerated `package-lock.json` (smaller by ~223 lines); `npm audit` returns 0 findings; `apply-progress.md` populated with package-absence verification.
- **Verification**: `npm ls @react-email/preview-server --all` returns EMPTY; `npm audit --json` returns `critical:0, high:0`; `git diff --stat` shows lockfile churn is deletion-only (-223 lines).

### Task 11: Run PR2 6-step local verification gate

- **Type**: verify | **Pre-reqs**: Task 10
- **Inputs**: installed deps from Task 10; reference baseline (DEBT-10 844P/21F/9S on main; PR1 didn't touch any test surface)
- **Steps**: execute gate steps 1-6 in order per the per-PR 6-step table above. **Stop on first failure.** Record each result in `apply-progress.md` (gate log table).
- **Stop conditions**:
  - Step 2 (`npm audit`) → `@react-email/preview-server` OR nested-`next` still shows high finding: STOP (unexpected after removal; investigate lockfile regeneration).
  - Step 3 (vitest) regression vs main baseline: STOP, investigate (no Email sources changed, so unlikely).
  - Step 4 (`next build`) broken: revert Task 9; defer to `fix-security-baseline-c`.
  - Step 6 (`git diff`) shows files outside `package.json` + `package-lock.json` + `apply-progress.md`: STOP, investigate.
- **Output**: `apply-progress.md` gate log table populated with PR2 6-step results (all PASS required)
- **Verification**: every gate step row in `apply-progress.md` says PASS; `npm audit --json` returns 0 high findings on `main` + this worktree.

### Task 12: Structural verification — `npm ls @react-email/preview-server --all` returns empty

- **Type**: structural-verify | **Pre-reqs**: Task 11 PASS
- **Inputs**: deps installed from Task 10; PR2 worktree
- **Steps**:
  1. `npm ls @react-email/preview-server --all` — confirm the command returns empty stdout (no match).
  2. `find node_modules/@react-email -maxdepth 2 -type d 2>&1` — confirm no `@react-email/preview-server` directory.
  3. `grep -rn "@react-email/preview-server" src/ .github/ 2>&1` — confirm no source code references.
  4. Record result in `apply-progress.md` structural verification log.
- **Note**: NO email template render smoke (the email preview workflow is OUT of scope per locked decision #3 and the missing `npm run email:dev` script). The preserver server is gone, so the runtime equality guard can't fire.
- **Output**: `apply-progress.md` structural verification log populated (PASS required)
- **Verification**: `npm ls @react-email/preview-server --all` empty; `find node_modules/@react-email` shows NO `preview-server` subdir; no source code references.

### Task 13: Commit + open PR2 + wait for remote CI

- **Type**: deliver | **Pre-reqs**: Task 12 PASS
- **Inputs**: clean working tree with manifest + lockfile edits + apply-progress.md updates
- **Steps**:
  1. Per `work-unit-commits`: split into 2 commits per DEBT-10 apply-progress precedent:
     - Commit A: `docs(sdd): add fix-security-baseline-b artifact for PR2 (React Email removal scope)` — `apply-progress.md` only (PR2-specific gate + structural verification log). PR1's docs commit already shipped; only PR2's incremental apply-progress update is needed.
     - Commit B: `chore(deps): remove @react-email/preview-server (DEBT-10b PR2)` — manifest + lockfile only (~-223 lines, deletion-only).
  2. `git push -u origin frontend/debt-10b-fix-security-baseline-pr2-react-email`.
  3. Use `branch-pr` skill: `gh pr create --base main --head frontend/debt-10b-fix-security-baseline-pr2-react-email --title "chore(deps): remove @react-email/preview-server (DEBT-10b PR2)" --body-file openspec/changes/fix-security-baseline-b/pr-body-pr2.md`; add `type:chore` label.
  4. Wait for `.github/workflows/security.yml` Trivy + `.github/workflows/ci.yml` green. **Do NOT auto-merge.**
- **Output**: PR2 opened with label `type:chore`; both commits on the remote branch
- **Verification**: `gh pr checks` returns all green; Trivy green (no new prod-dep cascade); `git log origin/frontend/debt-10b-fix-security-baseline-pr2-react-email --oneline` shows the 2 commits.

### Task 14: Merge PR2 + post-merge audit + sdd-verify + sdd-archive

- **Type**: deliver | **Pre-reqs**: Task 13 CI green + human review approval
- **Inputs**: PR2 in `gh` with all checks green + reviewer approval
- **Steps**:
  1. `gh pr merge --squash --delete-branch` (per DEBT-10 precedent).
  2. In main repo: `git fetch origin main && git pull --ff-only`.
  3. `git worktree remove ../e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr2-react-email`.
  4. **Post-merge audit verification**: `npm audit --json | jq '.metadata.vulnerabilities'` MUST return `critical:0, high:0` (success criterion: 0 npm audit findings). Record in `apply-progress.md`.
  5. Hand off to `sdd-verify`: assert per-design acceptance gate (8 Requirements across both PRs verified).
  6. Hand off to `sdd-archive`: sync canonical `openspec/specs/security-baseline/spec.md`:
     - Replace Purpose text: "five in-scope packages" → "any in-scope package" (per delta's `## MODIFIED Purpose` marker).
     - Leave 6 existing DEBT-10 Requirements **untouched**.
     - Append 2 new Requirements from the delta spec (`Storybook family baseline (9.1.20)`, `React Email preview-server absence`).
     - Final canonical state: 1 Purpose + 8 Requirements.
- **Output**: both PRs merged to `main`; `npm audit` returns 0 findings; canonical `security-baseline/spec.md` updated to 8 Requirements; change archived.
- **Verification**: `git log main --oneline -5` shows both squash merge commits; `npm audit --json` confirms 0 high/critical findings; canonical spec file matches archive-report assertions.

## Dependency graph

```
Task 1 (worktree PR1) ✅
  -> Task 2 (package.json PR1 edits) ✅
    -> Task 3 (npm install + spec-correction doc + family alignment verify) ✅
      -> Task 4 (PR1 6-step gate) ✅
        -> Task 5 (storybook build smoke) ✅
          -> Task 6 (commit + PR1 + CI wait) ✅
            -> Task 7 (merge PR1 + handoff) ✅
              -> Task 8 (worktree PR2 from fresh main, NOT PR1 branch) ⬜
                -> Task 9 (package.json PR2 — REMOVE @react-email/preview-server) ⬜
                  -> Task 10 (npm install + structural verification + nested-next absent) ⬜
                    -> Task 11 (PR2 6-step gate) ⬜
                      -> Task 12 (structural verify: npm ls empty + no source refs) ⬜
                        -> Task 13 (commit + PR2 + CI wait) ⬜
                          -> Task 14 (merge PR2 + post-merge audit + verify + archive) ⬜
```

PR2 explicitly depends on PR1 being merged to `main` (so the post-PR1 state is the PR2 baseline), but PR2 is NOT stacked on the PR1 branch — both branches diverge from `main`.

## TDD evidence (manifest-only change, regression gate only)

Per orchestrator directive precedent (DEBT-10 apply-progress §TDD evidence): no new test code is being written. The existing test suite IS the contract. `strict_tdd=true` in `openspec/config.yaml` applies to behavioral changes; this change is pure dependency-version-floor hardening.

| Task | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|------------|-----|-------|-------------|----------|
| 1 | N/A (worktree-only) | ➖ N/A | ➖ N/A | ➖ N/A | ➖ N/A |
| 2 | ➖ No source change | ➖ No new behavior | ✅ 7 Storybook lines in `9.1.x` SemVer-safe | ➖ N/A | ➖ N/A |
| 3 | ➖ No source change | ➖ No new behavior | ✅ `npm install` exit 0; transitive 9.1.20 alignment verified | ➖ N/A | ➖ N/A |
| 4 (PR1 regression gate) | ✅ 844P/21F/9S env-only on main | ➖ No new test written | ✅ Full vitest + build + lint match main baseline | ➖ N/A | ➖ N/A |
| 5 (PR1 smoke) | ✅ storybook builds | ➖ N/A | ✅ static Storybook artifact generated | ➖ N/A | ➖ N/A |
| 6 (PR1 CI gate) | ➖ | ➖ | ✅ All GH Actions checks green (Trivy cascade cleared) | ➖ | ➖ |
| 7 (PR1 merge) | ➖ | ➖ | ➖ | ➖ | ➖ |
| 8 | N/A (worktree-only) | ➖ N/A | ➖ N/A | ➖ N/A | ➖ N/A |
| 9 | ➖ No source change | ➖ No new behavior | ✅ Removed `@react-email/preview-server` line | ➖ N/A | ➖ N/A |
| 10 | ➖ No source change | ➖ No new behavior | ✅ `npm install` exit 0; package absent; nested `next` chain gone; `npm audit` 0 findings | ➖ N/A | ➖ N/A |
| 11 (PR2 regression gate) | ✅ 844P/21F/9S env-only on main+PR1 | ➖ No new test written | ✅ Full vitest + build + lint match main baseline | ➖ N/A | ➖ N/A |
| 12 (PR2 structural verify) | ✅ npm ls empty | ➖ N/A | ✅ Package absent + no source references | ➖ N/A | ➖ N/A |
| 13 (PR2 CI gate) | ➖ | ➖ | ✅ All GH Actions checks green (Trivy cascade cleared; deletion-only diff) | ➖ | ➖ |
| 14 | (final verify + archive) | ➖ | ✅ `npm audit` returns 0 findings; canonical spec archived | ➖ | ➖ |

## Branch & PR reference

| PR | Branch (per `AGENT.md` `frontend/{TICKET-ID}-{description-slug}`) | Worktree path | PR title | Label |
|---|---|---|---|---|
| PR1 ✅ | `frontend/debt-10b-fix-security-baseline-pr1-storybook` (merged + deleted) | `<repo-parent>/e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr1-storybook/` (removed) | `chore(deps): bump Storybook family 9.0.16 → 9.1.20 (DEBT-10b PR1)` | `type:chore` |
| PR2 | `frontend/debt-10b-fix-security-baseline-pr2-react-email` | `<repo-parent>/e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr2-react-email/` | `chore(deps): remove @react-email/preview-server (DEBT-10b PR2)` | `type:chore` |

Both PRs target fresh `main` (Stacked-PRs to main per design §Decision: Split delivery). GH013: branch + PR only, no direct push to `main`. Both PRs merge via `--squash --delete-branch` per DEBT-10 precedent.

## References

- Proposal: `openspec/changes/fix-security-baseline-b/proposal.md`, Engram #1432
- Spec (delta): `openspec/changes/fix-security-baseline-b/specs/security-baseline/spec.md`, Engram #1434
- Spec (change-level): `openspec/changes/fix-security-baseline-b/spec.md`
- Exploration: `openspec/changes/fix-security-baseline-b/exploration.md`, Engram #1428
- Design: `openspec/changes/fix-security-baseline-b/design.md`, Engram #1437
- Locked decisions: Engram #1431 (4 user-locked pre-propose decisions)
- Spec correction gotcha (PR1): Engram #1436 (7 direct, not 8; `@storybook/react-vite` is transitive)
- Apply PR1 PR #86 outcome: Engram #1441 (merged at `7d0ce94`)
- **Strategy revision (PR2)**: Engram #1447 — downgrade to `^4.3.2` was a regression; new strategy is REMOVE `@react-email/preview-server`
- Apply PR2 failure analysis: Engram #1445 (cascade contingency triggered)
- Precedent DEBT-10 design: `openspec/changes/archive/2026-07-30-fix-security-baseline/design.md`
- Precedent DEBT-10 tasks: `openspec/changes/archive/2026-07-30-fix-security-baseline/tasks.md`
- Precedent DEBT-10 apply-progress: `openspec/changes/archive/2026-07-30-fix-security-baseline/apply-progress.md`
- Trivy cascade: Engram #1400; precedent: PR #84 9/9 CI green including Trivy in 18s
- Workflow gate: `.github/workflows/security.yml` (Trivy `severity: HIGH,CRITICAL`, `exit-code: "1"`)
- Project context: Engram #2 (Next.js 15 App Router + React 19, strict TDD with `--maxWorkers=2` mandatory)
- Worktree convention: Engram #1398 (`<repo-parent>/<repo>-worktrees/<branch-slug>/`)
- Email workflow debt (out of scope): Engram #1426 (`npm run email:dev` missing, templates in `src/emails/`)
- Skills: `work-unit-commits`, `chained-pr`, `branch-pr`, `sdd-apply`, `sdd-verify`, `sdd-archive`