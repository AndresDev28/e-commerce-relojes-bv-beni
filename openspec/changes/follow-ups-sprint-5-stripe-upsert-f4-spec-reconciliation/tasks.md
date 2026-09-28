# Tasks: follow-ups-sprint-5-stripe-upsert-f4-spec-reconciliation

## Branch

`frontend/F4-SPEC-RECONCILIATION-spec-promotion` (create from `main`, NOT pushed — delivery decision is separate)

## Mode

Interactive · Docs-only · Strict TDD active (gate only, no RED/GREEN cycle) · Triple-gate verification at apply time

## Test Commands

- `npx vitest run --maxWorkers=2` (mandatory per AGENT.md — vitest cap on high-core-count hardware)
- `npx tsc --noEmit`
- `npm run build`

## Source Files

- **Delta spec** (verbatim source): `openspec/changes/follow-ups-sprint-5-stripe-upsert-f4-spec-reconciliation/specs/checkout-error-display/spec.md`
- **Canonical base** (target): `openspec/specs/checkout-error-display/spec.md`
- **Design** (mechanics reference): `openspec/changes/follow-ups-sprint-5-stripe-upsert-f4-spec-reconciliation/design.md`

## Pre-Merge Tasks

- [ ] **T1: Baseline verification (abort-on-drift gate)**
  - Read `openspec/specs/checkout-error-display/spec.md` and confirm:
    - 206 lines
    - Exactly 6 Requirements (R1 Single Page-Level Payment Error Alert, R2 ErrorMessage Component Contract, R3 Trace ID Preservation Through Error Path, R4 Friendly Error Mapping for Stripe Codes, R5 Order Upsert Retry Contract (F8), R6 Unauthenticated Visitor Redirect)
    - S-MOD.8 scenario present at lines 89-96 byte-identical
  - **Abort condition**: any drift. Re-read main, check for concurrent changes, do not force-merge.

## Merge Tasks (apply phase — append-only to canonical base)

- [ ] **T2: Append R7 — Payment-Intent Friendly Error Mapping**
  - Source: delta spec `### Requirement: Payment-Intent Friendly Error Mapping` (4 Scenarios: 500, 400, network, parse)
  - Copy verbatim — no paraphrasing, no abbreviation, no scenario reordering.

- [ ] **T3: Append R8 — CheckoutForm Integration**
  - Source: delta spec `### Requirement: CheckoutForm Integration` (2 Scenarios: 500 via onError, network via onError)
  - Copy verbatim.
  - **Note**: R8 carries the `onError(localizedMessage: string) => void` contract preservation scenarios (per F4 design.md Decision #8). No standalone R5.

- [ ] **T4: Append R9 — Public API Exposure**
  - Source: delta spec `### Requirement: Public API Exposure` (1 Scenario: module resolution)
  - Copy verbatim.

- [ ] **T5: Append R10 — Unit Coverage and No-Leak Guarantee**
  - Source: delta spec `### Requirement: Unit Coverage and No-Leak Guarantee` (1 Scenario: saturated body no-leak)
  - Copy verbatim.

- [ ] **T6: Append R11 — Existing UPSERT Mapping Isolation**
  - Source: delta spec `### Requirement: Existing UPSERT Mapping Isolation` (1 Scenario: existing tests untouched)
  - Copy verbatim.

- [ ] **T7: Apply MODIFIED R4 — Friendly Error Mapping for Stripe Codes**
  - **Preserve byte-identical**: existing R4 requirement body text + all 3 existing Scenarios (Known Stripe code maps, Unknown code falls back, S-MOD.8 from F8 defensive catch) at current lines 71-96.
  - **Append only**: new Scenario "Payment-intent friendly mapping extends the R4 scope (S-MOD.9, F4)" immediately after S-MOD.8.
  - **Do NOT**: edit, reorder, or remove any existing R4 scenario.

## Post-Merge Verification Tasks

- [ ] **T8: Post-merge byte-count and Requirement-count check**
  - `openspec/specs/checkout-error-display/spec.md` MUST be ~320 lines (± 5).
  - MUST end with exactly 11 Requirements (R1-R11).
  - S-MOD.8 lines 89-96 MUST be byte-identical to pre-merge (offset-shifted by the same amount as the R4 modifications).
  - No `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, or `## RENAMED Requirements` markers in canonical base — those are delta-spec markers only.
  - No requirement titled "R5: onError Contract Preserved" exists in canonical base — that contract lives as scenarios inside R8.

## Triple-Gate Tasks (apply-time verification, zero collateral damage proof)

- [ ] **T9: Vitest green** — `npx vitest run --maxWorkers=2` exits 0. Confirms no test collateral damage from spec edits.

- [ ] **T10: TypeScript clean** — `npx tsc --noEmit` exits 0. Confirms no type contract drift.

- [ ] **T11: Build green** — `npm run build` exits 0. Confirms no Next.js build-time regression.

## Commit and Archive Tasks

- [ ] **T12: Work-unit commit**
  - Conventional commit message: `docs(checkout-error-display): reconcile F4 delta into canonical base spec (R7-R11 + S-MOD.9)`
  - Stage only `openspec/specs/checkout-error-display/spec.md`. No other files (this is a docs-only change with single-file blast radius).
  - **No Co-Authored-By** or AI attribution in commit body (per AGENT.md / global persona rules).

- [ ] **T13: Archive folder move**
  - `git mv openspec/changes/follow-ups-sprint-5-stripe-upsert-f4-spec-reconciliation openspec/changes/archive/<archive-date>-follow-ups-sprint-5-stripe-upsert-f4-spec-reconciliation`
  - If `git mv` fails (folder untracked), fall back to plain `mv` with a pre-move snapshot guard.
  - Mandatory post-move readback: `diff -r <snapshot> <destination>` returns exit 0 with empty output (byte-identical).

## Out-of-Scope Tasks (NOT in this cycle)

- F7 (`bug-redirect-tienda`) — separate cycle, high priority user-facing
- W4/W7 batch (`requestCancellation.ts:26-35` orders flow catch leak) — separate cycle
- W1 (`.json()` 2xx-path wrap letter-deviation) — tracked, not remediated
- W2 (voseo/tuteo register mismatch in error copy) — tracked, not remediated
- W5 (size:exception pattern from F4) — historical, not relevant for this docs-only cycle

## Review Workload Forecast

- Changed lines: ~115 (target post-merge delta on `openspec/specs/checkout-error-display/spec.md`, 206 → ~320)
- Changed files: 1 (canonical base spec only)
- Risk tier: **passive** (docs-only change, no executable content modified)
- Review budget: well under 400 lines per PR (single-file, ~115 LOC delta)
- Chained PRs recommended: **No** — single PR is appropriate
- Decision needed before apply: **No** — preflight already chose `ask-on-risk` with no high-risk forecast

## Rollback Plan

If any task fails or post-merge verification reveals drift:

1. `git checkout openspec/specs/checkout-error-display/spec.md` — reverts the single modified file.
2. `git reset --hard HEAD~1` — reverts the work-unit commit if already committed.
3. No data loss: the delta spec at `openspec/changes/.../specs/checkout-error-display/spec.md` remains intact for re-attempt.
4. If the cycle folder was already moved to archive, restore from archive: `git mv openspec/changes/archive/<archive-date>-... openspec/changes/follow-ups-sprint-5-stripe-upsert-f4-spec-reconciliation`.

## Verification Strategy

Triple gate is the apply-time verification. The change is docs-only, so:

- No RED tests (no behavior change to test)
- No GREEN tests (no implementation change)
- No REFACTOR pass (no code change)
- Triple gate (`vitest` + `tsc` + `build`) serves as the zero-collateral-damage proof

Sprint 5 F-series regression coverage at F4 archive time: 1144/1144 unit, 12/12 integration, e2e Test 1 PASSED, Test 2 deferred to F9 (now merged per session_summary "F9 cycle complete"). This cycle does not re-run the full F4 verify; the triple gate proves the merge produced no collateral damage.

## Notes for Apply Agent

1. **Single-file blast radius**: only `openspec/specs/checkout-error-display/spec.md` is modified. No code, no tests, no config.
2. **Append-only merge**: never edit existing canonical content except for the explicit S-MOD.9 append in R4.
3. **Verbatim copy**: scenario text from delta is copied character-for-character. If you find yourself paraphrasing, stop and re-read the delta.
4. **Numbering**: R7-R11 are applied in append order. The delta does not number requirements.
5. **Pre-flight abort-on-drift**: if T1 baseline check fails, STOP. Do not proceed with T2-T7.
6. **Post-merge byte-count**: target 320 ± 5. If the actual count diverges > 10 lines, investigate before committing.
