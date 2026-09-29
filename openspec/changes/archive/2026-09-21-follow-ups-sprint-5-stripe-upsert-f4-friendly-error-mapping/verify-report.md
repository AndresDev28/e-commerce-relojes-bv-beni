
## Verification Report

**Change**: follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping
**Version**: N/A (delta change on `frontend/F4-friendly-error-mapping`, base `main` @ `85e2ff9`)
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 15 active (A1–A9, B1–B4, C1–C2) + 3 deferred (D1–D3) |
| Tasks complete | 15 (verified by runtime evidence + apply-progress obs #1899) |
| Tasks incomplete | 0 |

Note: `tasks.md` checkboxes were not ticked by apply (all `[ ]`) — documentation drift only; substance of all 15 tasks verified in this phase.

### Build & Tests Execution
**Build**: ✅ Passed
```text
npx tsc --noEmit → exit 0 (no output)
npm run build   → exit 0 (27 static pages, /checkout 37.5 kB, middleware 34.2 kB)
```

**Tests**: ✅ 1144 passed / 0 failed / 0 skipped (full `npx vitest run --maxWorkers=2`, exit 0)
```text
92 test files passed (92), 1144 tests, 45–62s
 - incl. checkoutPaymentErrors.test.ts 18/18 (new), CheckoutForm.test.tsx incl. 3 new F4 cases,
   checkoutOrderErrors.test.ts 13/13 (kept-green), image-allowlist + email integration 12/12
```
Pre-existing flake disclosure: 2 of 4 full-suite runs hit exactly ONE unrelated integration flake —
email `order-status-change.integration.test.ts` IT-1 (re-ran clean 12/12) and the
tasks.md-C1-documented `image-allowlist.test.ts C3.S1`. Neither touches checkout code.

**Coverage**: ➖ Not available — coverage tooling is broken in this environment
(`test-exclude`/`minimatch` brace-expansion ESM interop crash under `--coverage`).
Pre-existing tooling issue, not F4-related; per strict-TDD rules this is informational.

**E2E (explicit — outside default triple gate per design risk #2)**:
```text
npx playwright test tests/e2e/payment-errors.spec.ts
Run 1: Test 1 PASSED on chromium (alert contains /servidor de pagos/i —
       STRIPE_ERROR_MESSAGES.api_error — 'Internal Server Error' absent from
       alert AND full body scan); Test 2 skipped (F9). Firefox failed at priming.
Runs 2+: blocked at shared cart-priming step (/tienda stuck on
       "Cargando productos...", product card never visible).
```
Baseline reproduction: `checkout-order-upsert.spec.ts` and `favorites-error-feedback.spec.ts`
fail IDENTICALLY on `main` @ `85e2ff9` (both chromium and firefox), at the same priming
step — the instability is pre-existing and environmental, NOT F4-caused. e2e is not wired
into CI (`ci.yml` runs lint/build/unit only). F4's Test 1 passed its full assertion set at
runtime when the environment coopered.

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| R1 Payment-Intent Friendly Error Mapping | S1.1 500 → api_error, no raw leak | `checkoutPaymentErrors.test.ts > 5xx branch (4 cases)` | ✅ COMPLIANT |
| R1 | S1.2 400 → Spanish validation fallback | `checkoutPaymentErrors.test.ts > 4xx branch (400/401/403/429/418)` | ✅ COMPLIANT |
| R1 | S1.3 status 0 → network_error | `checkoutPaymentErrors.test.ts > network/no-status (0/NaN/undefined/non-number)` | ✅ COMPLIANT |
| R1 | S1.4 parse failure → status-appropriate fallback | `checkoutPaymentErrors.test.ts > parse failure (undefined/null/array/string body)` | ✅ COMPLIANT |
| R2 CheckoutForm Integration | S2.1 500 propagates Spanish through onError, raw absent from DOM | `CheckoutForm.test.tsx > F4 500 case` + `payment-errors.spec.ts Test 1` (chromium, passed) | ✅ COMPLIANT |
| R2 | S2.2 network throw → network_error copy | `CheckoutForm.test.tsx > F4 network case` | ✅ COMPLIANT |
| R3 Public API Exposure | S3.1 import from `@/features/checkout` resolves | `npx tsc --noEmit` exit 0 (compile-time, per design test-approach table) | ✅ COMPLIANT |
| R4 Unit Coverage & No-Leak Guarantee | S4.1 saturated body never leaks raw text | `checkoutPaymentErrors.test.ts > defensive no-leak` (flat+nested shapes covered; spec's literal body has a duplicate `error` key, impossible in a JS object literal — substance fully covered) | ✅ COMPLIANT |
| R6 Existing UPSERT Mapping Isolation | existing checkoutOrderErrors tests untouched | `checkoutOrderErrors.ts` + its tests byte-identical to `main`; 13/13 pass in gate | ✅ COMPLIANT |

**Compliance summary**: 9/9 scenarios compliant (native spec count: 5 `### Requirement:`, 9 `#### Scenario:`; the `### Modified Requirement:` block restates the unchanged Stripe-SDK surface — `handleStripeError` untouched)

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| R1 mapper exists, pure, status-first | ✅ Implemented | `void body` — body never read; 5xx → 4xx → network precedence verified in source |
| R2 integration, `.json()` wrapped, onError | ✅ Implemented | Non-2xx path wraps `.json().catch(() => undefined)`; fetch-throw → `paymentIntentErrors(0, undefined)`; never raw throw |
| R3 barrel export | ✅ Implemented | `src/features/checkout/index.ts` line 8 |
| R4 no-leak unit coverage | ✅ Implemented | 18 unit cases incl. saturated defensive case |
| R5 (`onError` R7 signature) | ✅ Implemented | `CheckoutForm.tsx:28` `(localizedMessage: string) => void` unchanged; compile gate green |
| R6 UPSERT isolation | ✅ Implemented | `checkoutOrderErrors.ts`, `useCreateOrder.ts`, `api.ts` byte-identical to `main` |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 strict fixed copy, no passthrough | ✅ Yes | Mapper never reads `body.error`/`body.message`/`body.error.message` |
| D2 mapper home `features/checkout/utils/` | ✅ Yes | |
| D3 no reuse of `checkoutOrderErrors` | ✅ Yes | Byte-identical to main |
| D4 no reuse of `mapApiError` | ✅ Yes | Not imported by CheckoutForm; `api.ts` untouched |
| D5 wrap BOTH `.json()` calls | ⚠️ Partial | Only the non-2xx `.json()` is wrapped. A 2xx parse-throw routes via the outer `catch` → `paymentIntentErrors(0, undefined)` → `network_error` — same user-visible copy the design's wrap would yield for a 2xx (status outside 4xx/5xx → network fallback); never a raw throw. Letter of D5 deviated, behavior equivalent. |
| D6 status-first precedence | ✅ Yes | 5xx checked before 4xx before network fallback |
| D7 neutral copy register | ⚠️ Partial | Mapper matches design table verbatim, but design's claim of consistency with existing copy is inaccurate: `mapApiError`/`errorMessages.ts` use tuteo ("Verifica", "Intenta") while the new 4xx copy is voseo ("Verificá", "intentá") — mixed register can appear on the same alert surface across failure modes |
| D8 R7 signature unchanged | ✅ Yes | |
| D9 e2e priming mirrors upsert spec | ✅ Yes | Same walk/selectors/timeouts as `checkout-order-upsert.spec.ts:113–140` |

### AGENT.md Compliance
- Conventional commits: 4/4 ✅; zero Co-Authored-By/AI attribution (grep across all commit bodies: 0 matches) ✅
- `X-Trace-Id` preserved (`CheckoutForm.tsx:74`); no trace-related files touched ✅
- Friendly error mapping via dedicated mapper (AGENT.md:51 violation closed at the payment-intent site) ✅
- Atomic Design: no new components; mapper is a feature utility ✅
- TypeScript: explicit typed signature, typed CheckoutForm changes ✅
- Vitest `--maxWorkers=2` used in all runs ✅
- Screaming Architecture: mapper in `src/features/checkout/utils/` ✅

### `--no-verify` Disclosure (RED commit `4e18757`) — VERIFIED HONEST
- Pre-commit hook is `tsc --noEmit` on staged TS files (`.git/hooks/pre-commit`): at the RED commit the dynamic `await import('../checkoutPaymentErrors')` resolves to TS2307 — bypass rationale is technically sound.
- Disclosure documented in the RED commit body; none of the 3 subsequent commits (`31431ae`, `3546869`, `8e4d9eb`) mention or require a bypass, and the branch tip is hook-clean (`tsc --noEmit` exit 0).
- RED state observability re-proven in this phase: worktree at `4e18757`, suite fails with `Failed to resolve import "../checkoutPaymentErrors"`. Canonical RED.

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | apply-progress obs #1899 (structured RED/GREEN/triangulation evidence per task) |
| All tasks have tests | ✅ | 22 new tests: 18 unit + 3 component + 1 e2e |
| RED confirmed (tests exist) | ✅ | All test files present; RED failure re-proven at `4e18757` via worktree |
| GREEN confirmed (tests pass) | ✅ | 18+3 pass in full gate; e2e Test 1 passed on chromium (run 1) |
| Triangulation adequate | ✅ | 5 branches × multiple body shapes/statuses; 3 component paths |
| Safety Net for modified files | ✅ | Existing CheckoutForm (19+7), checkoutOrderErrors (13), page tests all green |

**TDD Compliance**: 6/6 checks passed

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 18 | 1 | vitest |
| Integration (component) | 3 | 1 | vitest + RTL |
| E2E | 1 (+1 skipped F9) | 1 | Playwright (chromium ✓, firefox pre-existing env failure) |
| **Total new** | **22** | **3** | |

### Changed File Coverage
Coverage analysis skipped — coverage tooling broken in this environment (test-exclude/minimatch ESM interop crash). Not a failure; informational per strict-TDD rules.

### Assertion Quality
All 22 new assertions verify real behavior (value equality against `STRIPE_ERROR_MESSAGES` constants, `not.toContain` leak guards, DOM-level alert assertions with full-body raw-text scan in e2e). The 5xx-range test iterates a literal non-empty array (not a ghost loop). Component tests assert the `onError` callback VALUE — that is the R2 contract.

**Assertion quality**: ✅ All assertions verify real behavior (0 CRITICAL, 0 WARNING)

### Quality Metrics
**Linter**: ✅ No errors on changed files (eslint exit 0; 2 ignore-pattern warnings on test files only)
**Type Checker**: ✅ No errors (`tsc --noEmit` exit 0)

### File-by-File Scope Check (design vs actual diff)
| File | Expected | Actual |
|------|----------|--------|
| `src/features/checkout/utils/checkoutPaymentErrors.ts` | NEW ~45 lines | NEW, 87 lines (incl. doc comments) ✅ |
| `src/features/checkout/utils/__tests__/checkoutPaymentErrors.test.ts` | NEW ~80 lines | NEW, 191 lines ✅ |
| `src/features/checkout/components/CheckoutForm.tsx` | modify lines 69–97 | modified, +26/−8 ✅ |
| `src/features/checkout/components/__tests__/CheckoutForm.test.tsx` | modify | +93 lines (3 new cases) ✅ |
| `src/features/checkout/index.ts` | modify, 1 line | +1 line ✅ |
| `tests/e2e/payment-errors.spec.ts` | modify Test 1 only | Test 1 un-skipped + rewritten; Test 2 still skipped ✅ |
| Anything else | untouched | `checkoutOrderErrors.ts`, `useCreateOrder.ts`, `api.ts` byte-identical to main ✅ |

No scope creep: F7/F8/F9 surfaces untouched (verified).

### Drift (tasks.md vs implementation)
- **B4**: e2e rewrite landed inside the RED commit (`A9`/`B4` combined) → 4 commits total instead of the 5 planned in tasks group-B commit list. Documented by apply; behaviorally equivalent.
- **A8**: no dedicated runtime import test; module-resolution coverage provided by the compile gate exactly as the design's own test-approach table prescribes ("R3 — Implicit — TypeScript compile"). The third component test is the 400 case per the design's CheckoutForm test list.
- **tasks.md checkboxes**: not ticked (documentation drift; substance complete).
- **Size**: 429 insertions + 30 deletions = 459 changed lines vs ~191 estimate (extensive explanatory comments in mapper/tests).

### Issues Found
**CRITICAL**: None

**WARNING**:
1. **Review budget exceeded**: 459 changed lines vs the 400-line review-workload guard (delivery strategy `single-pr` was sized for ~191 lines). Excess is comments/doc-in-tests, but the orchestrator must either accept `size:exception` or request a comment-trim pass before PR review.
2. **e2e harness environmental instability (pre-existing)**: intermittent `/tienda` products-never-load breaks ALL cart-priming e2e specs (F4 Test 1, checkout-order-upsert, favorites-error-feedback) on both branch AND `main` @ `85e2ff9`, chromium and firefox. Not F4-caused; F4's Test 1 passed its full assertion set when the environment coopered. Recommend a dedicated e2e-infra follow-up.
3. **D5 letter deviation**: 2xx-path `.json()` not wrapped (routes via outer catch → identical user-visible copy). Consider wrapping for spec-letter fidelity in a later cleanup.
4. **Pre-existing integration flakes** observed (email IT-1; image-allowlist C3.S1 — the latter already documented in tasks.md C1). Both re-ran green.
5. **tasks.md checkboxes not updated** by apply.

**SUGGESTION**:
1. **D7 register mix**: new mapper voseo ("Verificá/intentá/tenés/Iniciá/Esperá") vs existing tuteo copy ("Verifica/Intenta" in `mapApiError`, `errorMessages.ts`) — a user can see both registers on the same alert surface across failure modes. Consider harmonizing in a copy pass.
2. Missing EOF newline in `checkoutPaymentErrors.ts` and `payment-errors.spec.ts`.
3. **Newly observed leak (out of scope, orders flow)**: `src/features/orders/services/requestCancellation.ts:26–35` echoes raw `errorData.message`/`errorData.error` into a thrown Error — same AGENT.md:51 violation class as F4/F8. Recommend registering alongside F8-class follow-ups.

### Deferred Follow-ups (tracked — NOT in F4 scope)
- **F7 — BUG-REDIRECT-TIENDA** (engram #1890): post-Stripe-checkout redirect goes to `/tienda` instead of `/order-confirmation?orderId=...`. Possible regression of the F2 fix; flagged in roadmap. Out of this PR scope.
- **F8 — `useCreateOrder.ts:137–143` catch leak**: order error banner can show raw `error.message`. Verified byte-identical/untouched in this PR; must be fixed in its own ticket.
- **F9 — `payment-errors.spec.ts` Test 2** (unauthenticated redirect): verified still skipped (flakiness/isolation issue); out of scope.
- (New observation from this phase, same class as F8: `requestCancellation.ts:26–35` raw echo — candidate for the next follow-up batch.)

### Verdict
**PASS WITH WARNINGS**
All 5 requirements / 9 scenarios compliant with runtime evidence; triple gate green (1144/1144, tsc clean, build clean); `--no-verify` disclosure honest and RED state re-proven; no F4-caused regressions. Warnings are pre-existing/environmental (e2e infra, integration flakes) or process-level (budget overshoot at 459 lines, D5 letter deviation, unticked checkboxes) — none block archive, but the review-budget decision (accept `size:exception` vs trim) belongs to the orchestrator.

## Key Learnings

1. RED-state observability for dynamic-import test suites is provable via a git worktree at the RED commit without touching the working tree.
2. The repo's e2e cart-priming walk fails intermittently on main itself, so e2e failures must be reproduced against the baseline before blaming a change.
3. The pre-commit hook is a plain tsc type-check, so --no-verify disclosures must always name the specific TS error the RED state produces.
4. Coverage tooling can be broken independently of the code under test, making scoped linter and type-check runs the reliable quality evidence.
5. Strict fixed-copy mappers prove no-leak guarantees structurally via void body, making saturated-body tests cheap full-coverage insurance.
