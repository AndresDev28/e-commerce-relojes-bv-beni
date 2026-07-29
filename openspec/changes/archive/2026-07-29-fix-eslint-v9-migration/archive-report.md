# Archive Report — fix-eslint-v9-migration

## Summary

The `fix-eslint-v9-migration` SDD change is closed and archived as of
2026-07-29. The change migrated the project's ESLint configuration from
the deprecated `.eslintrc.js` + `.eslintignore` (next-lint shim) format to
ESLint v9's native flat-config format (`eslint.config.mjs`), bridged to
`next/core-web-vitals` via `FlatCompat` from `@eslint/eslintrc`. A
follow-up commit tightened `react-hooks/exhaustive-deps` from `warn` to
`error` to close the silent-leak pattern that allowed the Slice B
dead-`useState` bug to ship. PR #82 was merged into `main` at
`d1387692786d5fdd51f8c6c60f13bba6e3671d6c` on 2026-07-29 with 3 commits
and 0 review blockers; `sdd-verify` returned 9/9 REQs OK.

## Artifacts Archived

| Artifact        | Original Location                                                          | Archive Location                                                                                  |
|-----------------|----------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| proposal.md     | `openspec/changes/fix-eslint-v9-migration/proposal.md`                     | `openspec/changes/archive/2026-07-29-fix-eslint-v9-migration/proposal.md`                        |
| spec.md         | `openspec/changes/fix-eslint-v9-migration/spec.md`                         | `openspec/changes/archive/2026-07-29-fix-eslint-v9-migration/spec.md`                            |
| design.md       | `openspec/changes/fix-eslint-v9-migration/design.md`                       | `openspec/changes/archive/2026-07-29-fix-eslint-v9-migration/design.md`                          |
| tasks.md        | `openspec/changes/fix-eslint-v9-migration/tasks.md`                        | `openspec/changes/archive/2026-07-29-fix-eslint-v9-migration/tasks.md`                           |
| verify-report.md| `openspec/changes/fix-eslint-v9-migration/verify-report.md` (git-tracked)  | `openspec/changes/archive/2026-07-29-fix-eslint-v9-migration/verify-report.md` (git-renamed)     |

`verify-report.md` was tracked in git history (added by commit `73e1e19`
on the feature branch); the other four planning artifacts lived on disk
during the SDD cycle and were never committed in isolation — they are
captured here as part of the archive commit so the historical record is
complete. `git mv` was used for `verify-report.md` to preserve its
rename history; the other four are first-time adds inside the archive
folder.

## Sync Status

**No-op: canonical was created fresh during `sdd-spec` (the `lint-config-flat`
domain did not exist prior to this change).**

The canonical at `openspec/specs/lint-config-flat/spec.md` is committed in
this same archive commit so that future SDD cycles have a stable source
of truth.

**Drift noted, not reconciled (intentional):** The delta spec uses the
scenario wording from the original proposal, while the canonical was
polished during `sdd-spec` for tighter assertions (e.g. `stderr includes`
on REQ-LCF-3/4, "AND `@eslint/eslintrc` stays in `devDependencies`" on
REQ-LCF-8, scenario clarifications on REQ-LCF-6/9). The canonical —
which stays in `openspec/specs/` — is the source of truth, and the delta
in this archive folder is preserved as the historical proposal. Drift is
intentional: the canonical was refined at spec time, not retroactively
rewritten. The canonical also lacks the delta-only sections
("Non-functional Properties", "Out of Scope", "Dependencies",
"Verification Hooks"); these sections describe change context rather
than normative requirements and appropriately belong with the
historical proposal.

## Final State

- **Branch:** `frontend/fix-eslint-v9-migration` (merged, eligible for
  local + remote deletion; not deleted per archive policy).
- **Merge commit:** `d1387692786d5fdd51f8c6c60f13bba6e3671d6c`
  ("Merge pull request #82 from AndresDev28/frontend/fix-eslint-v9-migration")
- **PR:** [#82](https://github.com/AndresDev28/e-commerce-relojes-bv-beni/pull/82)
- **PR commits (3):**
  1. `a9cfe75ce378acb7da694de48ee57cbdb07345cd` —
     `chore(lint): migrate to ESLint v9 flat config via FlatCompat`
  2. `406f772abe9577326b1d8b6c9a5d86e89b80304d` —
     `chore(lint): tighten react-hooks/exhaustive-deps to error`
  3. `73e1e1915f657d7204e0d2602bb0181fe53adc92` —
     `docs(verify): update verify-report for REQ-LCF-4 tightening`
- **Worktree (preserved per archive policy):**
  `/home/adreidev/dev/personal-projects/e-commerce-relojes-bv-beni-worktrees/fix-eslint-v9-migration`
- **Net diff on merge:** +323 / -52 across 5 files
  (`eslint.config.mjs` added, `.eslintrc.js` + `.eslintignore` removed,
  `package.json` `lint` script updated, verify-report added).
- **Key results:**
  - Lint gate is now real: `npm run lint` exits non-zero on dead
    `useState` and on missing `useEffect` deps (REQ-LCF-3, REQ-LCF-4).
  - 9/9 REQs OK on `sdd-verify`; REQ-LCF-4 WARNING was resolved by
    `406f772` tightening the rule to `error`.
  - Slice B regression gates all pass on the merged result: lint clean,
    `tsc --noEmit` clean, vitest 845/845 green.
- **Canonical spec committed:** `openspec/specs/lint-config-flat/spec.md`
  (first-time add inside this archive commit).

## Lessons / Discoveries

- **SDD planning artifacts often live on disk only.** `proposal.md`,
  `spec.md`, `design.md`, and `tasks.md` for this change were never
  committed in isolation — `verify-report.md` was the only artifact in
  the change folder with its own commit history. The archive commit
  captures all five together. Future `sdd-propose`/`-spec`/`-design`/`-tasks`
  runs should expect this pattern: planning artifacts are committed
  alongside archive-report.md at archive time, not at proposal/spec/design/tasks
  time. (Compare to `2026-07-26-slice-b-debt-05-conductual` archive,
  where the same pattern applied.)
- **Canonical spec can be authored at sdd-spec time.** Because the
  `lint-config-flat` domain was new, the canonical was created fresh in
  `openspec/specs/lint-config-flat/spec.md` during `sdd-spec` rather
  than generated from a delta merge during archive. Drift between the
  delta and canonical wording is intentional refinement at spec time.
- **`next lint` is a deprecated shim.** Replacing it with `eslint .`
  directly unblocks ESLint v9 adoption and removes a coupling that
  Next.js 16 plans to drop. The `FlatCompat` bridge is only required
  because `eslint-config-next@15.3.5` ships CJS-only. (Engram `#1403`.)
- **Lint severity inherits silently.** `next/core-web-vitals` sets
  `react-hooks/exhaustive-deps` to `warn` by default, which let dead
  state from Slice B escape CI. The fix is rule-level
  (`error` override in the flat config), not source-level — the
  codebase was already compliant, only the rule was permissive.
  (Engram `#1411`.)
- **`git mv` only works on tracked files.** For untracked planning
  artifacts, plain `mv` + `git add` is the correct equivalent. The
  archive commit captures first-time adds inside the archive folder.

## Follow-ups (Optional)

- **Orphan housekeeping:** `openspec/changes/debt-05-arch-cleanup/` is
  present on disk (untracked) and was noted during archive. It is
  roadmap item #4 (DEBT-05 architecture cleanup) and is **out of scope
  for this archive** — it should be handled as its own SDD change. Not
  touched here.
- **`FlatCompat` long-term:** When `eslint-config-next` ships a native
  ESM `exports` field (likely Next.js 16+), the `FlatCompat` bridge can
  be removed. Track upstream release notes; not a near-term blocker.
- **Worktree + branch cleanup:** Local worktree at
  `.../e-commerce-relojes-bv-beni-worktrees/fix-eslint-v9-migration`
  and the `frontend/fix-eslint-v9-migration` branch (local + remote)
  are eligible for deletion now that the change is merged + archived.
  Not deleted per archive policy; user decides.