# Spec: fix-security-baseline-b (DEBT-10b)

> Change-level spec summary. The full delta lives at `specs/security-baseline/spec.md`.

## What this change does

Extends the `security-baseline` capability to close the 3 residual post-DEBT-10 npm audit findings (`storybook` high + `@react-email/preview-server` + nested `next@16.2.3` chain). Result: 0 npm audit findings, green Trivy, no source changes.

**Strategy revision (2026-08-02, post-apply-failure — Engram #1447)**: The original plan was to downgrade `react-email` + `@react-email/preview-server` to `^4.3.2`. The apply phase demonstrated that the downgrade is a regression (audit DB drifted between explore and apply; the new advisory covers `4.2.1 - 5.0.0-canary.12`, and the 4.3.2 transitive `next@15.5.2` has a separate CRITICAL advisory). The new strategy is to REMOVE `@react-email/preview-server` from `devDependencies` — it's dead code (the `npm run email:dev` script that would invoke it is not declared in `package.json`). The `react-email` CLI remains installed for future workflow repair.

## Capability changes

| Capability | Action | Reason |
|---|---|---|
| `security-baseline` | MODIFIED Purpose + ADDED 2 Requirements | Expand in-scope set beyond the 5 DEBT-10 packages; codify the Storybook 9.1.20 baseline + React Email preview-server absence |

| Capability | Action |
|---|---|
| (none) | REMOVED |
| (none) | RENAMED |

## Relationship to canonical spec

The canonical `openspec/specs/security-baseline/spec.md` (6 Requirements from DEBT-10) is **not modified at spec time**. The archive step (`sdd-archive`) will:

1. Replace the Purpose text with the generalized version (drop "five in-scope packages" → "any in-scope package").
2. Append the 2 new Requirements (`Storybook family baseline (9.1.20)`, `React Email preview-server absence`) to the `## Requirements` section.
3. Leave the 6 DEBT-10 Requirements untouched.

Final canonical state: 1 Purpose + 8 Requirements.

## Delivery strategy

Two independent chained PRs from fresh `main` (disjoint dependency families, not stacked). Each PR reuses the DEBT-10 6-step local gate (install → audit → vitest → build → lint → diff-scope) plus per-PR smoke tests.

| PR | Branch | Family | Change | Smoke check |
|---|---|---|---|---|
| PR1 | `frontend/debt-10b-fix-security-baseline-pr1-storybook` | Storybook (7 direct devDeps) | `9.0.16` → `^9.1.20` | `npx storybook build` |
| PR2 | `frontend/debt-10b-fix-security-baseline-pr2-react-email` | `@react-email/preview-server` (1 devDep) | REMOVE from `devDependencies` | `npm ls` confirms package absent + transitive `next` gone |

PR2 is a deletion-only manifest change (no smoke test of email templates needed — the workflow is out of scope). Trivy gate is remote and blocking per PR. GH013: branch + PR only, no direct push to `main`.

## Out of scope (locked decisions)

- Missing `email:dev` script + `src/emails/` vs `./emails/` mismatch — pre-existing workflow debt, tracked separately. With `@react-email/preview-server` removed, the missing script is no longer blocked by a vulnerable dep.
- `react-email` CLI (line 31) — kept at `^5.1.0` for future workflow repair, not removed.
- Top-level `next@15.5.21` — not the vulnerable node; only the nested `next@16.2.3` under `@react-email/preview-server` is in scope (and will be removed with the parent).
- Source, test, vitest config, or workflow edits.

## Next step

Ready for `sdd-design` (architectural approach + per-PR plan). If design already exists, ready for `sdd-tasks`.
