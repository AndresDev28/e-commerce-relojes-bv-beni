# Proposal: fix-security-baseline-b (DEBT-10b)

## Intent

Close the 3 residual post-DEBT-10 npm audit findings (roadmap #1b). DEBT-10 reduced 8 → 3 findings; this slice closes the `storybook` advisory (PR1) and removes the `@react-email/preview-server` + nested `next@16.2.3` chain (PR2). Target: 0 `npm audit` findings, green Trivy, vitest trio green, no source changes.

**Strategy revision (2026-08-02, post-apply-failure — Engram #1447)**: The original plan was to downgrade `react-email` + `@react-email/preview-server` to `^4.3.2`. The apply phase demonstrated that the downgrade is a regression (audit DB drifted; the new advisory covers `4.2.1 - 5.0.0-canary.12`, and the 4.3.2 transitive `next@15.5.2` has a separate CRITICAL advisory). The new strategy is to REMOVE `@react-email/preview-server` from `devDependencies` — it's dead code (per Engram #1426: the `npm run email:dev` script that would invoke it is not declared in `package.json`). The `react-email` CLI is kept installed for future workflow repair.

## Scope

### In Scope
- Storybook family `9.0.16` → `9.1.20` (7 direct devDeps; 3 transitive via `@storybook/nextjs-vite` follow automatically).
- REMOVE `@react-email/preview-server` from `devDependencies` in `package.json` (line 42).
- Regenerate `package-lock.json`. Preserve alphabetized `overrides` block (8 entries unchanged).

### Out of Scope
- Missing `email:dev` script and `src/emails/` vs `./emails/` mismatch (pre-existing workflow debt).
- `react-email` CLI (line 31) — kept at `^5.1.0` for future workflow repair.
- Top-level `next@15.5.21` (not the vulnerable node).
- Source, test, vitest config, or workflow edits.

## Capabilities

### Modified Capabilities
- `security-baseline`: generalize the purpose text from "five in-scope packages" to the full in-scope set; add 2 NEW Requirements (one for the `storybook` 9.1.20 baseline, one for the React Email preview-server absence — package removed from manifest to eliminate both the direct and transitive `next` audit keys). The 6 existing Requirements stay unchanged.

### New Capabilities
- None.

## Approach

Two independent chained PRs from fresh `main` (disjoint dependency families, not stacked):

**PR1** — branch `frontend/debt-10b-fix-security-baseline-pr1-storybook`: bump aligned Storybook family to `9.1.20`. Verify: `npx vitest run --maxWorkers=2`, `npx storybook build` smoke, `npm audit` (`storybook` finding gone), remote Trivy.

**PR2** — branch `frontend/debt-10b-fix-security-baseline-pr2-react-email`: REMOVE `@react-email/preview-server` from `devDependencies`. Verify: `npm ls @react-email/preview-server --all` returns empty (package absent), `npm audit` (both `@react-email/preview-server` + nested `next` findings gone), `npx vitest run --maxWorkers=2`, `npx next build`, remote Trivy. No smoke test of email templates needed (workflow is out of scope per locked decision).

Both PRs reuse the DEBT-10 6-step local gate (install → audit → vitest → build → lint → diff-scope) plus per-PR smoke. Trivy gate is blocking per PR. GH013: every commit goes through branch + PR; no direct push to `main`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | 7 Storybook family bumps (PR1); `@react-email/preview-server` line removed (PR2) |
| `package-lock.json` | Modified | Regenerated once per PR; PR2 is mostly deletions (-223 lines) |
| `openspec/specs/security-baseline/spec.md` | Modified | Purpose generalization + 2 ADDED Requirements |
| `openspec/changes/fix-security-baseline-b/{proposal,tasks,design,specs,apply-progress,verify-report,archive-report}.md` | New/Updated | Standard SDD phase artifacts |
| `.github/workflows/security.yml` | Read-only | Validates blocking Trivy gate; no edits |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Re-introducing `@react-email/preview-server` in a future PR without proper scoping | Low | Spec requirement: re-introduction requires a separately-scoped change |
| Storybook addon family version-pin conflicts | Low | Family-aligned bump + `storybook build` smoke |
| Lockfile churn >400 lines per PR | Low | PR2 is deletion-only (-223 lines); PR1 forecast ≤350 lines |
| Trivy dev-dep cascade | Low | Validate per PR (Engram #1400 precedent) |
| Email workflow stays broken (no `npm run email:dev`) | Pre-existing | Out of scope per locked decision #3; tracked separately |

## Rollback Plan

- PR1: `git revert <merge-commit>` → Storybook returns to `9.0.16`; audit `storybook` finding reappears.
- PR2: `git revert <merge-commit>` → `@react-email/preview-server` returns to `devDependencies`; both `@react-email/preview-server` + nested-`next` findings reappear.

## Dependencies

- None external.

## Success Criteria

- [ ] `npm audit` returns 0 findings.
- [ ] 2/2 PRs merged to `main`; both pass remote Trivy gate.
- [ ] Canonical `security-baseline/spec.md` contains 8 Requirements (6 existing + 2 new).
- [ ] `npx vitest run --maxWorkers=2` green on both PRs.
- [ ] `npx storybook build` smoke green on PR1.
- [ ] `npm ls @react-email/preview-server` returns empty on PR2.
- [ ] `overrides` block unchanged (alphabetical, 8 entries).