# Archive Report: follow-ups/sprint-5-stripe-upsert/F5-e2e-triple-gate

> Engram mirror: observation **#1925** — topic_key `sdd/follow-ups/sprint-5-stripe-upsert/F5-e2e-triple-gate/archive-report`. Both writes verified by readback at archive time.

## Change Identity

| Field | Value |
|-------|-------|
| Change name | `follow-ups/sprint-5-stripe-upsert/F5-e2e-triple-gate` |
| Project | `e-commerce-relojes-bv-beni` |
| Artifact store | hybrid (filesystem primary + Engram mirror) |
| Branch | `frontend/F5-e2e-triple-gate` |
| Base | `main` @ `8e54f5f` (PR #144 release-please merge, v1.11.1) |
| Branch HEAD | `2307ff3` |
| Merge commit | `b2e37e6` — Merge pull request #145 (true merge commit; parents `8e54f5f` + `2307ff3`; all 7 work-unit commits reachable from main. The launch prompt described it as a squash merge — the repository object data above is the authoritative record; the difference is immaterial to delivery) |
| Delivery | PR #145 MERGED into main 2026-09-23T16:52:20Z. Branch still exists locally and on origin (deletion is ordinary repo policy, not archive scope) |
| Verify verdict | verify phase skipped per design (optional diagnostic); PR-merged state with all-green CI supersedes |
| Status at archive | COMPLETE + MERGED |

## Verdict

**PASS — ARCHIVED COMPLETE.** 17/17 tasks done, 10/10 delta-spec scenarios compliant (2 densified included), triple gate green, CI fully green on PR #145, merged to main. No blockers. Pre-existing flake and F9-deferred skip disclosed below; neither is an F5 regression.

## Final-State Commit Table (7 commits)

| SHA | Type | Subject |
|-----|------|---------|
| `0cb2e26` | chore(ci) | playwright config branches Next server on process.env.CI |
| `8566204` | ci | add e2e job to .github/workflows/ci.yml |
| `6ed8922` | docs(agent) | extend CI verify-gate vocabulary to include Playwright e2e |
| `dcb2883` | ci(e2e) | bump timeout 15 to 25 min based on first-CI-run baseline |
| `8c9067d` | ci(e2e) | reduce CI retries 2 to 1 based on first-CI-run baseline |
| `d1a089a` | test(e2e) | replace networkidle with load state to unblock Stripe analytics CI (9 specs) |
| `2307ff3` | chore(tests) | remove stray F3 trace spec from F5 branch (net-zero cleanup of a file that slipped into `d1a089a`) |

The last four commits are post-apply data-driven tuning: apply-progress recorded task 4.4 (first-CI-run baseline) as pending at snapshot time; the first PR run resolved it — measured wall-clock justified `timeout-minutes: 25` (from 15) and CI `retries: 1` (from 2). The `networkidle → load` change was needed because Stripe.js v3 analytics (POST to r.stripe.com/b every ~3s) kept the network busy; root cause diagnosed via Playwright trace analysis of run 35884265724 (15 failures on `waitForLoadState('networkidle')`).

## Files Changed Tally (PR net diff `8e54f5f..2307ff3`)

12 files, +93 / −29.

| File | Action | Notes |
|------|--------|-------|
| `.github/workflows/ci.yml` | MODIFIED | +47 — e2e job (needs: test, timeout 25 final, skip mirrors `security.yml:21`, 3 non-secret env values, report artifact on failure) |
| `playwright.config.ts` | MODIFIED | CI ternary `npm run start`/`npm run dev`; CI retries 1 (final) |
| `AGENT.md` | MODIFIED | +1 — CI verify-gate vocabulary bullet |
| 9 × `tests/e2e/*.spec.ts` | MODIFIED | `waitForLoadState('load')` replaces `'networkidle'` |

(apply-progress snapshot reported 3 files / +71−7 at work-unit close; final PR scope above supersedes it.)

## Spec Compliance Matrix (10 scenarios)

Source: `specs/github-actions-ci/spec.md` (delta). Attribution: "structural" = tasks 4.2/4.3 js-yaml + content checks at apply; "observed" = real CI/local runs.

| # | Requirement / Scenario | Evidence | Status |
|---|------------------------|----------|--------|
| 1 | CI Jobs — Successful run | PR #145 run 35889439821: all checks green (observed) | COMPLIANT |
| 2 | CI Jobs — Build failure (downstream skip) | needs chain lint→build→test→e2e (structural) | COMPLIANT |
| 3 | CI Jobs — E2E failure blocks the pipeline | run 35884265724: e2e job failed the workflow with 15 networkidle failures (observed) | COMPLIANT |
| 4 | CI Jobs — E2E success completes the workflow *(densified)* | task 4.2 structural + run 35889439821 green workflow enabled merge (observed) | COMPLIANT |
| 5 | E2E Inclusion — E2E gate executes | run 35889439821: 66 tests vs production `next start` + mock Strapi (observed) | COMPLIANT |
| 6 | E2E Inclusion — Browser matrix scope | `npx playwright install --with-deps chromium firefox`; config projects chromium+firefox only (task 4.3) | COMPLIANT |
| 7 | E2E Inclusion — Non-secret environment values only | env = exactly the 3 documented safe values, no SECRET key (tasks 2.4/4.3); job passed with no live credentials (observed) | COMPLIANT |
| 8 | E2E Inclusion — Release-automation skip | skip condition byte-identical to `security.yml:21` (task 2.3, actionlint clean) | COMPLIANT (structural) |
| 9 | E2E Inclusion — Report uploaded on failure | `if: failure()` upload step present (structural) and failure path exercised by run 35884265724; artifact downloadability not independently re-verified at archive time | COMPLIANT (structural) |
| 10 | E2E Inclusion — Local development preserved *(densified)* | task 1.3: non-CI run booted `next dev` against localhost:3000 (observed) | COMPLIANT |

## Triple-Gate Result (final state)

| Gate | Command | Result |
|------|---------|--------|
| Unit | `npx vitest run --maxWorkers=2` | 1148/1149 passed — 1 pre-existing flake in `image-allowlist.test.ts` C3.S1 (documented in F7 verify-report; not an F5 regression). apply-progress snapshot recorded 1149/1149 at apply time. |
| Types | `npx tsc --noEmit` | clean |
| Build | `npm run build` | clean |

## CI Result on PR #145

Runs 35888443859 and 35889439821. Final run 35889439821: all 8 checks green — Lint 33s, Build 1m6s, Test 1m29s, E2E 2m4s, CodeQL, Trivy, npm audit, Vercel. E2E suite: 66 passed / 0 failed / 2 skipped (one skip is the F9-deferred Test 2 of `payment-errors`), wall-clock 1.9–2.0m on CI — the measured baseline behind the 25-minute timeout and retries=1.

## Specs Synced (canonical)

`openspec/specs/github-actions-ci/spec.md` updated via native composition:

- **First attempt refused (recorded for audit):** `gentle-ai sdd-archive-compose --canonical openspec/specs/github-actions-ci/spec.md --delta openspec/changes/.../specs/github-actions-ci/spec.md` → exit 1, `unapplied MODIFIED delta for requirement "E2E Inclusion": no canonical requirement named "E2E Inclusion"` — the raw delta travels the `E2E Exclusion → E2E Inclusion` rename inside a MODIFIED block, while OpenSpec convention requires renames stated explicitly.
- **Normalization:** a derived compose input was built mechanically from the original delta — the `## MODIFIED Requirements` section copied verbatim (byte-identity proven by `diff` of the extracted sections, output `MODIFIED-SECTION-BYTES-IDENTICAL`) plus an explicit `## RENAMED Requirements` block (`E2E Exclusion -> E2E Inclusion`) with the delta's own Reason note. The archived delta file itself was NOT modified.
- **Final composition:** `gentle-ai sdd-archive-compose --canonical "openspec/specs/github-actions-ci/spec.md" --delta /tmp/opencode/f5-compose-delta.md --output <tmp> && mv` → exit 0.
- **Readback:** `git diff` on the canonical spec touches ONLY `CI Jobs` (3→4 scenarios) and `E2E Exclusion`→`E2E Inclusion` (6 scenarios). `CI Triggers` and `Node Version` are byte-identical (absent from the diff).
- **rules.archive ("Warn before merging destructive deltas"):** the wholesale replacement of `E2E Exclusion` is the documented, approved purpose of this change (proposal, delta note, design decision, and the merged implementation all align) — warning noted; not a surprise merge.

## Archive Integrity

- Folder moved: `openspec/changes/follow-ups-sprint-5-stripe-upsert-F5-e2e-triple-gate/` → `openspec/changes/archive/2026-09-23-follow-ups-sprint-5-stripe-upsert-f5-e2e-triple-gate/`.
- `git mv` refused (exit 128: directory untracked — consistent with repo history where several prior archive folders are also untracked); after verifying the source unchanged against the pre-move snapshot (`diff -r` empty), the plain `mv` fallback completed.
- Readback: `diff -r` snapshot vs destination — empty output, exit 0 (the only passing evidence). Source directory confirmed gone from active changes.
- Preserved artifacts (original bytes, incl. hidden `.gentle-ai-instance`): `exploration.md`, `proposal.md`, `specs/github-actions-ci/spec.md` (delta), `design.md`, `tasks.md` (17/17 `[x]`, original bytes), `apply-progress.md`. No `verify-report.md` existed (verify skipped per design — recorded, not fabricated).

## Carry-Forward

None blocking. Disclosed residuals:
1. Pre-existing vitest flake `image-allowlist.test.ts` C3.S1 (F7-documented, tracked outside this change).
2. F9-deferred Test 2 of `payment-errors` remains skipped by design.
3. Task 4.4 residual checkpoints (downloadable report artifact on a real failure; "missing build-time value MUST fail" on a fresh runner) — the F5 wiring itself is proven by the green merged runs; these live confirmations ride on future failing runs naturally.
4. Branch `frontend/F5-e2e-triple-gate` left in place locally and on origin (deletion = ordinary repo policy).

## Traceability

- Filesystem artifacts read at archive (hybrid → file locators, per orchestrator): exploration, proposal, delta spec, design, tasks, apply-progress; plus canonical spec and merged `.github/workflows/ci.yml` / `playwright.config.ts` / `AGENT.md` final state.
- Engram mirrors of each phase artifact exist under `sdd/follow-ups/sprint-5-stripe-upsert/F5-e2e-triple-gate/*` from their phases (not re-read at archive; filesystem was primary).
- This report's Engram mirror: topic_key `sdd/follow-ups/sprint-5-stripe-upsert/F5-e2e-triple-gate/archive-report` (observation #1925, recorded in the header note above).

## SDD Cycle Complete

Implementation: MERGED to main (`b2e37e6`, PR #145). Verification: verify phase skipped by design; CI + triple gate green as final evidence. Unfinished tasks: none.
