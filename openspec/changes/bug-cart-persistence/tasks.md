# Tasks: BUG-CART-PERSISTENCE — Persist Cart Across Logout/Login

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150-250 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR with 3 work-unit commits |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Work-Unit Commit Split (single PR)

| Unit | Goal | PR | Test command | Harness | Rollback |
|------|------|----|--------------|---------|----------|
| 1 | Per-user key + remove `clearCart()` from `logout()` | PR 1 | `npx vitest run --maxWorkers=2 src/__tests__/context/CartContext.test.tsx` | `npm run dev` + Strapi at `../e-commerce-relojes-bv-beni-api` | Revert commit; legacy key preserved (cart non-critical) |
| 2 | Legacy migration + guest→login merge | PR 1 | `npx vitest run --maxWorkers=2 src/__tests__/context/CartContext.test.tsx -t "migrate\|merge"` | Same as Unit 1 | Revert commit; per-user key works without migration |
| 3 | Test sweep + quality gates | PR 1 | `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run lint` | Same as Unit 1 | Tests additive only; revert leaves prod intact |

## Phase 1: Foundation (RED tests)

- [x] 1.1 RED: cart survives `user null → 1 → null → 1` roundtrip (`CartContext.test.tsx`, must fail today).
- [x] 1.2 RED: no cross-user leak — User A items invisible to User B (distinct per-user keys).
- [x] 1.3 RED: guest→login merge — max-quantity, dedupe by `id`, guest cart cleared.
- [x] 1.4 RED: legacy key `bv-beni-cart` migrated on first login; legacy removed from storage.
- [x] 1.5 RED: empty/absent legacy key is a no-op (no throw, per-user key unchanged).
- [x] 1.6 RED: hydration re-runs on `user.id` change; `isHydrated` cycles false → true.
- [x] 1.7 RED: payment success still clears cart (regression guard for `useCreateOrder.ts:69`).

## Phase 2: Core Implementation (GREEN)

- [x] 2.1 GREEN: refactor `src/features/cart/context/CartContext.tsx` — replace `CART_STORAGE_KEY` with `bv-beni-cart-${String(userId ?? 'guest')}` template; consume `useAuth().user`; deps `[user?.id]`; add pure `mergeGuestCartInto(user, guest)` (max-quantity, dedupe by `id`); add `migrateLegacyKey(targetKey)` one-shot.
- [x] 2.2 GREEN: edit `src/context/AuthContext.tsx` — remove `clearCart()` call from `logout()` (line 138); preserve fetch, redirect, `setUser(null)`.
- [x] 2.3 Verify: `npx vitest run --maxWorkers=2` exits 0; all Phase 1 RED tests now pass.

## Phase 3: Verification (quality gates)

- [x] 3.1 `npx tsc --noEmit` exits 0.
- [x] 3.2 `npm run lint` exits 0.
- [ ] 3.3 Optional E2E: author `tests/e2e/cart-persistence.spec.ts` using cookie-session pattern from `uxw01-regression-sweep.spec.ts`; `beforeEach` clears localStorage; add → logout → login → assert persisted. (Skipped — outside 400 LOC budget; covered by 7 unit tests + 2 regression guards.)
- [ ] 3.4 Manual smoke per Engram #1626: Strapi (`../e-commerce-relojes-bv-beni-api && npm run develop`) + `npm run dev`; add → logout → login → cart persists. (Deferred to user/operator — requires real Strapi + browser session.)

## Phase 4: Cleanup

- [x] 4.1 Correct `docs/roadmapToProduction.md:98-117` root cause: blame `AuthContext.tsx:138 clearCart()` (not localStorage absence).
- [ ] 4.2 Branch: `frontend/BUG-CART-PERSISTENCE-persist-cart-on-session` (AGENT.md convention). (Deferred — orchestrator/branch-pr skill handles branch creation.)
- [ ] 4.3 Conventional commits only — `fix(cart): persist cart across logout/login via per-user localStorage key`. NO `Co-Authored-By` trailer. (Deferred — orchestrator/branch-pr skill handles commit split.)