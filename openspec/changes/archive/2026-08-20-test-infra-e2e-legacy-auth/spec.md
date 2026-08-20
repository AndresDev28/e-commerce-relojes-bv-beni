# Spec: test-infra-e2e-legacy-auth (TEST-INFRA-E2E-LEGACY-AUTH)

> Change-level spec summary. The full delta lives at `specs/test-infra-cookie-session/spec.md`.

## What this change does

Close the 14 remaining e2e failure events surfaced after the `TEST-INFRA-E2E` archive (#1612). Six e2e specs still mock legacy `localStorage.setItem('jwt', token)` + `**/api/users/me` patterns from the pre-cookie-session era, but the production app migrated to `/api/auth/session` (cookie model, #session-management). One fix pattern closes all 14 events without touching production code.

**Strict TDD enabled** (#1221). T0 RED → T2/T3 GREEN → T4 SWEEP.

## Capability changes

| Capability | Action | Reason |
|---|---|---|
| `test-infra-cookie-session` | NEW (7 Requirements, 14 Scenarios) | Codify cookie-session mock conventions for e2e specs; preserve vitest/storybook/invariant gates; lock out the 1 chromium-only flake as documented followup |

| Capability | Action |
|---|---|
| (none) | MODIFIED |
| (none) | REMOVED |
| (none) | RENAMED |

## Relationship to canonical spec

No canonical `openspec/specs/test-infra-cookie-session/spec.md` exists yet. The archive step (`sdd-archive`) will:

1. Create `openspec/specs/test-infra-cookie-session/spec.md` from the `## ADDED Requirements` block of `specs/test-infra-cookie-session/spec.md`.
2. Promote the 7 Requirements + 14 Scenarios into the canonical spec with no edits (the change is purely additive).
3. Leave all other canonical specs untouched (capability delta = 0 for production domains).

Final canonical state: new `test-infra-cookie-session` domain added to the main specs index.

## Delivery strategy

ONE PR (single atomic squash-merge). All 6 spec edits are reversible; net ~30 LOC, well within the 400-line review budget. No chained PRs needed.

| Bucket | Specs | Edits |
|---|---|---|
| A | `cancellation-flow`, `empty-states` (2 tests), `order-tracking` | pure swap (~5 LOC each) |
| A' | `payment-errors` | swap + test-2 `page.unroute('**/api/auth/session')` |
| B | `checkout-happy-path`, `checkout-mobile` | login + session route mocks (~10 LOC each) |
| X | `favorites-auth-prompt-a11y`, `favorites-anonymous-access` | ZERO diff — inert mocks left as-is (A2) |

Branch: `frontend/TEST-INFRA-E2E-LEGACY-AUTH-modernize-auth-mocks`. Conventional commit: `fix(test): modernize auth mocks in legacy specs (cookie-session)`. No AI co-author tags.

## Out of scope (locked decisions)

- `favorites-auth-prompt-a11y.spec.ts` + `favorites-anonymous-access.spec.ts` — currently passing; inert `/api/users/me → 401` mocks left untouched (A2).
- `uxw01 TC-15` chromium-only `networkidle` timeout (1 baseline deviation event) — separate root cause; named followup `BUG-E2E-UXW01-CHROMIUM-FLAKE` (A3). The 1 extra event does NOT count against the 14-event closure target.
- Production code changes — capability delta = 0; diff on `main` for `src/`, `next.config.*`, `middleware.*`, `package.json` MUST be empty.
- SUG-2/SUG-3, BUG-IMAGES-NO-TEST, mock filter support, prettier hygiene, integration suite — carry from #1612.
- Sprint 4: BUG-CART-PERSISTENCE, BUG-FAVORITES-400, BUG-IMAGES-400.

## Next step

Ready for `sdd-design`. The design phase should confirm the Bucket B dual-mock pattern (A1) and lock the T0 RED → T2/T3 GREEN TDD cadence before apply.
