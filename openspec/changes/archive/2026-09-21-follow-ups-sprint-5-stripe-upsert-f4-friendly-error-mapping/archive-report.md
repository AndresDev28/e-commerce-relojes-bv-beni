# Archive Report: follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping

## Change Identity

| Field | Value |
|-------|-------|
| Change name | `follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping` |
| Branch | `frontend/F4-friendly-error-mapping` |
| Branch HEAD | `8e4d9eb` |
| Base | `main` @ `85e2ff9` (v1.10.0 + W3 docs sync merged) |
| Delivery | Single PR (459 changed lines vs ~191 estimate — **size:exception** acknowledged by user) |
| Pushed/Merged | No — branch NOT pushed, NOT merged (delivery decision separate from archive) |
| Verify verdict | **PASS WITH WARNINGS** |
| Spec compliance | 5/5 requirements + 9/9 scenarios COMPLIANT |
| Artifact store mode | openspec (filesystem + engram hybrid) |

## Verdict

**PASS — ARCHIVED WITH CARRY-FORWARD WARNINGS**

All 5 requirements / 9 scenarios compliant with runtime evidence; triple gate green (1144/1144 vitest, tsc clean, build clean); `--no-verify` disclosure honest and RED state re-proven. No CRITICAL issues. No F4-caused regressions. Warnings are pre-existing/environmental or process-level and explicitly registered as deferred follow-ups.

## Final-State Snapshot (post-orchestrator launch prompt)

### Commits (4)

| SHA | Type | Subject |
|-----|------|---------|
| `4e18757` | test | `test(checkout): RED tests for friendly payment-intent error mapping` |
| `31431ae` | feat | `feat(checkout): add paymentIntentErrors mapper for friendly Spanish errors` |
| `3546869` | chore | `chore(checkout): export paymentIntentErrors from feature public API` |
| `8e4d9eb` | fix | `fix(checkout): route payment-intent errors through friendly Spanish mapper` |

### Files Changed (6 total, 459 insertions, 30 deletions)

| File | Action | Lines |
|------|--------|-------|
| `src/features/checkout/utils/checkoutPaymentErrors.ts` | NEW | +45 |
| `src/features/checkout/utils/__tests__/checkoutPaymentErrors.test.ts` | NEW | +80 |
| `src/features/checkout/components/CheckoutForm.tsx` | MODIFIED | +15 (lines 69–97) |
| `src/features/checkout/components/__tests__/CheckoutForm.test.tsx` | MODIFIED | +30 |
| `src/features/checkout/index.ts` | MODIFIED | +1 (public export) |
| `tests/e2e/payment-errors.spec.ts` | MODIFIED (Test 1 only) | +20 / −10 |

Kept-green verified byte-identical to main: `checkoutOrderErrors.ts`, `useCreateOrder.ts`, `api.ts`.

### Test Status (final, post-verify)

| Layer | Pass | Notes |
|-------|------|-------|
| Unit | 1144 / 1144 | incl. 18 new mapper cases + 3 new component cases |
| Integration | 12 / 12 | incl. `checkoutOrderErrors.test.ts` 13/13 |
| E2E | 1 + 1 skipped | Test 1 PASSED on chromium (raw text absent, Spanish visible); Test 2 still skipped (F9 deferred) |
| `tsc --noEmit` | exit 0 | clean |
| `npm run build` | exit 0 | 27 static pages, /checkout 37.5 kB, middleware 34.2 kB |

Coverage tooling broken in environment (`test-exclude`/`minimatch` ESM interop crash under `--coverage`); pre-existing, not F4-caused. Per strict-TDD rules this is informational, not a fail.

## Task Completion Reconciliation (W4)

Per the orchestrator launch prompt, the `tasks.md` checkboxes were not ticked by apply (all `[ ]`) — documentation drift only. Substance of all 15 active tasks (A1–A9 RED, B1–B4 GREEN, C1–C2 keep-green) was verified at runtime via:

1. The verify-report.md spec-compliance matrix (5/5 reqs, 9/9 scenarios compliant).
3. The apply-progress observation #1899 (structured RED/GREEN/triangulation evidence per task).
4. Triple gate green (1144/1144 + tsc + build).
5. RED-state re-proven via worktree at commit `4e18757` (worktree failed with `Failed to resolve import "../checkoutPaymentErrors"`).

This is the explicit reconciliation case from the sdd-archive Task Completion Gate (SKILL.md): orchestrator authorization + apply-progress/verify-report proof of completion for every unchecked task.

Deferred follow-ups D1, D2, D3 (registered, not in F4 scope) remain unmarked by design.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `checkout-error-display` | MODIFIED (in-place) | Existing "Friendly Error Mapping for Stripe Codes" requirement extended with a scope-extension note referencing F4. All 4 original requirements preserved verbatim. |
| `checkout-error-display` | APPENDED | 5 new requirements: Payment-Intent Friendly Error Mapping (R1), CheckoutForm Integration (R2), Public API Exposure (R3), Unit Coverage and No-Leak Guarantee (R4), Existing UPSERT Mapping Isolation (R6). |

Canonical spec at `openspec/specs/checkout-error-display/spec.md` now contains **9 requirements** (4 from Slice B + 1 MODIFIED + 5 from F4).

## Carry-Forward Warnings (NOT remediated in F4)

These are documented for the next SDD cycle. None block this archive.

| ID | Class | Surface | Status |
|----|-------|---------|--------|
| W1 | D5 letter deviation | `CheckoutForm.tsx` 2xx-path `.json()` not wrapped; 2xx parse-throw routes via outer catch → `paymentIntentErrors(0, undefined)` → `network_error`. **Behavior-equivalent** to the spec'd wrap; never a raw throw. | Letter-deviation, behavior-correct |
| W2 | D7 register mix | Mapper 4xx copy uses voseo ("Verificá", "intentá"); existing copy in `mapApiError` and `errorMessages.ts` is tuteo ("Verifica", "Intenta"). A user can see both registers on the same alert surface across failure modes. | Cosmetic, candidate for copy pass |
| W3 | e2e intermittent failures | `/tienda` cart-priming step fails intermittently on **main itself** (reproduces on `main@85e2ff9`). Pre-existing harness instability, not F4-caused. | Environmental, separate e2e-infra follow-up |
| W4 | tasks.md checkboxes unticked | Documentation drift only; substance of all 15 tasks verified at runtime via verify-report.md and apply-progress observation #1899. | Reconciled (this archive) |
| W5 | size:exception | 459 lines vs 400 budget. Excess is comments/doc-in-tests. | User-acknowledged |
| W6 | coverage tooling broken | `test-exclude`/`minimatch` brace-expansion ESM interop crash under `--coverage`. | Pre-existing, environmental |
| W7 | **NEWLY OBSERVED** raw-echo leak (F8-class batch) | `src/features/orders/services/requestCancellation.ts:26–35` echoes raw `errorData.message`/`errorData.error` in orders flow. Same AGENT.md:51 violation class as F8. **NOT in F4 scope**. | Register with F8 |

## Deferred Follow-ups (REGISTERED)

These are tracked in `verify-report.md` and registered as separate SDD changes for the next cycle.

| ID | Source | Surface | Priority |
|----|--------|---------|----------|
| **F7** | engram #1890 | BUG-REDIRECT-TIENDA: post-Stripe-checkout redirect goes to `/tienda` instead of `/order-confirmation?orderId=...`. Possible regression of F2 fix. | High (user-facing) |
| **F8** | `useCreateOrder.ts:137–143` catch leak | Order error banner can show raw `error.message`. Verified byte-identical/untouched in this PR. | High (AGENT.md:51 violation) |
| **F8-batch** | `requestCancellation.ts:26–35` raw echo (newly observed in F4 verify, same class as F8) | Orders flow catch leak. | High (AGENT.md:51 violation) |
| **F9** | `payment-errors.spec.ts` Test 2 | Unauthenticated redirect; flakiness/isolation issue. Verified still skipped in F4. | Medium |
| **W4/W7 batch** | voseo/tuteo register alignment + orders flow catch leak | Single copy-pass + orders-flow fix could be combined. | Low (cosmetic) / High (orders leak) |

## AGENT.md Compliance (final)

- Conventional commits: 4/4 ✅; zero Co-Authored-By/AI attribution (grep across all commit bodies: 0 matches) ✅
- `X-Trace-Id` preserved (`CheckoutForm.tsx:74`); no trace-related files touched ✅
- Friendly error mapping via dedicated mapper (AGENT.md:51 violation closed at the payment-intent site) ✅
- Atomic Design: no new components; mapper is a feature utility ✅
- TypeScript: explicit typed signature, typed CheckoutForm changes ✅
- Vitest `--maxWorkers=2` used in all runs ✅
- Screaming Architecture: mapper in `src/features/checkout/utils/` ✅

## `--no-verify` Disclosure (RED commit `4e18757`) — VERIFIED HONEST

Pre-commit hook is `tsc --noEmit` on staged TS files (`.git/hooks/pre-commit`): at the RED commit the dynamic `await import('../checkoutPaymentErrors')` resolves to TS2307 — bypass rationale technically sound. Disclosure documented in RED commit body. None of the 3 subsequent commits mention or require a bypass; branch tip hook-clean (`tsc --noEmit` exit 0).

## Drift (tasks.md vs implementation) — recorded for audit

- **B4**: e2e rewrite landed inside the RED commit (`A9`/`B4` combined) → 4 commits total instead of the 5 planned in tasks group-B commit list. Documented by apply; behaviorally equivalent.
- **A8**: no dedicated runtime import test; module-resolution coverage provided by the compile gate exactly as the design's own test-approach table prescribes ("R3 — Implicit — TypeScript compile"). The third component test is the 400 case per the design's CheckoutForm test list.
- **tasks.md checkboxes**: not ticked — documented as W4 and reconciled above.
- **Size**: 429 insertions + 30 deletions = 459 changed lines vs ~191 estimate (extensive explanatory comments in mapper/tests).

## Key Learnings

1. RED-state observability for dynamic-import test suites is provable via a git worktree at the RED commit without touching the working tree.
2. The repo's e2e cart-priming walk fails intermittently on main itself, so e2e failures must be reproduced against the baseline before blaming a change.
3. The pre-commit hook is a plain tsc type-check, so `--no-verify` disclosures must always name the specific TS error the RED state produces.
4. Coverage tooling can be broken independently of the code under test, making scoped linter and type-check runs the reliable quality evidence.
5. Strict fixed-copy mappers prove no-leak guarantees structurally via void body, making saturated-body tests cheap full-coverage insurance.

## Source-of-Truth Update

The following canonical spec now reflects F4 + Slice B behavior:

- `openspec/specs/checkout-error-display/spec.md` — 9 requirements (4 Slice B + 1 MODIFIED + 5 F4), 184 lines

## SDD Cycle

Complete. F4 has been planned, implemented, verified (PASS WITH WARNINGS), and archived. Ready for the next change in the follow-up cycle (F7, F8, F9 candidates).

## Artifacts Preserved in Archive

- `proposal.md`
- `exploration.md`
- `design.md`
- `tasks.md` (with W4 reconciliation note)
- `specs/checkout-error-display/spec.md` (delta; canonical merged separately)
- `verify-report.md`
- `archive-report.md` (this file)