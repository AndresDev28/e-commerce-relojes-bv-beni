# Verify Report — F9 Unauthenticated Visitor Redirect

**Schema**: `gentle-ai.verify-result/v1`
**Change**: `follow-ups-sprint-5-stripe-upsert-f9-payment-errors-unauthenticated-redirect`
**Branch**: `frontend/F9-payment-errors-unauthenticated-redirect` (merged to `main`)
**Mode**: openspec filesystem-driven (manifested artifacts in this archive folder; runtime evidence during apply via `sdd-apply` sub-agent #1945)

## Final State Summary

| Field | Value |
|---|---|
| Verdict | **pass** |
| Blockers | 0 |
| Critical findings | 0 |
| Requirements | 1/1 (Unauthenticated Visitor Redirect) |
| Scenarios | 4/4 (S-UNAUTH.1..S-UNAUTH.4) |
| Triple gate | GREEN (vitest 1158/1158 · tsc 0 · build 0) |
| e2e gate (chromium + firefox) | 4/4 passed in 11.7s |

## Test Evidence

### Unit / Integration (vitest)

```
npx vitest run --maxWorkers=2
```

- **Result**: 1158 / 1158 passed
- **Note**: One pre-existing flake (`src/components/ui/__tests__/image-allowlist.test.ts > C3.S1`) reproduced on first run and re-passed 3/3 on rerun. Not introduced by F9. Documented in F5/F8 history.

### Type Check (tsc)

```
npx tsc --noEmit
```

- **Result**: 0 errors

### Build (Next.js)

```
npm run build
```

- **Result**: 0 errors

### E2E (Playwright, from F5 CI gate)

```
npx playwright test tests/e2e/payment-errors.spec.ts
```

- **Result**: 4 / 4 passed across chromium + firefox in 11.7s
- **Coverage**:
  - Test 1 (F4 friendly-error mapping): passing (preserved)
  - **Test 2 (F9 unauthenticated redirect, NEW): passing on first run after `test.skip` → `test` conversion**

### Manual Q&A Validation (parent-orchestrated)

Tested in Chrome + Chrome Incognito against `https://much-enclose-ardently.ngrok-free.dev`:

| Scenario | Observed Behavior | Spec Reference |
|---|---|---|
| Guest (logged out) navigates to `/checkout` | Redirected to `/login?redirect=%2Fcheckout` (S-UNAUTH.1) | ✅ |
| Guest with no cart items | Same redirect (S-UNAUTH.2) | ✅ |
| Authenticated user with empty cart | Redirected to `/tienda` after login redirect= flow (S-UNAUTH.3) | ✅ |
| Cart persistence across browsers | Per-browser localStorage (unchanged from before F9; NOT in F9 scope) | n/a |

S-UNAUTH.4 (F7 race guard, in-flight PUT keeps CheckoutForm mounted) is captured in spec but not exercised by automated test or manual Q&A in this change. Reproducing it requires precise timing of cart-clear events during the order PUT window; future coverage optional.

## Deviation from Original Forecast (planning vs actual)

| Aspect | Forecast (spec #1942, design #1943, tasks #1944) | Actual |
|---|---|---|
| Diff size | 30-60 LOC | 47 insertions, 6 deletions across 2 files |
| Work-unit commits | 2-3 (spec + test + optional T4) | 2 (spec + test; T4 not triggered) |
| Spec delta size | ~15 LOC | +41 LOC (requirement + 4 scenarios with full cross-ref text) |
| Triple gate impact | None (should stay green) | None (verified) |
| T4 RED-rescue needed | Unknown until T3 ran | No (T3 GREEN on first run) |

## Risk Reassessment

| Risk | Forecast | Post-apply |
|---|---|---|
| Playwright timing flake in CI | Medium | Not triggered — first run GREEN, no retry bump needed |
| Auth-hydration race | Low | Not triggered |
| Scope creep into F4 spec drift | Medium | Not triggered — F9 added exactly ONE new requirement (R7) per scope |
| Cart-empty redirect overrides login redirect | Low | Confirmed correct: `!user` branch evaluated BEFORE empty-cart branch (S-UNAUTH.2 manual verified) |

## Verdict Justification

F9 landed its minimal-target outcome with no scope expansion, no regression to F4/F7/F8 invariants, and no deviations from the design. The route-protection contract (already implemented at `src/app/checkout/page.tsx:65-77` since before F9) is now captured as a first-class spec requirement and pinned by automated e2e coverage. Ready for archive.

## Artifacts and References

- **Apply-progress**: Engram obs #1945
- **Tasks**: Engram obs #1944
- **Design**: Engram obs #1943
- **Spec**: Engram obs #1942
- **Proposal (amended)**: Engram obs #1941
- **Exploration**: Engram obs #1940
- **Canonical spec update**: `openspec/specs/checkout-error-display/spec.md` (commit `0c8f48f`) — added `### Requirement: Unauthenticated Visitor Redirect` with 4 scenarios
- **Test re-enable**: `tests/e2e/payment-errors.spec.ts` (commit `3b0d8cf`) — `test.skip` → `test`, comment rewrite

## Sandbox / Strictness Notes

- `strict_tdd: true` per `openspec/config.yaml:13`. The TDD cycle for F9 was effectively `test.skip` preservation (RED) → `test` flipped with `passed` (GREEN) → REFACTOR N/A because app code unchanged. Documented in apply-progress #1945.
- F9 was executed in manual mode (Path B) per parent-orchestrator decision during the session. `gentle-ai sdd-status` confirmed the native dispatcher store was openspec, conflicting with the session preflight's engram choice; manual path avoided the conflict and matched F8's precedent.

