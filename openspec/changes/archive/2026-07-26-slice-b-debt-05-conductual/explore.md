# Exploration: Slice B (DEBT-05 conductual)

> Follow-up slice for `openspec/changes/debt-05-arch-cleanup/` (Slice A already
> merged via PR #77 on 2026-07-23). Slice B covers the **conductual / behavioral**
> items #3, #5, and #8 from the original DEBT-05 proposal — i.e. the work units
> (`WU-3`, `WU-4`) that require Stripe knowledge, error UX decisions, and new
> tests, and were intentionally deferred from Slice A to keep the mechanical
> move self-contained and reviewable.

## Context

`DEBT-05` is a 9-violation architectural cleanup that the team split into two
slices:

- **Slice A (mechanical)** — git mv, import rewrites, renames, console.log
  removal, comment typos. **DONE.** Two commits landed on `main` via PR #77
  (`9907946`):
  - `0c86a85 chore(debt-05): move src/app/components to src/components and rewrite imports` (WU-1)
  - `5d26614 chore(debt-05): clean console.logs, fix renames, barrel OrderHistory, fix registro typos` (WU-2)
  - Diff stat: **47 files, +48 / -51** — well under 400-line budget. `tsc --noEmit`
    clean; vitest baseline 21 failed / 820 passed unchanged.
- **Slice B (behavioral)** — items #3 (Stripe provider consolidation), #5 (silent
  error swallow), #8 (page interface convention). Tasks `WU-3` and `WU-4` from
  `openspec/changes/debt-05-arch-cleanup/tasks.md` Phase 3 and Phase 4. **PENDING.**

This slice-B change inherits the proposal/design/tasks already on disk under
`openspec/changes/debt-05-arch-cleanup/` (we do NOT duplicate or overwrite
them) and produces a fresh `explore.md` to re-verify Slice B's blast radius
against current `main` (post-#77) before the proposal phase commits to it.

## Current State (verified against `main` @ `73e0f6d`)

### What Slice A landed

| Change | Status | Verification |
|---|---|---|
| `src/app/components/` → `src/components/` move (13 src + 4 stories + 3 co-located tests) | DONE | `rg '@/app/components' src/` = 0 |
| Import rewrites (22 files × 38 occurrences) | DONE | `rg "from '\./components\|from '\.\./components" src/app/` = 0 |
| `vi.mock` path rewrites (2 test files) | DONE | `rg "vi.mock\(['\"]@/app/components" src/` = 0 |
| `console.log` removal in carrito/favoritos | DONE | only API-route logs remain (intentional) |
| `LoginFrom` → `LoginForm` rename | DONE | `rg LoginFrom src/` = 0 |
| `Registerpage` → `RegisterPage` rename | DONE | `rg Registerpage src/` = 0 |
| `OrderHistory` barrel import (mi-cuenta/pedidos) | DONE | `src/app/mi-cuenta/pedidos/page.tsx:4` now `import { OrderHistory } from '@/features/orders'` |
| `(auth)/registro/page.tsx` comment typo fixes | DONE | `rg 'Tarjeta de login\|Sección te branding' src/app/(auth)/registro/` = 0 |

### What Slice B must still cover (verbatim from `tasks.md`)

**WU-3 — Stripe + interfaces**
- 3.1 Create `src/app/checkout/__tests__/page.test.tsx` (GREENFIELD). RED test:
  mock `getStripe`/`Elements`; assert `CheckoutForm` consumes the singleton
  context, not a page-level provider.
- 3.2 Edit `src/app/checkout/page.tsx:17-27, 37, 125`. Delete `loadStripe`,
  `getStripePublishableKey`, `getStripePromise`, `stripePromise`, nested
  `<Elements>`; rely on `RootLayout → StripeProviderWrapper`. Test 3.1 GREEN.
- 3.3 Prepend JSDoc note above default export on 7 prop-less pages (no
  interface per proposal #8): `src/app/page.tsx`, `carrito/page.tsx`,
  `favoritos/page.tsx`, `checkout/page.tsx`, `(auth)/login/page.tsx`,
  `(auth)/registro/page.tsx`, `mi-cuenta/pedidos/page.tsx`.

**WU-4 — Error UI**
- 4.1 Extend `src/app/checkout/__tests__/page.test.tsx`. RED test: mock
  `CheckoutForm` to invoke `onError(localizedMessage)`; assert `ErrorMessage`
  renders mapped text; raw Stripe text absent.
- 4.2 Edit `src/app/checkout/page.tsx:76`. Replace
  `const handleError = (_error: string) => {}` with state setter + render
  `ErrorMessage` from `@/components/ui/ErrorMessage`; reuse `handleStripeError`
  + `errorMessages.ts`.
- 4.3 Verify: `npx tsc --noEmit` + `npx vitest run --maxWorkers=2` +
  `npm run build`; manual Stripe test-mode E2E (success + declined-card).

### Code state for Slice B items (current `main`)

`src/app/checkout/page.tsx` (188 lines, verified):

- **Line 17**: `import { loadStripe } from '@stripe/stripe-js'`
- **Line 19**: `import { Elements } from '@stripe/react-stripe-js'`
- **Line 20**: `import { getStripePublishableKey } from '@/lib/stripe/config'`
- **Lines 22-27**: local `getStripePromise()` calling `loadStripe(...)`
- **Line 37**: `const [stripePromise] = useState(getStripePromise)`
- **Line 76**: `const handleError = (_error: string) => {}` — silent swallow
- **Line 125-132**: `<Elements stripe={stripePromise}><CheckoutForm ... /></Elements>`

`src/components/providers/StripeProviderWrapper.tsx` (verified):

- Already a `'use client'` wrapper, uses singleton `getStripe()` from
  `@/lib/stripe/client`, sets `stripePromise` once in `useEffect`, renders
  `<Elements stripe={stripePromise}>{children}</Elements>`.
- Already mounted by `RootLayout` (verified via explore.md #3 and unchanged in
  Slice A — neither file was touched in PR #77). Removing page-level `<Elements>`
  is safe: `CheckoutForm`'s `useStripe()` / `useElements()` will read from the
  layout provider.

`src/features/checkout/components/CheckoutForm.tsx` (verified):

- Already imports + uses `ErrorMessage` from `@/components/ui/ErrorMessage`
  (line 8, rendered at lines 199-209).
- Already calls `handleStripeError(error)` (line 153) and surfaces the
  localized message internally via `setErrorMessage` (line 154) +
  `setErrorSuggestion` (line 156) before invoking
  `onError?.(processedError.localizedMessage)` (line 157).
- **Implication**: the form already renders a friendly error inline. A page-
  level `ErrorMessage` would be a **second** alert for the same event — UX
  duplication unless we either (a) suppress the form's internal display when
  the page handles it, or (b) decide the page-level banner is the canonical
  surface and remove the form's own one. The proposal/design does NOT pin this
  down. This is a real open question for the proposal phase.

`src/components/ui/ErrorMessage.tsx` (verified):

- Already supports `variant: 'error' | 'warning' | 'info'`,
  `suggestion?: string`, `onDismiss?: () => void` (lines 5-11).
- Already provides `aria-live` + `role="alert"` for the `error` variant (lines
  48-51) — accessibility-ready for Slice B #5 fix.
- **No covering tests** (codegraph flag: 1 caller, 0 tests). Slice B should
  add at least a smoke render test, since Slice B uses it as the surface for
  the previously-swallowed error.

`src/lib/stripe/errorHandler.ts` + `src/lib/stripe/errorMessages.ts`
(verified):

- Already exports `handleStripeError(error)` → `StripeError { localizedMessage,
  suggestion? }`. Codegraph flags `isStripeError` and `STRIPE_ERROR_MESSAGES`
  as uncovered-by-tests. Slice B's RED tests indirectly cover them via
  `CheckoutForm.onError`, but adding direct unit tests is a candidate
  follow-up worth listing (NOT in scope for Slice B itself — defer or not?).

`src/lib/stripe/retryHandler.ts` (verified):

- Contains 6 `console.log` lines (101, 107, 119, 126, 131, 137) — production
  retry diagnostics. Same family as the DEBT-05 #1 `console.log` items that
  were already removed (Slice A). DEBT-05's `out of scope` list explicitly
  deferred "console.warn/error in order-confirmation, tienda, form files
  (diagnostic)" — these retry logs are in the **same "diagnostic" category**.
  Recommend flagging in Slice B's proposal as an opt-in stretch goal, NOT
  pulled in by default (would expand slice scope).

## Affected Areas (Slice B)

| File | Action | Reason |
|---|---|---|
| `src/app/checkout/page.tsx` | EDIT (WU-3.2 + WU-4.2) | Remove `loadStripe`, `getStripePublishableKey`, `getStripePromise`, `stripePromise`, nested `<Elements>`; replace `handleError` with `ErrorMessage` state |
| `src/app/checkout/__tests__/page.test.tsx` | CREATE (WU-3.1 + WU-4.1) | GREENFIELD RED tests for layout-provider binding and error-UI surfacing |
| `src/app/page.tsx` | EDIT (WU-3.3) | Prepend JSDoc note above `Home` default export |
| `src/app/carrito/page.tsx` | EDIT (WU-3.3) | Prepend JSDoc note above `CartPage` default export |
| `src/app/favoritos/page.tsx` | EDIT (WU-3.3) | Prepend JSDoc note above `FavoritesPage` default export |
| `src/app/(auth)/login/page.tsx` | EDIT (WU-3.3) | Prepend JSDoc note above `LoginPage` default export |
| `src/app/(auth)/registro/page.tsx` | EDIT (WU-3.3) | Prepend JSDoc note above `RegisterPage` default export |
| `src/app/mi-cuenta/pedidos/page.tsx` | EDIT (WU-3.3) | Prepend JSDoc note above `OrdersPage` default export |
| `src/app/checkout/page.tsx` | EDIT (WU-3.3) | Prepend JSDoc note above `CheckoutPage` default export (same file as the Stripe edits) |

**No edits to `src/components/`, `src/features/`, `src/lib/`, `src/context/`,
`src/app/layout.tsx`, or `src/components/providers/StripeProviderWrapper.tsx`**
for Slice B. Blast radius is the route layer (`src/app/checkout/page.tsx`) plus
7 doc-only edits on other page files.

### Indirect blast radius (no edits, but Slice B tests touch them)

- `src/features/checkout/components/CheckoutForm.tsx` — only exercised by the
  new test via mocking (`vi.mock`). No code edits.
- `src/components/providers/StripeProviderWrapper.tsx` — only exercised by the
  layout-provider RED test via mocking. No code edits.
- `src/lib/stripe/client.ts` (singleton `getStripe()`) — referenced by the
  layout-provider test. No code edits.

## Cross-Repo Impact

**None.** Slice B is purely a frontend refactor:
- No backend (`../e-commerce-relojes-bv-beni-api/`) contract change.
- No new endpoint, no header change, no response shape change.
- The Stripe singleton (`src/lib/stripe/client.ts`) is already the source of
  truth; we just stop building a second one in the route layer.
- Error mapping reuses the existing `handleStripeError` +
  `STRIPE_ERROR_MESSAGES` — no new copy, no localization change.
- Backend SSOT (`../e-commerce-relojes-bv-beni-api/.agents/rules/bv-beni-watch-store.md`)
  was reviewed for Stripe-related rules; nothing in Slice B contradicts it.

If we later decide to move `handleError` into a telemetry hook (e.g., ship the
mapped error to Sentry with the `X-Trace-Id`), that becomes a new
proposal-level decision — out of scope for Slice B.

## Sibling Changes — Overlap Audit

| Sibling change | Status | Slice B overlap |
|---|---|---|
| `catalog-pagination-load-more-url-sync` | Active, has design/tasks | **Possible conflict** — its `tasks.md` may touch `src/app/tienda/page.tsx` for the Load More wiring. Slice B's WU-3.3 does NOT include `tienda/page.tsx` in its 7-page list (the original proposal listed `tienda/page.tsx:5` `useProducts` barrel bypass as out-of-scope). **No actual conflict**, but the proposal phase should confirm catalog-pagination has shipped before Slice B's PR opens. |
| `github-actions-workflows` | Active, design/tasks | No source-code overlap. CI workflows. Slice B's RED tests will be exercised by whatever test job it adds. |
| `security-hardening-critical-fixes` | Active, has verify-report-pr2 | Likely already merged or near-merge. JWT-in-localStorage, query-param hardening, CSP — none overlap with Stripe/error UI surface. No conflict. |
| `orders-services-refactor/` (active folder at `openspec/changes/orders-services-refactor/`) | **ORPHAN** — already merged via PRs #62 (Slice A) and #63 (Slice B) on 2026-07-15 and archived to `openspec/changes/archive/2026-07-15-orders-services-refactor/`. The unarchived folder is leftover residue. | No code overlap. **Slice B should NOT depend on this folder being cleaned up**, but the proposal phase should flag it as a cleanup task (one `rm -rf` of the active folder). |

## Test Gaps (TDD: Slice B is RED-first on the new checkout test)

| Test file | Current state | Slice B action |
|---|---|---|
| `src/app/checkout/__tests__/page.test.tsx` | **DOES NOT EXIST** — `src/app/checkout/` has only `page.tsx` | CREATE — WU-3.1 + WU-4.1 (both RED-first per `openspec/config.yaml:tdd: true`) |
| `src/components/ui/__tests__/ErrorMessage.test.tsx` | **DOES NOT EXIST** (codegraph flag: 1 caller, 0 tests) | OPTIONAL — Slice B uses `ErrorMessage` as the surface for the previously-swallowed error. A 5-line smoke render test is cheap and would harden the WU-4.1 GREEN. Recommend including. |
| `src/lib/stripe/__tests__/errorMessages.test.ts` | **DOES NOT EXIST** (codegraph flag: 1 caller via `handleStripeError`, 0 tests) | OUT OF SCOPE for Slice B — pre-existing debt, defer to a follow-up. |
| `src/lib/stripe/__tests__/errorHandler.test.ts` | EXISTS (`isRecoverableError` etc.) but `isStripeError` itself is uncovered (codegraph flag). | OUT OF SCOPE — Slice B's new `CheckoutForm.onError` RED test indirectly exercises the path. |
| `src/features/checkout/components/__tests__/CheckoutForm.test.tsx` + `CheckoutForm.retry.test.tsx` | EXIST, cover the form's retry/error paths internally. | UNCHANGED — Slice B mocks `CheckoutForm` from the page test, so existing form tests remain the canonical coverage for the form. |

Pre-existing baseline: 21 failed / 820 passed per the Slice A PR #77 message.
Slice B is NOT expected to move that needle — RED tests must flip to GREEN
before merge, and we must not regress the 21 pre-existing failures.

## Approaches Considered (slice shape only — no solution picked)

| Approach | Pros | Cons | Effort | 400-line budget |
|---|---|---|---|---|
| **A. Single PR** — WU-3 + WU-4 in one branch, one merge commit. | One review cycle; tests + code together; atomic context for the Stripe/error UX story. | Mixes a provider-consolidation change (3.2) with a UX change (4.2); reviewers context-switch between Stripe internals and component-UX code. | M (~150-250 lines) | Safe (~well under 400) |
| **B. Two stacked PRs** — PR-B1: WU-3 (Stripe + JSDoc) stacked on Slice A; PR-B2: WU-4 (error UI) stacked on PR-B1. | Mirrors the precedent set by `orders-services-refactor` Slice A (PR #62) → Slice B (PR #63). Each PR ~100 lines; very reviewable. | Two review cycles; PR-B2's RED test depends on PR-B1's GREEN. | M | Both PRs very safe |
| **C. Single PR with work-unit commits** — one branch, two commits (WU-3 then WU-4). | Single merge but reviewers can read commit-by-commit. | Doesn't match the precedent set by orders-services-refactor (separate branches); arguably weaker review focus. | M | Same as A |

The original DEBT-05 `tasks.md` forecast a `400-line budget risk: Low` and
`Chained PRs recommended: Yes` (with `Chain strategy: pending (orchestrator
must ask)`). That gating decision is for the **proposal phase**, not for
exploration.

## Risks

- **R1 (Medium) — UX duplication**: `CheckoutForm` already renders an inline
  `ErrorMessage` on payment failure (lines 199-209). A page-level
  `ErrorMessage` would be a **second alert for the same Stripe event**. Slice
  B must decide: (a) suppress form-level error when page handles it, (b) move
  the form's own `ErrorMessage` to be controlled by the page, or (c) accept
  duplication. Without a decision, the WU-4.2 RED test would assert one
  alert but UX shows two — tests green, UX wrong.
- **R2 (Low-Medium) — Provider-instance drift**: removing page-level
  `<Elements>` means `CheckoutForm` will now read from `StripeProviderWrapper`'s
  singleton via the layout context. Verified in codegraph: `useStripe` /
  `useElements` already resolve from the nearest provider; layout's provider
  wraps the entire tree. Behavior-preserving. The RED test (3.1) is what
  proves this empirically — without it we ship a guess.
- **R3 (Low) — JSDoc convention enforcement**: WU-3.3 adds JSDoc notes but
  doesn't enforce them. Without a lint rule or a CODEOWNERS check, future
  pages can omit the JSDoc. The proposal/design flagged this as a
  review-time convention, not a build-time one. Acceptable trade-off; flag
  for the proposal phase to acknowledge.
- **R4 (Low) — `console.log` debt in `retryHandler.ts`**: 6 production
  diagnostic logs (lines 101, 107, 119, 126, 131, 137). Same family as the
  DEBT-05 #1 items Slice A cleaned. Original proposal listed these as
  out-of-scope. Recommend the proposal phase either (a) keep them out and
  log this as discovered debt, or (b) pull them in as a single extra commit
  inside Slice B (~6 line deletions). Lean toward (a) to keep Slice B
  focused.
- **R5 (Low) — Orphan `orders-services-refactor/` folder**: active folder is
  residue from a fully-merged change. Slice B does not need to clean it up,
  but the proposal phase should add a one-line "housekeeping" item so the
  repo tree stays clean.
- **R6 (Low) — `ErrorMessage` has no covering tests**: codegraph flags this.
  If Slice B ships an `ErrorMessage`-based error surface as the headline
  fix, adding a smoke render test alongside is cheap insurance.

## Open Questions (for proposal phase to resolve)

1. **Page-level vs. form-level error display** (R1) — who owns the
   user-visible payment-error alert after Slice B? Form already shows one;
   should the page take over, or should the page add a *complementary*
   banner (e.g., with different copy / a "Try a different card" CTA)?
   Proposal must decide before WU-4.1 RED test is written.
2. **Slice shape — single PR vs. stacked (B) vs. commits-only (C)** — the
   original `tasks.md` said `Chain strategy: pending (orchestrator must ask)`.
   The orchestrator should ask the user at the proposal gate.
3. **Should Slice B also include the `retryHandler.ts` `console.log`
   cleanup** (R4)? Recommend keep separate, but user call.
4. **Should Slice B add an `ErrorMessage.test.tsx` smoke render test**
   alongside WU-4 (R6)? Recommend yes; proposal should confirm.
5. **`useCreateOrder`'s `orderError` banner** (page.tsx lines 87-116) renders
   an inline custom block for order-persistence errors, separate from the
   payment-error path. Should Slice B leave it as-is, or normalize it to use
   `ErrorMessage` for visual consistency? Cosmetic; flag for proposal.

## Ready for Proposal

**Yes.** All Slice B work units (`WU-3`, `WU-4`) have been re-verified
against current `main` (post-PR #77). The blast radius is bounded to 1 page
file (`src/app/checkout/page.tsx`) + 1 new test file + 7 JSDoc-only edits on
other pages. Cross-repo impact: none. Test gaps: clear (checkout page test is
greenfield). The proposal phase should:
- Resolve the page-vs-form error-display question (open question 1).
- Ask the user about chained-PR vs. single-PR (open question 2) — recommend
  Option B (stacked PRs) given the precedent set by `orders-services-refactor`
  and Slice A's identical pattern.
- Decide whether to extend scope to `retryHandler` logs and `ErrorMessage`
  tests (questions 3, 4).

## Relevant Files

- `openspec/changes/debt-05-arch-cleanup/proposal.md` — source of truth for
  the 9 violations and Slice A/B split (UNCHANGED)
- `openspec/changes/debt-05-arch-cleanup/design.md` — Stripe ownership,
  error UI, and page-interface architecture decisions (UNCHANGED)
- `openspec/changes/debt-05-arch-cleanup/tasks.md` — WU-3 + WU-4 task
  definitions (UNCHANGED, source of truth for Slice B implementation order)
- `openspec/changes/debt-05-arch-cleanup/explore.md` — original exploration
  with full 9-violation census (UNCHANGED)
- `src/app/checkout/page.tsx` — primary edit target (WU-3.2, WU-3.3, WU-4.2)
- `src/app/checkout/__tests__/page.test.tsx` — CREATE (WU-3.1 + WU-4.1)
- `src/features/checkout/components/CheckoutForm.tsx` — mock target from
  the new test; no edits
- `src/components/providers/StripeProviderWrapper.tsx` — proves layout
  provider already wraps the tree; no edits
- `src/components/ui/ErrorMessage.tsx` — surface for the previously-
  swallowed error; no edits (but possibly add a smoke test)
- `src/lib/stripe/errorHandler.ts` + `errorMessages.ts` — `handleStripeError`
  reused by WU-4.2; no edits
- `openspec/changes/archive/2026-07-15-orders-services-refactor/` — precedent
  for Slice A → Slice B chained-PR pattern (PR #62 → PR #63)
- `openspec/changes/orders-services-refactor/` — orphan folder to clean up
  (housekeeping, not in scope for Slice B code)
