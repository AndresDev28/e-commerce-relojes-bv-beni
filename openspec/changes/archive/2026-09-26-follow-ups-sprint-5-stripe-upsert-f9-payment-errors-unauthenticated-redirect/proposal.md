# Proposal: F9 — Re-enable payment-errors Test 2 (unauthenticated redirect)

> **AMENDMENT** (post parent-confirm). Original decision was test-only; user confirmed "Test + spec delta" so this proposal now includes an ADDED requirement to the existing `checkout-error-display` capability. Same scope in spirit; one extra artifact (sdd-spec).

## Intent

Convert the deferred F4 candidate `tests/e2e/payment-errors.spec.ts` Test 2 (`test.skip`) into a live CI gate that asserts an unauthenticated GET `/checkout` redirects to `/login`. Capture the underlying route-protection contract formally in the `checkout-error-display` capability as an ADDED requirement so future specs reference it instead of leaving it implicit in a page-level effect comment.

## Scope

### In Scope

- Remove `test.skip` from `tests/e2e/payment-errors.spec.ts` Test 2.
- Add ADDED requirement "Unauthenticated Visitor Redirect" to `openspec/specs/checkout-error-display/spec.md` documenting the route-protection contract (sdd-spec artifact).
- Run Test 2 locally + in CI.
- IF Test 2 fails RED: iterate via strict TDD on the same branch (e.g. tighten the assertion with `waitForURL(/.*\\/login/)`, fix any race in `src/app/checkout/page.tsx:65-77`, or bump `playwright.config.ts` retries from 1 to 2 if F5-class CI flake surfaces). Stay under the 400-line budget per work-unit commit.
- Land via a single PR `frontend/F9-payment-errors-unauthenticated-redirect` -> main.

### Out of Scope

- **F4 spec drift reconciliation**: `openspec/specs/checkout-error-display/spec.md` is missing the six ADDED requirements from F4 (R1 Payment-Intent Friendly Mapper, R2 CheckoutForm Integration, R3 Public API Exposure, R4 Unit Coverage and No-Leak Guarantee, R5 onError Contract Preserved, R6 UPSERT Mapper Isolation). Tracked separately. F9 only adds ONE new requirement to this same capability.
- `withRetry` extraction to `src/lib/http/withRetry.ts` — deferred until a second checkout flow needs the same retry contract.
- `src/components/ProtectedRoute.tsx` refactor — wrong redirect target (`/` instead of `/login`); not aligned with the inline pattern in `checkout/page.tsx`.
- Backend `/api/auth/session` behaviour changes — backend SSOT is `../e-commerce-relojes-bv-beni-api/` and is out of F9's frontend-only scope.

## Capabilities

### New Capabilities

None — F9 adds a requirement to an existing capability; it does not introduce a new capability section.

### Modified Capabilities

- **`checkout-error-display`**: ADD a new requirement capturing the route-protection contract. Delta spec to be authored in `openspec/changes/follow-ups-sprint-5-stripe-upsert-f9-payment-errors-unauthenticated-redirect/specs/checkout-error-display/spec.md` and synchronized at archive time.

The new requirement will read approximately:

> **Requirement: Unauthenticated Visitor Redirect.** When an unauthenticated visitor navigates to `/checkout`, the page MUST redirect them to `/login?redirect=<encoded current path>` before any checkout UI renders. The redirect MUST fire after `useAuth()` resolves (`!isLoading`) and after cart hydration (`isHydrated`); the unauthenticated path MUST win over the empty-cart redirect to `/tienda`.

Test 2 of `tests/e2e/payment-errors.spec.ts` asserts this requirement.

## Approach

Single PR on `frontend/F9-payment-errors-unauthenticated-redirect`, two work-unit commits:

1. **Commit 1 — spec delta only** (no app/test change yet): `docs(openspec): add Unauthenticated Visitor Redirect requirement to checkout-error-display`. Adds the ADDED requirement to canonical `openspec/specs/checkout-error-display/spec.md` and to the delta spec. Pure documentation; triple gate stays green with no functional change.

2. **Commit 2 — implement + test** (RED → GREEN in one go because the app code already satisfies the new requirement per `src/app/checkout/page.tsx:65-77`):
   - RED confirmation: run `npm run test:e2e -- payment-errors.spec.ts` locally with the current `test.skip`. Verify Test 2 reports `skipped`.
   - Edit: change `test.skip(...)` to `test(...)` on line 68 of `tests/e2e/payment-errors.spec.ts`.
   - GREEN: run `npm run test:e2e -- payment-errors.spec.ts`. If Test 2 passes, commit `test(checkout): re-enable Test 2 unauthenticated redirect` and push.
   - IF RED: iterate (see Risks below).

3. **Triple gate**: `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build` plus `npm run test:e2e`.

4. **PR body**: documents commit 1 (spec delta) and commit 2 (test re-enable), explicitly calls out the F4 spec drift deferred scope, lists optional CI-retry bump if applied.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `openspec/specs/checkout-error-display/spec.md` | Modified | ADDED requirement for Unauthenticated Visitor Redirect (commit 1) |
| `openspec/changes/<change>/specs/checkout-error-display/spec.md` | New | Delta spec materializing the ADDED requirement (per openspec convention) |
| `tests/e2e/payment-errors.spec.ts` | Modified | Test 2 `test.skip` -> `test` on line 68 (commit 2); possibly tighten assertion on iteration |
| `src/app/checkout/page.tsx` | Possibly modified | Auth redirect effect on lines 65-77, ONLY if RED iteration requires it |
| `playwright.config.ts` | Possibly modified | CI retry bump (1 -> 2), ONLY if F5-class flake surfaces |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Playwright timing flake on first CI run | Medium | Bump `playwright.config.ts` retries 1 -> 2; document in apply-progress (F5 precedent) |
| Auth-hydration race in `useEffect` | Low | The existing `if (authLoading || !isHydrated) return` guard already serializes; only fix if RED proves otherwise |
| Scope creep into F4 spec drift | Medium | Explicitly listed Out of Scope; sdd-tasks and sdd-apply must enforce |
| Cart-empty redirect overrides login redirect | Low | The `!user` branch is checked FIRST in the effect at line 68; unauthenticated always wins. No contention. |
| Spec delta inflates the review budget unnecessarily | Low | Spec delta is documentation only (~10-15 LOC); well under the 400-line budget |

## Rollback Plan

Revert the two work-unit commits on `frontend/F9-payment-errors-unauthenticated-redirect` and run `git revert <sha1> <sha2>` if a CI flake regression is introduced. Behaviour remains unchanged because Test 2 was skipped before. Worst case: re-add `test.skip` and the CI behaviour returns to the pre-F9 baseline; the new spec requirement remains valid as future intent.

## Dependencies

- Strict TDD mode (`strict_tdd: true` in `openspec/config.yaml`) governs apply/verify phases. RED before GREEN before REFACTOR.
- F5's e2e CI gate (`.github/workflows/ci.yml` running `npm run test:e2e`) covers the Test 2 assertion automatically — no CI wiring required.
- F8's retry logic is unrelated (Test 2 fires before payment-intent fetch and so never reaches `useCreateOrder`).

## Success Criteria

- [ ] `tests/e2e/payment-errors.spec.ts` Test 2 reports `passed` (not `skipped`) under `npm run test:e2e`.
- [ ] Test 1 (F4's friendly-error mapping) remains passing.
- [ ] Triple gate stays green: `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build`.
- [ ] Canonical `openspec/specs/checkout-error-display/spec.md` includes the new ADDED requirement.
- [ ] Single PR merged to `main` with diff <= ~50 LOC (spec + test combined, well under the 400-line budget).
- [ ] No additional capability change to `checkout-error-display`; only ONE new requirement added (R7 Unauthenticated Visitor Redirect).
- [ ] F4 spec drift (R1-R6 missing) stays deferred and is NOT touched by this PR.
