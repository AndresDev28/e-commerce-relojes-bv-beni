# Design: follow-ups-sprint-5-stripe-upsert-f4-spec-reconciliation

## Goal Recap

Docs-only spec reconciliation cycle. The F4 friendly-error-mapping code shipped on 2026-09-21 and is archived at `openspec/changes/archive/2026-09-21-follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping/`, but its 5 ADDED Requirements and 1 MODIFIED Requirement were never promoted to the canonical base spec. This cycle reconciles that documentation gap. No code changes, no test changes, no architectural decisions — the implementation contract is already locked by F4's archived design.

## Merge Mechanics (apply-phase execution plan)

The apply phase performs a **delta-to-canonical merge** on `openspec/specs/checkout-error-display/spec.md`. The change folder's delta spec at `openspec/changes/follow-ups-sprint-5-stripe-upsert-f4-spec-reconciliation/specs/checkout-error-display/spec.md` is the source of truth for the appended text.

### Step 1 — Pre-merge baseline verification

Before any edit, verify the canonical base still matches the assumed state:

- File: `openspec/specs/checkout-error-display/spec.md`
- Must contain exactly 6 Requirements: R1 Single Page-Level Payment Error Alert, R2 ErrorMessage Component Contract, R3 Trace ID Preservation Through Error Path, R4 Friendly Error Mapping for Stripe Codes, R5 Order Upsert Retry Contract (F8), R6 Unauthenticated Visitor Redirect.
- Must be 206 lines.
- S-MOD.8 scenario must be at lines 89-96 (byte-identity anchor).

**Abort condition**: if any of the above drift (a concurrent F-series change touched the base), stop and re-plan. Do not force-merge onto a drifted baseline.

### Step 2 — Append 5 ADDED Requirements

Append the 5 ADDED Requirements from the delta spec to the canonical base, in this order. Each requirement uses the EXACT body and Scenario text from the delta — no paraphrasing, no abbreviation, no scenario reordering.

| Position | Source | Title | Scenarios |
|----------|--------|-------|-----------|
| R7 | delta ### Requirement: Payment-Intent Friendly Error Mapping | Payment-Intent Friendly Error Mapping | 4 (500, 400, network, parse) |
| R8 | delta ### Requirement: CheckoutForm Integration | CheckoutForm Integration | 2 (500 via onError, network via onError) |
| R9 | delta ### Requirement: Public API Exposure | Public API Exposure | 1 (module resolution) |
| R10 | delta ### Requirement: Unit Coverage and No-Leak Guarantee | Unit Coverage and No-Leak Guarantee | 1 (saturated body no-leak) |
| R11 | delta ### Requirement: Existing UPSERT Mapping Isolation | Existing UPSERT Mapping Isolation | 1 (existing tests untouched) |

Numbering (R7-R11) is applied in this append step. The delta spec itself does not number the Requirements; OpenSpec numbers at apply time.

### Step 3 — Apply MODIFIED R4 (Friendly Error Mapping for Stripe Codes)

For the existing R4 in the canonical base (currently lines 71-96):

- Keep the existing Requirement body text BYTE-IDENTICAL.
- Keep the existing 3 Scenarios BYTE-IDENTICAL in their existing order:
  - "Known Stripe code maps to localized Spanish string"
  - "Unknown code falls back to default message"
  - "Outer defensive catch in useCreateOrder.createOrder does not leak error.message (S-MOD.8, F8)"
- Append a new Scenario immediately after S-MOD.8: "Payment-intent friendly mapping extends the R4 scope (S-MOD.9, F4)" — text from delta's MODIFIED section.

No existing scenario is edited, reordered, or removed. The MODIFIED scope-extension is purely additive.

### Step 4 — Post-merge verification

After the merge, the canonical base MUST satisfy:

- [ ] File length grows from 206 to ~320 lines (precise target: ~320 ± 5).
- [ ] Exactly 11 Requirements (R1-R11).
- [ ] S-MOD.8 scenario is byte-identical to the pre-merge version (lines 89-96 anchor still valid or shifted by exactly the same offset).
- [ ] S-MOD.9 (F4) scenario is present and follows S-MOD.8.
- [ ] No requirement titled "R5: onError Contract Preserved" — that contract lives as scenarios inside R8 (= F4 R2 CheckoutForm Integration).
- [ ] No `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, or `## RENAMED Requirements` markers in the canonical base — those are delta-spec markers, not canonical markers.

### Step 5 — Triple gate green

Run the project's standard verification gate. All three MUST exit 0:

- `npx vitest run --maxWorkers=2`
- `npx tsc --noEmit`
- `npm run build`

This proves zero collateral damage despite the docs-only change. The gate is the apply-time confidence that no test, no type contract, and no build output regressed.

## Risk Register

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **Hallucination pattern from F4 archive-report** — F4's archive claimed 9 Requirements when the canonical base had 6. If the apply agent copies that hallucination pattern instead of verifying, the post-merge byte-count and Requirement-count will be wrong. | Medium | Step 1 baseline check + Step 4 post-merge check both verify the actual canonical state from disk, not from prior archive-report claims. The sdd-archive of THIS cycle must also byte-count after promotion. |
| **S-MOD.8 overwritten or reordered** — the apply agent accidentally edits the existing R4 scenarios while inserting S-MOD.9. | Low | Step 3 mandates byte-identical preservation of the existing 3 scenarios; the only added content is the new S-MOD.9 scenario appended after S-MOD.8. Post-merge diff in sdd-archive must show S-MOD.8 lines byte-identical (excluding offset). |
| **Drift in F4 delta file paths or text** — the F4 delta references `src/features/checkout/utils/checkoutPaymentErrors.ts`, `CheckoutForm.tsx`, `STRIPE_ERROR_MESSAGES`. If any path moved in the 5 days since F4 archived, the appended spec text references stale paths. | Low | The apply agent cross-references each file path in the delta against the actual on-disk paths; if any path is missing or renamed, surface and stop. |
| **Concurrent canonical changes** — another F-series change touches `checkout-error-display` between this design and apply. | Low | Step 1 re-reads the canonical base immediately before editing; if drift detected, abort and re-plan. |
| **Numbering drift** — a new cycle adds R7-R12 to checkout-error-display between this design and apply, shifting the planned R7-R11 to R8-R13 or similar. | Low | Step 1 reads the canonical base and confirms R1-R6 with no R7+; if R7+ already exists, abort and re-plan. |

## No ADR Section

This cycle introduces no architectural decisions. The implementation contract was locked by F4's design.md (Decision #8: `(localizedMessage: string) => void` preserved; status-first branch precedence; fixed-copy approach). This cycle is purely a documentation promotion.

## No Test Plan Section

No new tests. No test changes. The existing test suite + the triple gate at apply time are the verification. The unit tests for `paymentIntentErrors` (1144/1144 at F4 archive time, per F4 verify-report.md) and `checkoutOrderErrors` (13/13) cover the appended Requirements.
