# Proposal: follow-ups-sprint-5-stripe-upsert-f4-spec-reconciliation

## Intent

This is a docs-only spec reconciliation change for `checkout-error-display`. The F4 friendly-error-mapping code shipped and was archived on 2026-09-21, but its delta requirements were never promoted into the canonical base spec. This proposal closes that documentation gap by describing the exact base-spec append and merge work needed now, without reopening implementation decisions or changing shipped code.

## Scope

### In Scope

- `openspec/specs/checkout-error-display/spec.md` — append 5 missing F4 requirements after current `R6: Unauthenticated Visitor Redirect`, preserving existing `R1` through `R6` numbering.
- `openspec/specs/checkout-error-display/spec.md` — append new `R7 = F4 R1` (`Payment-Intent Friendly Error Mapping`) with its scenarios in F4 delta order.
- `openspec/specs/checkout-error-display/spec.md` — append new `R8 = F4 R2` (`CheckoutForm Integration`) with its scenarios, including the preserved `onError(localizedMessage: string)` contract inside the scenarios rather than as a standalone requirement.
- `openspec/specs/checkout-error-display/spec.md` — append new `R9 = F4 R3` (`Public API Exposure`) with its scenario.
- `openspec/specs/checkout-error-display/spec.md` — append new `R10 = F4 R4` (`Unit Coverage and No-Leak Guarantee`) with its scenario.
- `openspec/specs/checkout-error-display/spec.md` — append new `R11 = F4 R6` (`Existing UPSERT Mapping Isolation`) with its scenario.
- `openspec/specs/checkout-error-display/spec.md` — modify existing `R4: Friendly Error Mapping for Stripe Codes` only by appending a new scenario `S-MOD.9, F4` that records the F4 scope extension note and cross-references existing `S-MOD.8`.
- `openspec/changes/archive/2026-09-21-follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping/specs/checkout-error-display/spec.md` — use as the verbatim source for appended F4 requirement and scenario text during spec work.

### Out of Scope

- Backend changes of any kind.
- Frontend code changes of any kind.
- Any modification to F8 or F9 requirements beyond preserving their current canonical text.
- F7 (`bug-redirect-tienda`) follow-up work.
- W4/W7 batch remediation for the orders flow catch leak.
- Remediation of carry-forwards W1, W2, or W5 in this cycle.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `checkout-error-display`: reconcile the canonical spec by promoting F4's archived delta requirements into the base capability and extending existing `R4` with an additive F4 scope note.

## Approach

The spec phase should treat this as a controlled documentation promotion, not a fresh feature. The canonical target remains `openspec/specs/checkout-error-display/spec.md`. The work is: (1) confirm the base file still has 6 requirements before editing, (2) append F4's missing added requirements in the locked order `R7` through `R11`, (3) merge the F4 modification into existing `R4` by adding only a new scenario `S-MOD.9, F4`, and (4) verify that `S-MOD.8` at current lines 89-96 remains byte-identical. Carry-forwards W1, W2, and W5 are registered in the proposal as tracked future work, not silently corrected here.

### Numbering Rationale

- The base spec already owns `R1` through `R6`; those numbers stay frozen to preserve existing cross-references, including prior verify-report references.
- F4 contributes 5 new requirements, not 6. The requested user-scope label `R5: onError Contract Preserved` is not a separate F4 requirement; it is already covered by F4 `R2: CheckoutForm Integration` and its scenarios.
- Therefore the correct append map is `R7 = F4 R1`, `R8 = F4 R2`, `R9 = F4 R3`, `R10 = F4 R4`, and `R11 = F4 R6`.
- No `R12` is introduced because there is no standalone sixth F4 requirement to promote.

### Modified R4 Merge Strategy

- Keep existing `R4: Friendly Error Mapping for Stripe Codes` text intact.
- Keep existing `S-MOD.8` at lines 89-96 byte-identical.
- Append one new scenario immediately after `S-MOD.8` named `S-MOD.9, F4`.
- `S-MOD.9, F4` records that the same friendly-mapping contract now also covers payment-intent HTTP, network, and parse failures through `paymentIntentErrors`, and explicitly cross-references `S-MOD.8` so the F4 extension is additive rather than a replacement.

### Carry-Forwards Registered

- `W1` — `.json()` 2xx-path wrap letter-deviation. Tracked for a future cycle.
- `W2` — voseo/tuteo register mismatch. Tracked for a future cycle.
- `W5` — `size:exception` pattern. Tracked for a future cycle.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `openspec/specs/checkout-error-display/spec.md` | Modified | Append `R7`-`R11` and add additive `S-MOD.9, F4` under existing `R4` without altering `S-MOD.8` |
| `openspec/changes/archive/2026-09-21-follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping/specs/checkout-error-display/spec.md` | Referenced | Source of verbatim F4 requirement and scenario text to promote |
| `openspec/changes/archive/2026-09-21-follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping/archive-report.md` | Referenced | Negative example only; do not repeat its hallucinated merge claim |
| `openspec/changes/follow-ups-sprint-5-stripe-upsert-f4-spec-reconciliation/proposal.md` | New | Documents the locked reconciliation scope and merge constraints |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Repeating the F4 archive hallucination pattern and claiming the base spec is already synced | Medium | Verify the real canonical file before spec work, then confirm post-promotion growth by actual line count and requirement count rather than copying archive-report claims |
| Drift between archived F4 delta paths/text and shipped code context | Low | Use the archived F4 delta as the source text, but cross-check the referenced surfaces against the shipped frontend paths before finalizing the spec delta |
| Another F-series change touches `checkout-error-display` during reconciliation | Low | F-series is mostly closed; still re-read the base spec immediately before editing to confirm no new concurrent canonical changes landed |
| Accidental overwrite of F8's `S-MOD.8` while merging the F4 note | Medium | Treat the R4 change as append-only and explicitly verify lines 89-96 remain byte-identical after adding `S-MOD.9, F4` |

## Rollback Plan

If the reconciliation proposal proves incorrect during the spec phase, revert only the proposed canonical spec edits for `openspec/specs/checkout-error-display/spec.md` and restore the pre-reconciliation file from Git. Because this cycle is docs-only and must not touch application code, rollback is limited to removing appended requirement blocks and the added `S-MOD.9, F4` scenario while preserving the original 6-requirement base spec.

## Dependencies

- Completed exploration at `openspec/changes/follow-ups-sprint-5-stripe-upsert-f4-spec-reconciliation/exploration.md`
- Archived F4 delta spec at `openspec/changes/archive/2026-09-21-follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping/specs/checkout-error-display/spec.md`
- Current canonical base spec at `openspec/specs/checkout-error-display/spec.md`

## Success Criteria

- [ ] `openspec/specs/checkout-error-display/spec.md` grows from 206 lines to the final post-append count, expected to land around 320 lines.
- [ ] The canonical `checkout-error-display` spec ends with exactly 11 requirements.
- [ ] Every F4 ADDED requirement and scenario is present in the canonical spec using verbatim text from the archived F4 delta.
- [ ] Existing `R4` contains a new additive scenario `S-MOD.9, F4` documenting the scope extension to payment-intent failures.
- [ ] Existing `S-MOD.8` remains byte-identical to current lines 89-96.
- [ ] No standalone requirement named `R5: onError Contract Preserved` is introduced; that contract remains covered within `R8` scenarios.
