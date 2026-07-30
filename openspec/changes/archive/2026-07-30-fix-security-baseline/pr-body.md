## Summary

Closes the devDep security baseline identified as roadmap item #1 (DEBT-10).

| Package | Sev | Change |
|---|---|---|
| vitest | critical | ^3.2.4 → ^3.2.7 |
| @vitest/browser | critical | ^3.2.4 → ^3.2.7 |
| @vitest/coverage-v8 | critical | ^3.2.4 → ^3.2.7 |
| js-yaml | high | override ^4.3.0 (transitive via @eslint/eslintrc) |
| @babel/core | low | override ^7.29.7 (transitive via @vitejs/plugin-react, storybook) |

`npm audit`: 8 → 3 findings (3 OOS remain — `@react-email/preview-server` major, `next` 16 nested, `@storybook/react-vite` minor — deferred to `fix-security-baseline-b`).

## Scope
Manifest-only diff (`package.json` + `package-lock.json`). No source, test, or config changes.

## Verification (all PASS in worktree)
- [x] `npm audit --json` — `critical:0, high:0` for in-scope (in-scope findings: `{}`)
- [x] `npx vitest run --maxWorkers=2` — 844 passed / 21 failed — IDENTICAL to `main` baseline (pre-existing env-only failures: jsdom `localStorage.clear` + Strapi backend offline)
- [x] `npx next build` — 25 static pages generated, no `@babel/core` cascade errors
- [x] `npm run lint` — clean, exit 0 (`js-yaml` override exercised via `@eslint/eslintrc@3.3.1` config loader)
- [x] `git diff --name-only main` — only `package.json` + `package-lock.json`
- [x] Alphabetical overrides check — `OK`

**No stop conditions fired.** Scope stays at 5 packages.

## Trivy gate
`.github/workflows/security.yml` (Trivy `severity: HIGH,CRITICAL`, `exit-code: 1`) MUST pass before merge. Confirmed via cascade analysis (Engram #1400): devDeps filtered by default, so on-PR Trivy delta expected ≈ 0. Final confirmation via CI.

## Out of scope (deferred to `fix-security-baseline-b`)
- `@react-email/preview-server` 5.x → 4.3.2 (high; SemVer-major — risky)
- `nested next` 16.2.3 (high; only resolvable via the preview-server major bump)
- `@storybook/react-vite` 9.0.16 → 9.1.20 (high; minor — user-deferred)

## Files changed
| File | Lines | What |
|---|---|---|
| `package.json` | +5 / -3 | 3 vitest direct bumps + 2 override inserts |
| `package-lock.json` | +174 / -165 | `npm install` regenerated (339 total — under 400 budget) |
| `openspec/changes/fix-security-baseline/*` | — | SDD artifacts (proposal, specs, design, tasks, apply-progress) committed for traceability |

## Refs
- Proposal: `openspec/changes/fix-security-baseline/proposal.md`
- Spec: `openspec/changes/fix-security-baseline/specs/security-baseline/spec.md`
- Design: `openspec/changes/fix-security-baseline/design.md`
- Tasks: `openspec/changes/fix-security-baseline/tasks.md`
- Apply-progress: `openspec/changes/fix-security-baseline/apply-progress.md`
- Roadmap: Engram #1402
- Trivy cascade: Engram #1400
- Project context: Engram #2

Closes DEBT-10. Manifest-only. No source/test/config/workflow changes.

<!-- branch-pr skill: requires linked issue with status:approved. This project does not have an ISSUE_TEMPLATE for security baseline work; DEBT-10 is the internal roadmap reference. -->
