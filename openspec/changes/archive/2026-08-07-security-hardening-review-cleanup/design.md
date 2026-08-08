# Design: Security-Hardening Review Cleanup

## Summary

Test-only strict-TDD cleanup closing four residual WARNING findings from the archived `security-hardening-critical-fixes` lineage. Zero source mutations. Work: delete one orphan integration test, trim one vacuous `it` block, add four favorites route cases that pin existing public Spanish error contracts from `secure-route-authorization` and `api-traceability`.

## Architecture Decisions

### Decision 1 — Mirror the orders-route test pattern for favorites requireUser-502

- **Context**: `src/app/api/orders/[orderId]/__tests__/route.test.ts:296-364` ("Manejo de errores") already covers requireUser→502 end-to-end for orders GET. Favorites route tests never mock `/api/users/me` to return 502 or throw.
- **Decision**: Add 3 cases to `src/app/api/favorites/__tests__/route.test.ts` mirroring that pattern — same `global.fetch` mock shape, same `data.error` assertion, same X-Trace-Id regex from `[FAV-R-1]`.
- **Rationale**: one convention for route-layer auth-failure testing; reviewers learn one pattern.
- **Alternatives considered**: shared helper in `__tests__/helpers/requireUser-error.ts` — rejected; helper would obscure the byte-identical Spanish string pin these tests exist to enforce.

### Decision 2 — Pin `MAX_FAVORITES` via import, never literal

- **Context**: `MAX_FAVORITES = 200` at `src/features/favorites/services/getFavoritesService.ts:4`, re-exported from `src/features/favorites/index.ts`. `[FAV-W-7]` needs an oversized list.
- **Decision**: import `MAX_FAVORITES` and build `MAX_FAVORITES + 1`; never hardcode `201`.
- **Rationale**: test stays robust if the constant changes.
- **Trade-off**: one import line (trivial).

### Decision 3 — Delete the orphan and the vacuous test case rather than fix them

- **Context**: (W3) `RequestCancellation.integration.test.tsx` is stranded (vitest `unit` excludes `*.integration.test.*`; `integration` project does not scan `src/**`). (R3-no-op) third `it` in `orders.public-api.test.ts:25-30` uses `expect(key in module || true).toBe(true)` — vacuous.
- **Decision**: delete both. Do NOT rewrite or move.
- **Rationale**: cancel POST is fully covered at `src/app/api/orders/[orderId]/request-cancellation/__tests__/route.test.ts`. First two `it` blocks (L14-23) are real runtime pins worth keeping; third asserts nothing.
- **Trade-off**: W3 loses modal-UX coverage; deferred to a Storybook interaction story if needed.

### Decision 4 — DEBT-12 is follow-up only, no workaround in this change

- **Context**: `gentle-ai bind-sdd` fails with `scope-changed` when the review base_tree is no longer HEAD~1 (post PR #91/#95).
- **Decision**: abandon-don't-retry rule already in proposal Rollback. No CI workarounds.
- **Rationale**: keeps scope to test cleanup; defect is vendor-side.
- **Trade-off**: future archives of the parent lineage need the same abandon policy if `bind-sdd` stays broken.

## Sequence: RED→GREEN flow

Representative case — GET 502 (`requireUser` non-ok from `/api/users/me`):

```
Test setup
  → mock global.fetch → { ok:false, status:500 } for /api/users/me
  → GET /api/favorites (session cookie set)
    → requireUser sees !ok
    → returns { error: NextResponse 502 + Spanish string + X-Trace-Id }
    → route forwards authResult.error
  → assert status===502
  → assert body.error === 'No pudimos verificar tu sesión. Inténtalo de nuevo.'
  → assert X-Trace-Id matches UUID regex (or echo)

RED:   case missing → not yet asserted (coverage gap)
GREEN: case present → passes against existing route + requireUser (no source change)
```

Same shape for GET network-throw (`mockRejectedValueOnce`) and PUT 502. `[FAV-W-7]` mirrors `[FAV-W-3]` with body `Array(MAX_FAVORITES + 1).fill('id')` and the too_many message from `route.ts:54`.

## Affected Files

| File | Action | Reason |
|---|---|---|
| `src/features/orders/components/__tests__/RequestCancellation.integration.test.tsx` | DELETE | Orphan (155 lines; never runs) |
| `src/lib/api/__tests__/orders.public-api.test.ts` | EDIT (drop L25-30) | Vacuous type-key pin |
| `src/app/api/favorites/__tests__/route.test.ts` | EDIT (+4 cases) | Pin existing route contracts |
| `src/lib/auth/validate-request.ts` | NO TOUCH | Literals referenced only |
| `src/features/favorites/services/updateFavoritesService.ts` | NO TOUCH | Source unchanged |
| `src/features/favorites/services/getFavoritesService.ts` | NO TOUCH | Only `MAX_FAVORITES` imported |
| `src/app/api/favorites/route.ts` | NO TOUCH | Source unchanged |
| `vitest.config.ts` | NO TOUCH | Config unchanged |
| `openspec/specs/secure-route-authorization/spec.md` | NO TOUCH | Spec unchanged |
| `openspec/specs/api-traceability/spec.md` | NO TOUCH | Spec unchanged |

## Interfaces / Contracts

Byte-identical pins (copy-paste from source, never retype):

- `'No pudimos verificar tu sesión. Inténtalo de nuevo.'` — `validate-request.ts:40,58,70,79`
- `` `La lista de favoritos no puede tener más de ${MAX_FAVORITES} elementos.` `` — `route.ts:54`
- `MAX_FAVORITES` import from `@/features/favorites` (or service path); never literal `201`

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary change. Test files only.

## Risk Mitigations

| Risk | Mitigation |
|---|---|
| Spanish string drift | Apply phase must copy-paste literals from source |
| `MAX_FAVORITES` change | Import constant; never `201` |
| DEBT-12 blocks archive | Proposal Rollback: abandon lineage, no retry |
| 21 pre-existing jsdom failures | Baseline unchanged; gate = no new failures/passes |

## Test Plan (Strict TDD RED→GREEN)

1. DELETE `RequestCancellation.integration.test.tsx`.
2. TRIM `orders.public-api.test.ts` L25-30 (keep L14-23).
3. ADD `[FAV-W-7]` (RED write → GREEN against existing PUT validation).
4. ADD GET 502 + GET network-throw + PUT 502 (same RED→GREEN; no source edits).
5. RUN `npx vitest run --maxWorkers=2` — only the 21 pre-existing jsdom localStorage failures remain.
6. RUN `npx tsc --noEmit` (or `npm run build`) — exit 0.

## Migration / Rollout

No migration required. Single PR on `frontend/security-hardening-review-cleanup`. Budget ~120–150 additions + 1 deletion + ~5 trimmed lines; under 400-line review budget.

## Out of Scope

- Cancel-modal Storybook interaction story.
- DEBT-12 CI workaround.
- Any source mutation outside test files.
- Spec deltas (zero-delta confirmed).

## Rollback

- Revert the single PR (1 deletion + 1 trim + 4 cases).
- DEBT-12: if `sdd-archive` re-binds `review-bf31a670866c326b` and `bind-sdd` fails, abandon the lineage; do not retry.

## Open Questions

None.
