# Archive Report: fix-security-baseline

## Change

- **Name**: `fix-security-baseline` (DEBT-10, roadmap item #1)
- **Status**: ARCHIVED
- **Merged via**: PR #84 (commit `faddb59`)
- **Archived on**: 2026-07-30
- **Roadmap context**: Engram #1402 (`roadmap/next-sessions-priority`)

## Summary

Closed the devDep security baseline by bumping 5 auto-fixable packages (vitest trio direct bumps + js-yaml + @babel/core overrides). Single PR, manifest-only diff, 339 lines. `npm audit` from 8 → 3 findings (3 high OOS deferred to `fix-security-baseline-b`).

## Phases

| Phase | Artifact | Engram ID |
|---|---|---|
| Explore | `exploration.md` | #1415 |
| Propose | `proposal.md` | #1416 |
| Spec | `specs/security-baseline/spec.md` | #1417 |
| Tasks | `tasks.md` | #1420 |
| Design | `design.md` | #1419 |
| Apply | `apply-progress.md` | #1421 |
| Verify | `verify-report.md` | #1423 |
| Archive | `archive-report.md` | (this file) |

## Capability added

- `security-baseline` — synced to `openspec/specs/security-baseline/spec.md`
  - Canonical header `# Capability: security-baseline` rewritten as `# Security Baseline` to match sibling canonicals (e.g., `github-actions-security`, `catalog-load-more`).
  - Delta heading `## ADDED Requirements` rewritten as `## Requirements` per canonical format.
  - All 6 requirements and their scenarios preserved verbatim.

## Verification summary

- 5/6 spec requirements PASS
- 0 CRITICAL findings
- 1 WARNING (non-blocking): PR #84 included 7 openspec/ docs alongside 2 manifest files. Spec scenario forbidden-list does NOT include openspec/, so non-blocking by design.
- 3 SUGGESTIONS:
  - S-1: align design criteria with spec forbidden-lists
  - S-2: CI check for openspec/ scope drift
  - S-3: 3 OOS findings → `fix-security-baseline-b`

## Final state

- **Branch**: `frontend/debt-10-fix-security-baseline` (merged, eligible for local + remote deletion; not deleted per archive policy).
- **Merge commit**: `faddb59fd33fb76ec520eeb9c5582396a098f6c6` ("chore(deps): fix security baseline (DEBT-10) (#84)")
- **PR**: [#84](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/pull/84)
- **PR commits (3)**:
  1. `617d8fe` — `docs(sdd): add fix-security-baseline change artifacts (DEBT-10)`
  2. `0cd0b30` — `chore(deps): fix security baseline (vitest trio + js-yaml + @babel/core overrides)`
  3. `982adf5` — `docs(apply): finalize fix-security-baseline apply-progress (all 6 gates + 9 CI checks PASS)`
- **Worktree (preserved per archive policy)**: `/home/adreidev/dev/personal-projects/e-commerce-relojes-bv-beni-worktrees/debt-10-fix-security-baseline`
- **Net diff on merge**: 8 files (2 manifest + 7 SDD docs, 339 lines in manifest+lockfile)
- **Key results**:
  - `npm audit` from 8 → 3 findings (3 high OOS deferred to `fix-security-baseline-b`)
  - Trivy gate stays green on merged main (16s on PR #84; pattern from Engram #1400 holds)
  - vitest 844/865 baseline matches main (21 env-only failures pre-existing — jsdom `localStorage.clear` + Strapi offline)
  - `next build` clean (28 routes); `npm run lint` clean
  - Alphabetical override order preserved (`@babel/core` < `brace-expansion` < `esbuild` < `fast-uri` < `js-yaml` < `postcss` < `sharp` < `ws`)
- **Canonical spec committed**: `openspec/specs/security-baseline/spec.md` (first-time add inside this archive commit)

## Sync status

No-op: canonical was created fresh during this archive commit. The `security-baseline` domain did not exist prior to this change.

Drift between delta and canonical is intentional refinement at archive time:
- Header style: `# Capability: security-baseline` → `# Security Baseline` (matches sibling canonicals)
- Section marker: `## ADDED Requirements` → `## Requirements` (canonical format)
- No semantic changes; all 6 requirements + scenarios preserved verbatim.

## Lessons / Discoveries

- **SDD artifacts must ship in the implementation PR.** Per Engram #1421: "SDD artifacts existed in main only as untracked files — copying into worktree BEFORE commit was mandatory; otherwise the merge would silently drop the SDD traceability layer." This is why PR #84 carried 7 openspec/ docs alongside 2 manifest files — the manifest-only requirement (Req 5) explicitly permits openspec/ in its forbidden-list enumeration but does NOT exclude it; the deviation is documented in verify-report.md as WARNING W-1.
- **Trivy devDep filter still holds.** Engram #1400 predicted zero/minimal Trivy delta for devDep-only changes. Confirmed: Trivy passed in 16s on PR #84 with no security deltas. Pattern remains authoritative.
- **`cp -r` from main after local writes can silently overwrite.** Engram #1421 caught a `cp -r` that accidentally reset apply-progress.md back to placeholder state. Fix: always `git show HEAD:<path>` to verify before commit; if caught post-commit, fix in a new commit (amend-after-push blocked by AGENTS.md).
- **Spec format differs by file location.** Delta specs under `openspec/changes/<change>/specs/<domain>/spec.md` use `## ADDED Requirements` to mark the section as new. Canonical specs under `openspec/specs/<domain>/spec.md` use plain `## Requirements`. Conversion at archive time is mechanical but mandatory.
- **3 OOS findings form a natural follow-up change.** Storybook 9.0.16 → 9.1.20 (minor, low risk) + `@react-email/preview-server` major bump + cascading `next` high. Tracked as future `fix-security-baseline-b` change.

## Follow-ups (Optional)

- **`fix-security-baseline-b` (NOT scheduled)**: address 3 OOS findings — Storybook 9.0.16 → 9.1.20 minor bump, `@react-email/preview-server` 5.x → 4.3.2 major bump, cascading `next` high. Lower priority than roadmap #3.
- **Worktree + branch cleanup (roadmap #3)**: 1 stale worktree (`fix-eslint-v9-migration/`) + 6 remaining local branches eligible for cleanup. Ready to start after this archive.
- **Spec hygiene (S-1)**: future security-baseline specs could tighten the forbidden-list to explicitly include `openspec/changes/{change-name}/` OR carve out an explicit SDD-traceability exception. Document, do not amend this canonical.
- **CI check (S-2)**: optional check that fails the build if PR diff under `openspec/changes/<name>/` references files outside the SDD artifact set. Out of scope here; flag for a separate SDD change.

## References

- Apply log: `openspec/changes/archive/2026-07-30-fix-security-baseline/apply-progress.md`, Engram #1421
- Verify report: `openspec/changes/archive/2026-07-30-fix-security-baseline/verify-report.md`, Engram #1423
- Spec (delta): `openspec/changes/archive/2026-07-30-fix-security-baseline/specs/security-baseline/spec.md`, Engram #1417
- Spec (canonical): `openspec/specs/security-baseline/spec.md` (this archive commit)
- Design: `openspec/changes/archive/2026-07-30-fix-security-baseline/design.md`, Engram #1419
- Tasks: `openspec/changes/archive/2026-07-30-fix-security-baseline/tasks.md`, Engram #1420
- Proposal: `openspec/changes/archive/2026-07-30-fix-security-baseline/proposal.md`, Engram #1416
- Exploration: `openspec/changes/archive/2026-07-30-fix-security-baseline/exploration.md`, Engram #1415
- PR body: `openspec/changes/archive/2026-07-30-fix-security-baseline/pr-body.md`
- PR #84: https://github.com/AndresDev28/e-commerce-relojes-bv-beni/pull/84
- Roadmap: Engram #1402 (`roadmap/next-sessions-priority`)
- Trivy cascade: Engram #1400
- Project context: Engram #2