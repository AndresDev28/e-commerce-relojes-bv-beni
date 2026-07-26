# Proposal: Slice B (DEBT-05 conductual)

## Why

DEBT-05 = 9 architectural violations. **Slice A** (mechanical) shipped PR #77 on 2026-07-23 (47 files, +48/-51). **Slice B** covers conductual items Slice A deferred: #3 Stripe provider consolidation, #5 silent error swallow, #8 page-interface convention. Source of truth unchanged: `openspec/changes/debt-05-arch-cleanup/{proposal,design,tasks}.md`. Re-verified against `main` @ `73e0f6d`.

## What Changes

**WU-3 — Stripe provider + JSDoc**
- WU-3.1 CREATE `src/app/checkout/__tests__/page.test.tsx`. RED: mock `getStripe`/`Elements`; assert `CheckoutForm` renders without page-level provider.
- WU-3.2 EDIT `src/app/checkout/page.tsx`. Delete Stripe provider imports/state; remove nested `<Elements>`. Singleton flows from `RootLayout → StripeProviderWrapper`. Test 3.1 GREEN.
- WU-3.3 JSDoc above default export of 7 prop-less pages: `src/app/page.tsx`, `carrito/page.tsx`, `favoritos/page.tsx`, `checkout/page.tsx`, `(auth)/login/page.tsx`, `(auth)/registro/page.tsx`, `mi-cuenta/pedidos/page.tsx`.

**WU-4 — Page-level error UI (single source of truth)**
- WU-4.1 Extend checkout page test. RED: mock `CheckoutForm`; `onError(handleStripeError(card_declined).localizedMessage)`; assert page-level `<ErrorMessage>` renders localized Spanish text; raw Stripe text absent.
- WU-4.2 EDIT `src/app/checkout/page.tsx`. Replace silent `handleError = (_error: string) => {}` with `useState` + `handleStripeError` + page-level `<ErrorMessage>`.
- WU-4.3 EDIT `src/features/checkout/components/CheckoutForm.tsx` (~3 lines). When `onError` provided, suppress form's internal `setErrorMessage`/`setErrorSuggestion`.
- WU-4.4 CREATE `src/components/ui/__tests__/ErrorMessage.test.tsx` (smoke render).

## Locked Decisions

- **D1** Page takes over error ownership; form silent. Resolves R1 (UX duplication); WU-4.3 enforces.
- **D2** Single PR, ~150-250 lines, no stacking, no work-unit commits. `orders-services-refactor` precedent (PR #62 → #63) explicitly rejected.
- **D3** `retryHandler.ts` console.log cleanup OUT of scope. 6 diagnostic logs; same family as DEBT-05 #1 but originally deferred.
- **D4** `ErrorMessage.test.tsx` smoke render IN scope. ErrorMessage had 0 tests + 1 caller; now load-bearing.

## Impact

`secure-route-authorization` "friendly error" spirit strengthened (surfaces previously-swallowed error), no API contract change.

**Code**:
- EDIT `src/app/checkout/page.tsx` (WU-3.2, WU-3.3, WU-4.2)
- CREATE `src/app/checkout/__tests__/page.test.tsx` (WU-3.1, WU-4.1)
- EDIT `src/features/checkout/components/CheckoutForm.tsx` ~3 lines (WU-4.3)
- CREATE `src/components/ui/__tests__/ErrorMessage.test.tsx` (WU-4.4)
- EDIT 7 prop-less pages doc-only (WU-3.3)

Baseline 21 failures / 820 passes unchanged.

## Out of Scope

`retryHandler.ts` console.log cleanup (D3); `useCreateOrder`'s `orderError` banner normalization (`src/app/checkout/page.tsx:87-116`, cosmetic, non-blocking); backend changes (none required); JSDoc lint rule (review-time only per original design).

## Risks

- **R1** UX duplication — resolved by D1.
- **R2** Provider-instance drift — low-med, monitored; WU-3.1 RED test is empirical proof.
- **R3** JSDoc review-time only — low, monitored.
- **R4** `retryHandler.ts` console.log debt — resolved by D3.
- **R5** Orphan `openspec/changes/orders-services-refactor/` — non-blocking housekeeping.
- **R6** `ErrorMessage` had 0 tests — resolved by D4.

## Dependencies

Slice A merged (PR #77, 2026-07-23) — satisfied. `StripeProviderWrapper` singleton context verified safe via codegraph. No backend dependency. Test command: `npx vitest run --maxWorkers=2`.

## Sibling Changes

No source-code overlap with `catalog-pagination-load-more-url-sync`, `github-actions-workflows`, or `security-hardening-critical-fixes`. The `orders-services-refactor/` active folder is ORPHAN — flag as housekeeping `rm -rf`.

## Recommended Commit Order

1. **Commit 1: WU-3** — Stripe provider + JSDoc.
2. **Commit 2: WU-4** — Page-level error UI + form suppression + ErrorMessage smoke.

WU-3 is behavior-preserving once RED passes; WU-4 is the UX change. Sequencing WU-3 first lets reviewers land the layout-provider context cleanly before the UX review.

## Success Criteria

- `src/app/checkout/page.tsx` free of `loadStripe`/`Elements`/`<Elements`/`getStripePublishableKey`.
- `src/app/checkout/__tests__/page.test.tsx` exists; WU-3.1 + WU-4.1 pass.
- `src/components/ui/__tests__/ErrorMessage.test.tsx` exists and passes.
- All 7 prop-less pages have JSDoc note above default export.
- `tsc --noEmit` clean; `vitest run --maxWorkers=2` passes new tests; baseline 21/820 unchanged.
- `npm run build` succeeds.
- Manual Stripe test-mode: success path + declined-card shows ONE localized Spanish alert (page-level only).
