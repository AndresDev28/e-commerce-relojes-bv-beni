# QA Process for Feature Changes

This directory contains QA test plans for frontend change tickets (UXW-###, BUG-###, etc.). Each plan is an audit trail: what was tested, how it was tested, and the results.

## When to use a QA test plan

Create a QA test plan for:

- **UXW-### tickets** (user-facing UX changes) — these are the primary use case
- **BUG-### tickets** that include both a regression fix and a new behavior
- Any change that ships user-facing behavior the dev or QA team should verify

A QA test plan is **not** needed for:

- Internal refactors without behavior change
- Pure dependency upgrades
- Bug fixes where the change is obvious and limited in scope

## File naming convention

`{ticket-id}-{slug}.md` — kebab-case, lowercase, no spaces.

Examples:

- `UXW-01-favorites-silent-fail.md`
- `UXW-02-breadcrumbs-truncated.md`
- `BUG-15-cart-crash-on-remove.md`

The slug should match the branch name for the change (after the `frontend/{TICKET-ID}-` prefix).

## Process

1. **Plan**: copy `TEMPLATE.md` and rename per the convention above
2. **Run**: walk through each test case, mark PASS/FAIL with notes inline
3. **Automate**: when possible, convert P0 tests into Playwright E2E tests in `tests/e2e/{change-slug}.spec.ts` (CI-ready regression coverage)
4. **Archive**: commit the filled-in plan to the change's branch
5. **Reference**: link from the PR description under "Test plan" or similar

## Test priority categories

Test cases are organized by priority:

- **P0 — Critical**: the bug fix itself or core happy path. If any P0 fails, the change is not mergeable.
- **P1 — UX correctness**: design decisions and accessibility (e.g., "the prompt is local to the tapped card", "aria-live region is always mounted"). These cover the why behind the implementation.
- **P2 — Edge cases & regression**: defensive checks, boundary conditions, regression sweep on adjacent features.

## What to include in a test case

Each test case should have:

- **Precondition**: state of the system before the test (e.g., "anonymous user", "Strapi running", "user has 3 favorites")
- **Steps**: numbered actions the tester takes
- **Expected**: what should happen (state changes, URL, UI changes, network requests)
- **PASS / FAIL**: result with a short note

## How QA test plans relate to the rest of the workflow

| Artifact | Purpose |
|---|---|
| `openspec/changes/{change-name}/` | Technical design (proposal, spec, design, tasks, verify-report) |
| `tests/e2e/{change-slug}.spec.ts` | Automated regression tests (CI) |
| **`.github/qa/{ticket-id}-{slug}.md`** | **Human QA audit trail (what was tested, results)** |
| `openspec/changes/archive/.../apply-progress.md` | Implementation progress log |

The QA plan is the bridge between the SDD artifacts (which capture the design) and the Playwright tests (which prove the design works). It captures the *manual* verification that may not be fully automated, plus the tester's observations.

## Quick reference for QA testers

- **Backend**: `cd ../e-commerce-relojes-bv-beni-api && npm run dev` (or use remote Strapi)
- **Frontend**: `npm run dev` on the change branch
- **Browser**: Chrome DevTools open (Network + Console + Accessibility tabs)
- **Two profiles**: incognito (anonymous) + authenticated (test user)
- **Service check**: `curl http://localhost:3000/tienda` should return 200
- **Diagnostic commands**: `pgrep -a orca` (screen reader), `pavucontrol` (audio)

## When QA tests should run

- **Before merging** any change that has a QA plan in this directory
- **After a regression** is suspected (CI fails, manual test fails)
- **Periodically** as a smoke test (e.g., weekly, before deployments)

The QA test plan is **not** a substitute for automated tests. It's a manual safety net for behavior that's hard to assert programmatically (visual UX, screen reader announcements, real network conditions).
