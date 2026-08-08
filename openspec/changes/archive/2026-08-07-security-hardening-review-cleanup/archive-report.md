# Archive Report: security-hardening-review-cleanup

## Status

**SUCCESS** — Test-only cleanup change archived. Zero blockers, zero critical findings.

## What Was Archived

7 commits on branch `frontend/security-hardening-review-cleanup`:

| SHA | Type | Message |
|---|---|---|
| 75c10ab | test(orders) | remove orphant RequestCancellation.integration.test |
| f625aaa | test(orders) | drop vacuous type-key pin in orders.public-api.test |
| cfd46fc | test(favorites) | cover too_many branch at PUT /api/favorites route |
| 9518e1e | test(favorites) | cover requireUser 502 end-to-end on GET /api/favorites |
| 187d339 | test(favorites) | cover requireUser 502 end-to-end on PUT /api/favorites route |
| fb85de2 | docs(sdd) | include phase artifacts for security-hardening-review-cleanup |
| 07d79fc | docs(sdd) | include verify-report for security-hardening-review-cleanup |

## Findings Closed

- **W3** (orphant test) — deleted `src/features/orders/components/__tests__/RequestCancellation.integration.test.tsx`.
- **R3-no-op-type-pin** — trimmed vacuous third `it` block in `src/lib/api/__tests__/orders.public-api.test.ts:25-30`.
- **R3-too-many-branch-uncovered** — added `[FAV-W-7]` to `src/app/api/favorites/__tests__/route.test.ts` covering the `too_many` branch.
- **R3/R4-requireuser-502-gap** — added 3 cases (GET 502, GET network-throw, PUT 502) to `src/app/api/favorites/__tests__/route.test.ts` mirroring `src/app/api/orders/[orderId]/__tests__/route.test.ts:296-364`.

## Byte-Identical Pins Confirmed

- `'No pudimos verificar tu sesión. Inténtalo de nuevo.'` — matches `src/lib/auth/validate-request.ts:40` byte-for-byte (sha256sum equality).
- `` `La lista de favoritos no puede tener más de ${MAX_FAVORITES} elementos.` `` — matches `src/app/api/favorites/route.ts:54` byte-for-byte.

## Delta Spec Sync

Zero delta specs were created or modified during this change. The new test cases pin EXISTING requirements in `secure-route-authorization` (`JWT Validation in Orders Route`, `Consistent Authorization Errors`) and `api-traceability` (`Trace Id in Route Handlers`, `Trace Id on Errors`). The archive folder contains only the meta `specs/README.md` documenting this zero-delta decision.

`openspec/specs/secure-route-authorization/spec.md` and `openspec/specs/api-traceability/spec.md` are unchanged by this change.

## Verification Outcome

- Verdict: **pass_with_warnings** (per project convention from `security-hardening-critical-fixes` lineage).
- 8/8 tasks verified across 4 phases.
- Vitest baseline: 21 pre-existing jsdom localStorage failures only (17 CartContext + 4 CookieBanner), 0 new regressions.
- `tsc --noEmit`: exit 0.
- `npm run build`: exit 0 (22 routes compiled).
- Byte-identical validation: sha256sum equality confirmed on both pinned Spanish strings.

## Warnings (Non-Blocking)

- **W-1** (GGA headless review not executed in verify sub-agent) — task 4.2 prescribes `gga run --pr-mode --diff-only`; Claude CLI auth env issue blocks it in this environment. Commits are conventional-commit clean with no `Co-Authored-By`. **Action item**: run GGA headless before opening the PR.
- **W-2** (21 pre-existing jsdom localStorage failures) — `CartContext.test.tsx` (17) + `CookieBanner.test.tsx` (4), all `localStorage.clear is not a function`. Pre-date this change, in files never touched by it. **Documented baseline**.
- **DEBT-12** (`gentle-ai bind-sdd` scope-drift defect) — provider-internal. Per the proposal's rollback plan, if `sdd-archive` invoked `bind-sdd` on the parent lineage `review-bf31a670866c326b` and it failed, the lineage is **abandoned, not retried**. **Action item**: track for Gentle AI vendor follow-up.

## Migration

No migration required. This is test-only.

## Rollback

Revert the single PR (7 commits, single branch). DEBT-12 handling: if `gentle-ai review bind-sdd` is invoked on `review-bf31a670866c326b` and fails, abandon the lineage; do NOT retry.

## Next Step for Orchestrator

Push branch `frontend/security-hardening-review-cleanup` to remote, then open PR via `branch-pr` skill (which performs pre-PR checks).
