# Proposal: Security-Hardening Review Cleanup

## Intent

Closes four residual WARNING findings from the archived `security-hardening-critical-fixes` lineage (`review-bf31a670866c326b`, verified `pass_with_warnings`): an orphan test, a vacuous assertion, an uncovered public-error branch, and an unpinned `requireUser` 502 gap on favorites routes — coverage lies and unpinned public Spanish error strings.

DEBT-12 (`gentle-ai bind-sdd` scope drift) is provider-internal: follow-up only.

## Scope

### In Scope
- Delete orphan `src/features/orders/components/__tests__/RequestCancellation.integration.test.tsx` (W3)
- Trim vacuous third `it` block, `src/lib/api/__tests__/orders.public-api.test.ts:25-30` (R3-no-op-type-pin); keep 14-23
- Add `[FAV-W-7]` `too_many` case to `src/app/api/favorites/__tests__/route.test.ts` (R3-too-many)
- Add 3 cases to same file: GET 502, GET network-throw, PUT 502 (R3/R4-requireuser-502-gap)
- DEBT-12 documented as follow-up only

### Out of Scope
- Source changes (test-only)
- New `openspec/specs/` capability folders
- Cancel-modal Storybook story (deferred)
- DEBT-12 CI workarounds

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None. New cases pin existing requirements in `secure-route-authorization` (`Consistent Authorization Errors`, `JWT Validation in Orders Route`) and `api-traceability` (`Trace Id in Route Handlers`, `Trace Id on Errors`).

## Approach

Test-only strict TDD: RED→GREEN on test files; no source mutations. Delete orphan and vacuous case; add four favorites cases mirroring `src/app/api/orders/[orderId]/__tests__/route.test.ts:296-364`. Pin public strings byte-identical — copy-paste, never retype:

- `'No pudimos verificar tu sesión. Inténtalo de nuevo.'` (from `src/lib/auth/validate-request.ts:40`)
- `` `La lista de favoritos no puede tener más de ${MAX_FAVORITES} elementos.` `` (from `src/app/api/favorites/route.ts:54`)

Import `MAX_FAVORITES` from `src/features/favorites/services/getFavoritesService.ts:4`; never literal `201`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/orders/components/__tests__/RequestCancellation.integration.test.tsx` | Removed | Orphan; redundant vs route test |
| `src/lib/api/__tests__/orders.public-api.test.ts` | Modified | Drop third vacuous `it` block |
| `src/app/api/favorites/__tests__/route.test.ts` | Modified | +4 cases pinning route boundary |
| `openspec/specs/{secure-route-authorization,api-traceability}/spec.md` | None (reference) | Reference only |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Spanish string drift | Low | Copy-paste, do not retype |
| `MAX_FAVORITES` constant change | Low | Import constant; no literal `201` |
| DEBT-12 blocks `sdd-archive` re-bind | Med | Abandon lineage; never retry bind-sdd |
| 21 pre-existing jsdom localStorage failures | Low (carry) | Baseline unchanged |

## Rollback Plan

Revert the single PR (1 deletion + 1 trim + 4 cases). DEBT-12: if `sdd-archive` re-binds lineage `review-bf31a670866c326b` and `bind-sdd` fails again, abandon the lineage; do not retry.

## Dependencies

- Internal only: `MAX_FAVORITES` (see Approach).

## Success Criteria

- [ ] Orphan `RequestCancellation.integration.test.tsx` deleted.
- [ ] `orders.public-api.test.ts`: 2 `it` blocks remain (14-23).
- [ ] Favorites route test gains `[FAV-W-7]`, GET-502, GET-network-throw, PUT-502.
- [ ] `npx vitest run --maxWorkers=2`: only the 21 pre-existing failures remain.
- [ ] `tsc --noEmit` exits 0.
- [ ] Branch `frontend/security-hardening-review-cleanup`; single PR.
- [ ] DEBT-12 documented in Out of Scope + Rollback.
