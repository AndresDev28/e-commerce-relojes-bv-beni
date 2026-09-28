## Exploration: checkout-error-display spec reconciliation

### Current State
The base spec (`openspec/specs/checkout-error-display/spec.md`) has exactly 6 requirements:
- R1: Single Page-Level Payment Error Alert
- R2: ErrorMessage Component Contract
- R3: Trace ID Preservation Through Error Path
- R4: Friendly Error Mapping for Stripe Codes
- R5: Order Upsert Retry Contract (F8)
- R6: Unauthenticated Visitor Redirect

The F4 delta (`openspec/changes/archive/.../specs/checkout-error-display/spec.md`) attempted to introduce 5 new requirements (R1 Payment-Intent Friendly Error Mapping, R2 CheckoutForm Integration, R3 Public API Exposure, R4 Unit Coverage and No-Leak Guarantee, R6 Existing UPSERT Mapping Isolation) and modify the original R4 (Friendly Error Mapping for Stripe Codes).

### Findings

**A. Did F4's 5 ADDED + 1 MODIFIED ever land in base spec?**
No. The base spec was modified *after* F4's archive date (`2026-09-21`), but only for unrelated F8 ("Order Upsert Retry Contract") and F9 ("Unauthenticated Visitor Redirect") changes (commits `309818c` and `0c8f48f`). The `archive-report.md` for F4 claimed that it synced the specs and bumped the requirement count to 9. This claim is definitively false.

**B. Current spec confirmation**
Confirmed. 6 requirements exist (R1-R6 as listed above). F4's requirements are absent.

**C. Numbering decision**
Appending the 5 F4 requirements will bring the base spec from R1-R6 to R1-R11. The F4 `archive-report.md` indicated it was supposed to add 5 new requirements, which aligns.

**D. R5 mismatch**
The user's scope asks to reconcile "R5: onError Contract Preserved". The F4 delta spec does NOT have this requirement. The F4 `design.md` mentions `onError` signature preservation (Decision #8: `(localizedMessage: string) => void` unchanged). This indicates the user is inventing a requirement name based on the design document, or incorrectly referencing F4's R2 CheckoutForm Integration.

**E. Modified R4 conflict**
The F4 delta explicitly stated: "The new delta adds the payment-intent mapper as an additional surface for friendly mapping in the same flow." The base spec's R4 (Friendly Error Mapping for Stripe Codes) includes S-MOD.8 (from F8). The MODIFIED requirement in the F4 delta is a *note* extending scope, not a full replacement. Since F4 never merged, its modified note needs to be integrated carefully without destroying the F8 addition (S-MOD.8).

**F. LOC forecast**
The F4 delta spec is 128 lines total. Stripping headers and out-of-scope/AC blocks, the raw requirements text to append is ~113 LOC.

**G. Drift check**
Low priority; not performed. The F4 code was archived successfully and the task is to sync documentation.

### Risks
- `archive-report.md` hallucinations: F4's archive report explicitly hallucinated the successful spec sync.
- Mislabeled R5 in user scope ("onError Contract Preserved") requires clarification or mapping to F4 R2 (CheckoutForm Integration) and Design Decision 8.
- Merging F4's modification to base R4 must not overwrite F8's S-MOD.8 scenario.

### Ready for Proposal
Yes. The task is well-defined: append the 5 missing requirements from F4 delta to the base spec, and safely apply the F4 modification note to the base R4 without clobbering F8's additions.