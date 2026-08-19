# Archive Report: DEBT-LOGIN-REDIRECT-honor-redirect-query-param

## Change Summary

The change closes UXW-01 follow-up debt by making `/login` and `/registro` honor the `?redirect=` query parameter that callers (favorites auth prompt, order-detail guard) already generate. A new pure `sanitizeRedirect` helper centralizes open-redirect rejection, auth-page loop prevention, and `/mi-cuenta` fallback; both forms read `?redirect=` in `handleSubmit` and pass it through `AuthContext.login()`/`register()` (which remain URL-agnostic per REQ-9). The change ships the new `login-redirect` capability spec to the main specs directory.

## Final State (per orchestrator launch prompt)

| Metric | Value |
|---|---|
| Verdict | PASS_WITH_WARNINGS — no CRITICAL |
| Requirements satisfied | 9/9 |
| Scenarios runtime-pass | 15/17 (TC-01/TC-02 E2E converted from `written-but-not-run` to PASS at final state) |
| Vitest full suite | 928/949 (21 pre-existing unrelated `localStorage.clear` mock failures — byte-identical to `main`) |
| Playwright E2E | 4/4 PASS (TC-01 + TC-02 × Chromium + Firefox) |
| Manual QA blocks | 8/8 PASS per user confirmation |
| Runtime ledger | settled |
| LOC changed vs `main` | 334 (323 insertions + 11 deletions; under 400-line budget) |
| Branch | `frontend/DEBT-LOGIN-REDIRECT-honor-redirect-query-param` — ready for push |
| HEAD | `5a88357` |

## Commits (7 total)

| SHA | Message |
|---|---|
| `5a6e1b1` | `test(auth): RED sanitizeRedirect matrix` |
| `9eaf57f` | `feat(auth): add sanitizeRedirect helper` |
| `e67c98a` | `test(auth): RED AuthContext redirectTo push targets` |
| `4d49263` | `feat(auth): optional redirectTo on login/register` |
| `40a7c69` | `feat(auth): LoginForm passes ?redirect=` |
| `84f2027` | `feat(auth): RegisterForm passes ?redirect=` |
| `5a88357` | `test(e2e): login redirect round-trip TC-01/02` |

## Files Changed (7)

| File | Change |
|---|---|
| `src/lib/auth/redirect.ts` | New — `sanitizeRedirect()` pure helper |
| `src/lib/auth/__tests__/redirect.test.ts` | New — 19-case validation matrix |
| `src/context/AuthContext.tsx` | Modified — optional `redirectTo` on `login`/`register` |
| `src/context/__tests__/AuthContext.test.tsx` | Modified — TC-06/07/08/09 push-target assertions |
| `src/components/forms/LoginForm.tsx` | Modified — reads `?redirect=` in `handleSubmit` |
| `src/components/forms/RegisterForm.tsx` | Modified — mirror parity for sign-up |
| `tests/e2e/login-redirect.spec.ts` | New — TC-01/TC-02 round-trip |

## Artifacts Archived

- `proposal.md` ✅
- `exploration.md` ✅
- `design.md` ✅
- `tasks.md` ✅ (7/7 tasks complete; pre-apply checklist all `[x]`)
- `verify-report.md` ✅
- `archive-report.md` ✅ (this file)

## Capability Spec Synced

- `openspec/specs/login-redirect/spec.md` — NEW capability, already in place at main specs directory (no prior version to merge). 9 requirements, 17 scenarios, 9 test-mapping IDs.

## Final-State vs Snapshot Authority

Per the Final-State Authority hierarchy, the following intermediate-snapshot claims were superseded by final-state facts supplied in the orchestrator's launch prompt:

- `verify-report.md` recorded T7 as `STATUS: written-but-not-run`. The orchestrator's launch prompt confirms Playwright was executed at final state with 4/4 PASS across Chromium + Firefox, and manual QA cleared all 8 blocks. The change is archived against that final state, not the verify-time snapshot.
- `verify-report.md` recorded 2/17 E2E scenarios as `UNTESTED (written)`. At final state those scenarios have runtime evidence (4/4 Playwright runs).

The 21 pre-existing `localStorage.clear` mock failures (17 `CartContext`, 4 `CookieBanner`) are unrelated and byte-identical to `main` per `git diff main..HEAD` — they do NOT block archive and remain the responsibility of DEBT-02 follow-up work.

## Archive Mechanical-Contract Evidence

- Source: `openspec/changes/DEBT-LOGIN-REDIRECT-honor-redirect-query-param/`
- Destination: `openspec/changes/archive/2026-08-11-DEBT-LOGIN-REDIRECT-honor-redirect-query-param/`
- Move mechanism: `mv` (fallback used because the source files were untracked in git; `git mv` correctly rejected the move and the SKILL's `mv`-fallback path was used)
- `diff -r snapshot vs archived folder`: **EMPTY** (exit 0) — only passing evidence
- Source removal verified: `ls` returns "No such file or directory"

## SDD Cycle Complete

The change has been planned, implemented (RED→GREEN strict TDD), verified, and archived. Ready for the next change.
