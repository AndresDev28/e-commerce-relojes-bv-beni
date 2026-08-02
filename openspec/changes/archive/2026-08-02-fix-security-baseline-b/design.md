# Design: fix-security-baseline-b (DEBT-10b)

## Context

Manifest-only closure of the 3 residual post-DEBT-10 npm audit findings (`storybook` advisory + `@react-email/preview-server` + nested-`next@16.2.3` chain). Two independent chained PRs from fresh `main` (disjoint dep families, not stacked). Lockfile churn forecast ≤350 lines/PR (under 400-line review budget). No source, test, vitest config, or workflow edits. Citations: proposal Engram #1432, spec Engram #1434, exploration Engram #1428, locked decisions Engram #1431, Trivy cascade Engram #1400, DEBT-10 precedent design (archive/2026-07-30-fix-security-baseline/design.md), DEBT-10 apply-progress.md.

**Strategy revision (2026-08-02, post-apply-failure — Engram #1447)**: The original plan was to downgrade `react-email` + `@react-email/preview-server` to `^4.3.2`. The apply phase demonstrated that the downgrade is a regression (audit DB drifted between explore and apply; the new advisory covers `4.2.1 - 5.0.0-canary.12`, and the 4.3.2 transitive `next@15.5.2` has a separate CRITICAL advisory). The new strategy is to REMOVE `@react-email/preview-server` from `devDependencies` — it's dead code (per Engram #1426: the `npm run email:dev` script that would invoke it is not declared in `package.json`). The `react-email` CLI remains installed for future workflow repair. PR2's diff is now deletion-only (forecast ~-223 lines, lockfile shrinks).

## Architecture Decisions

### Decision: Split delivery into 2 chained PRs (not stacked)

| Option | Tradeoff | Decision |
|---|---|---|
| Single PR | Couples low-risk Storybook minor to higher-risk React Email removal; one rollback boundary; one CI cycle | Reject — disjoint families can land independently |
| 2 chained PRs from fresh `main` (Stacked-PRs) | Disjoint families, independent reviews + rollbacks, per-PR Trivy gate, PR1 ~+375 lines, PR2 ~-223 lines | **Adopt** — matches locked decision #1431 and DEBT-10 precedent |
| 2 chained stacked-to-feature branch (Feature Branch Chain) | Sequential merge into tracker; holds both off main until #2 lands | Reject — disjoint families can land independently; tracker adds ceremony without benefit |

### Decision: REMOVE `@react-email/preview-server` (not downgrade, not upgrade, not override)

| Option | Tradeoff | Decision |
|---|---|---|
| Downgrade to `^4.3.2` | Audit-evidenced as a regression (new advisory covers `4.2.1 - 5.0.0-canary.12`; transitive `next@15.5.2` has its own CRITICAL advisory) | Reject — proven by apply-failure Engram #1447 |
| Override `next` to `^15.5.21` | Surgical fix for transitive `next@16.2.3`; npm refuses due to `preview-server@5.2.11` exact-pin on `next@16.2.3` | Reject — package version constraint conflict |
| Pin `@react-email/preview-server` to `4.2.0` (deprecated) | Avoids the populated advisory range; pulls `next@^15.3.2` flexible | Reject — deprecated package, also re-introduces CRITICAL next advisory |
| REMOVE `@react-email/preview-server` from `devDependencies` | Package is dead code (no `email:dev` script); removes direct and transitive findings; lockfile shrinks by ~223 lines; no source code touches | **Adopt** — align with locked decision #3 (email workflow OUT of scope) |

### Decision: Storybook family = aligned `9.1.20` bump (not per-package pin)

| Option | Tradeoff | Decision |
|---|---|---|
| Bump `storybook` only | Other family members still at 9.0.16 → mixed 9.0/9.1 graph triggers peer-dep warnings at minimum | Reject — `@storybook/nextjs-vite@9.0.16` enforces exact peer pin on its 9.0.16 siblings |
| Align ALL direct Storybook family to `^9.1.20` | Family-wide consistent graph; `npx storybook build` smoke confirms; low source-level risk (stories import only from `@storybook/react` transitive or `@storybook/nextjs-vite` direct) | **Adopt** — matches spec requirement + locked decision |

### Decision: Per-PR isolated worktrees + non-stacked branches

| Option | Tradeoff | Decision |
|---|---|---|
| Single worktree, sequential branches | Less setup overhead | Reject — `gh` worktree convention (Engram #1398) mandates one-worktree-per-SDD-PR |
| 2 worktrees under `<repo-parent>/<repo>-worktrees/`, each on fresh `main` | Clean isolation; one CodeGraph index per checkout; independent lockfile churn tracking | **Adopt** — project convention |

## Per-PR Plan

### PR1 — Storybook (file changes) — unchanged from PR1-completed state

| File | Lines | Action | Description |
|---|---|---|---|
| `package.json` | +7 / -7 | Modify | Bump each direct Storybook devDep `9.0.16` → `^9.1.20` at lines 43-47, 64, 69 (7 entries; `@storybook/react-vite` is TRANSITIVE — see Spec corrections section) |
| `package-lock.json` | ~160-350 | Modify | `npm install` regenerates: family-wide 9.0.16 → 9.1.20 transitive cascade |
| `overrides` block | 0 | Unchanged | 8 entries, alphabetical order preserved (`@babel/core`, `brace-expansion`, `esbuild`, `fast-uri`, `js-yaml`, `postcss`, `sharp`, `ws`) |

PR1 source surface: `.storybook/{main,preview,vitest.setup}.ts` + 7 stories in `src/**/*.stories.*` are read-only. No edits expected.

### PR2 — React Email preview-server removal (file changes)

| File | Lines | Action | Description |
|---|---|---|---|
| `package.json` (devDependencies) | +0 / -1 | Modify | REMOVE `@react-email/preview-server: ^5.1.0` entry (line 42). `react-email` CLI (line 31, in `dependencies`) is kept at `^5.1.0` for future workflow repair |
| `package-lock.json` | ~223 deletions | Modify | `npm install` regenerates: removes the `node_modules/@react-email/preview-server` subtree (including its nested `next@16.2.3`, `@next/swc-*` native binaries, etc.) — ~223 lines deleted from lockfile |
| `overrides` block | 0 | Unchanged | 8 entries unchanged |
| `src/emails/**` | 0 | Read-only | No source code changes. `OrderStatusEmail.tsx` and `src/emails/components/*` are untouched. `@react-email/components@1.0.2` + `@react-email/render@2.0.0` + `@react-email/preview@0.0.13` (production) remain — only the preview-server is removed |

PR2 has no smoke test (the email preview workflow that would invoke preview-server is OUT of scope per locked decision #3 and the missing `npm run email:dev` script in `package.json` — Engram #1426). The smoke is replaced by structural verification: `npm ls @react-email/preview-server --all` returns empty (package absent).

## 6-Step Local Verification Gate (per PR)

Adapted from DEBT-10 archive/2026-07-30-fix-security-baseline/apply-progress.md. Execute **in order** before commit/push for each PR.

| # | Command | Pass criterion |
|---|---|---|
| 1 | `npm install` (or `npm ci` after first install) | Exit 0; no `EOVERRIDE`; no unresolved peer warnings for the bumped family |
| 2 | `npm audit --json` — inspect `.vulnerabilities` | `critical:0, high:0` for the family's audit keys. PR1: `storybook` empty. PR2: `@react-email/preview-server` AND nested-`next` both empty |
| 3 | `npx vitest run --maxWorkers=2` | Pass/fail/skip counts match `main` baseline (DEBT-10 measured 844P/21F/9S env-only). Any regression → STOP |
| 4 | `npx next build` | Build completes cleanly; 25 static pages route table intact. Catches implicit dep breakage (Storybook family can cascade via `@vitejs/plugin-react`) |
| 5 | `npm run lint` | Exit 0; clean output. Indirectly exercises `js-yaml` via `@eslint/eslintrc` |
| 6 | `git diff --name-only main` | Exactly `package.json` + `package-lock.json` (and optionally `apply-progress.md`). Anything else → flag & re-check |

### Per-PR smoke checks

| PR | Smoke | Pass criterion |
|---|---|---|
| PR1 (Storybook) | `npx storybook build` | Static Storybook built successfully (stories + addons + autodocs + interaction test load; no mixed-9.0/9.1 warnings) |
| PR2 (React Email preview-server removal) | **Structural verification** (no email template smoke — workflow is out of scope per locked decision #3 + Engram #1426) | `npm ls @react-email/preview-server --all` returns empty; `find node_modules/@react-email -maxdepth 2 -type d` shows no `preview-server` subdir; `grep -rn "@react-email/preview-server" src/ .github/` returns 0 hits |

PR2 has no Node smoke script. The structural verification is the canonical smoke for the removal strategy.

## Trivy gate validation

`.github/workflows/security.yml` runs Trivy with `severity: HIGH,CRITICAL`, `exit-code: "1"`. Gate is blocking on CI.

| Check | Expected result | Failure response |
|---|---|---|
| `storybook` finding (PR1 CI run) | Gone (`dev: true`, devDeps filtered per Engram #1400 precedent) | n/a |
| `@react-email/preview-server` (PR2 CI run) | Gone (devDep) | n/a |
| Nested `next` under `@react-email/preview-server` (PR2 CI run) | Gone (lockfile tree drops the nested path) | n/a |
| Production `next@15.5.21` Trivy status | Unchanged clean (out-of-scope vulnerable range) | n/a |
| New prod-dep finding appearing on either PR | **NOT EXPECTED** | STOP. Do not merge. Open follow-up `fix-security-baseline-c` |

Cascade contingency per the precedent: 3 devDep findings eliminated across both PRs. Production Trivy posture unchanged. If either PR reveals a NEW finding outside the in-scope set, see "npm-cascade contingency" below.

## npm-cascade contingency

If `npm audit` reveals additional findings beyond the 3 in scope on either PR:

| Scenario | Response |
|---|---|
| New finding is auto-fixable with the same bump (e.g., a transitive dep that upgrades cleanly) | Stay in this change; absorb the bump into the existing PR; document in apply-progress |
| New finding requires a different fix path (separate dep, override, or source change) | Defer to follow-up change (`fix-security-baseline-c`); abort the current PR's `verify-report` and record the reason |
| New finding cascades into a production dependency (Trivy) | STOP. Do not merge. Open `fix-security-baseline-c` immediately |

## Spec corrections needed at apply time

`npm ls --all` cross-check against `package.json` reveals the spec at `openspec/changes/fix-security-baseline-b/specs/security-baseline/spec.md:19` overstates the direct Storybook family by one. **The spec lists 8 packages as direct, but the manifest only declares 7 direct** (lines 43-47, 64, 69):

| Spec says (line 19) | Actual (`package.json`) | Action at apply time |
|---|---|---|
| `storybook` | Direct (line 69) `9.0.16` | Bump to `^9.1.20` ✓ |
| `@storybook/addon-a11y` | Direct (line 43) `9.0.16` | Bump to `^9.1.20` ✓ |
| `@storybook/addon-docs` | Direct (line 44) `9.0.16` | Bump to `^9.1.20` ✓ |
| `@storybook/addon-onboarding` | Direct (line 45) `9.0.16` | Bump to `^9.1.20` ✓ |
| `@storybook/addon-vitest` | Direct (line 46) `9.0.16` | Bump to `^9.1.20` ✓ |
| `@storybook/nextjs-vite` | Direct (line 47) `9.0.16` | Bump to `^9.1.20` ✓ |
| `@storybook/react-vite` | **TRANSITIVE** — nested only under `@storybook/nextjs-vite` | **Do NOT add to devDependencies.** It follows automatically. Apply step must accept the deviation with rationale ("transitive follows @storybook/nextjs-vite"). Flag in apply-progress.md |
| `eslint-plugin-storybook` | Direct (line 64) `9.0.16` | Bump to `^9.1.20` ✓ |

Also note: `@storybook/react@9.0.16` and `@storybook/builder-vite@9.0.16` are also transitive under `@storybook/nextjs-vite`. They follow on bump but are not in the direct list either.

Source surface confirms: 7 stories import only from `@storybook/react` (transitive) or `@storybook/nextjs-vite` (direct). No story imports `@storybook/react-vite` directly. So no source edits on PR1.

**sdd-apply must surface this spec correction in `apply-progress.md`** as a documented deviation but must NOT modify the spec file (sdd-spec owns that boundary). If a clean traceability record is required, open a tiny follow-up `fix-security-baseline-b-spec-correction` to amend the spec text; otherwise accept-with-rationale is sufficient.

Gotcha persisted as Engram #1436 (topic `sdd/fix-security-baseline-b/design-gotchas`).

## Commit & PR structure

Per `work-unit-commits`: each PR is ONE work unit (manifest + lockfile are interdependent — splitting risks partial lockfile states that don't `npm install` cleanly). Per DEBT-10 apply-progress.md deviation precedent, two commits per PR may be needed:
1. `docs(sdd): add fix-security-baseline-b artifact for <PR-scope>` (SDD traceability files only — 5-7 files, +500-700 lines).
2. `chore(deps): bump <family>` (manifest + lockfile only — ≤350 lines per PR).

Both land via `--squash --delete-branch` merge per DEBT-10 precedent.

| PR | Branch (per `AGENT.md` `frontend/{TICKET-ID}-{description-slug}`) | Worktree path | PR title |
|---|---|---|---|
| PR1 | `frontend/debt-10b-fix-security-baseline-pr1-storybook` | `<repo-parent>/e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr1-storybook/` | `chore(deps): bump Storybook family 9.0.16 → 9.1.20 (DEBT-10b PR1)` |
| PR2 | `frontend/debt-10b-fix-security-baseline-pr2-react-email` | `<repo-parent>/e-commerce-relojes-bv-beni-worktrees/fix-security-baseline-b-pr2-react-email/` | `chore(deps): remove @react-email/preview-server (DEBT-10b PR2)` |

Each PR carries `type:chore` label (manifest-only) per `branch-pr` skill. Base: fresh `main` for both (disjoint dep families, not stacked). GH013: branch + PR only, no direct push to `main`. Each PR ≤350 changed lines (well under 400-line budget).

## spec-archive sync at end

The delta spec uses the documented `## MODIFIED Purpose` marker (custom — OpenSpec markers don't cover Purpose text changes per spec Engram #1434 gotcha). At `sdd-archive` time, the canonical `openspec/specs/security-baseline/spec.md` will be updated as:

| Canonical element | Action |
|---|---|
| Purpose text | Replace "five in-scope packages" → "any in-scope package" (per delta's MODIFIED Purpose) |
| 6 existing Requirements from DEBT-10 | Leave UNTOUCHED |
| 2 new Requirements from delta | APPEND to `## Requirements`: (a) Storybook family baseline (9.1.20), (b) React Email preview-server absence |
| Final canonical state | 1 Purpose + 8 Requirements |

sdd-archive must recognize the `## MODIFIED Purpose` label (no native OpenSpec marker for it) and apply the exact text replacement. See spec-correction section above for the additional spec amendment if sdd-apply proceeds with accept-with-rationale.

## Threat Matrix

N/A — this change is manifest-only (`package.json` + `package-lock.json` regeneration). No routing, shell, subprocess, VCS/PR automation (other than the standard `gh` branch/PR which lives in normal developer workflow, not a tool we're changing), executable-file classification, or process-integration boundary is touched.

## Open Questions

None — all 4 proposal-shaping decisions locked pre-propose (Engram #1431). One in-flight correction (spec's 8-family enumeration → 7-direct + transitive alignment note) is handled by spec-correction section above; does not block design or apply.

## Acceptance gate

`sdd-verify` will assert, in this order, on each PR:

| Source | Verification |
|---|---|
| Spec Requirement: storybook clean (PR1) | `npm audit --json` shows no high finding for `storybook` audit key |
| Spec Requirement: family alignment (PR1) | `npm ls @storybook/react-vite @storybook/react @storybook/builder-vite --all` shows all three at `9.1.20` post-install |
| Spec Requirement: preview-server absent (PR2) | `npm ls @react-email/preview-server --all` returns empty; package absent from `package.json` `dependencies` + `devDependencies` |
| Spec Requirement: nested-next absent (PR2) | `npm ls next --all` shows no `next` resolution under any `@react-email/preview-server` node path; nested `next` chain physically gone |
| Spec Requirement: react-email CLI retained (PR2) | `package.json` line 31 still pins `react-email: ^5.1.0` (CLI kept for future workflow repair) |
| Spec Requirement: re-introduction requires separately-scoped change (PR2) | Commit message or PR body must reference a separate SDD change ID if `@react-email/preview-server` is ever re-added |
| Per-PR local gate (6-step) | All 6 steps PASS for the respective PR |
| Per-PR Trivy gate (remote) | `security.yml` `trivy` job exits 0 on the PR branch |
| Canonical spec post-archive | 8 Requirements (6 + 2 new), Purpose text generalized |

## References

- Proposal: `openspec/changes/fix-security-baseline-b/proposal.md`, Engram #1432.
- Spec: `openspec/changes/fix-security-baseline-b/specs/security-baseline/spec.md`, Engram #1434.
- Exploration: `openspec/changes/fix-security-baseline-b/exploration.md`, Engram #1428.
- Locked decisions: Engram #1431.
- Spec correction gotcha (PR1): Engram #1436.
- Apply PR1 PR #86 outcome: Engram #1441.
- Strategy revision (PR2): Engram #1447.
- Apply PR2 PR #87 outcome: Engram #1449.
- Stale-design cleanup (post-merge): Engram #1450.
- Precedent DEBT-10 design: `openspec/changes/archive/2026-07-30-fix-security-baseline/design.md`.
- Precedent DEBT-10 apply-progress: `openspec/changes/archive/2026-07-30-fix-security-baseline/apply-progress.md`.
- Trivy cascade: Engram #1400; precedent: PR #84 9/9 CI green including Trivy in 18s.
- Workflow gate: `.github/workflows/security.yml` (Trivy `severity: HIGH,CRITICAL`, `exit-code: "1"`).
- Project context: Engram #2 (Next.js 15 App Router + React 19, strict TDD with `--maxWorkers=2` mandatory).
- Worktree convention: Engram #1398 (`<repo-parent>/<repo>-worktrees/<branch-slug>/`).
