# Archive Report: Fix Catalog Duplicate Keys

**Change**: fix-catalog-duplicate-keys
**Type**: Bug fix (production blocker)
**Status**: Archived
**Archive date**: 2026-06-19
**Base commit**: `03f206d`
**Head commit**: `d8fc850`
**Artifact store mode**: hybrid (OpenSpec + Engram)

## Outcome

The change was successfully implemented and verified with verdict **PASS WITH WARNINGS**. All 14 implementation tasks were completed, 678/678 unit tests passed, TypeScript and Prettier checks were clean, and the changed-line count (+214/-33) remained well under the 400-line review budget.

The root cause — unstable Strapi pagination combined with missing deduplication in `useProducts` — was fixed at two layers:
1. **Query layer (`src/lib/api.ts`)**: `getProducts()` now always emits a stable `id:asc` tiebreaker using Strapi v4 array syntax (`sort[0]` / `sort[1]`).
2. **Accumulation layer (`src/features/catalog/hooks/useProducts.ts`)**: A `deduplicateById` safety net removes duplicate IDs before state updates.

## Spec Sync

The delta spec for domain `catalog-load-more` was merged into the main spec baseline.

| Domain | Action | Details |
|--------|--------|---------|
| `catalog-load-more` | Updated | 1 requirement added (Product Deduplication on Accumulation), 1 requirement modified (Paginated Product Fetching — stable `id:asc` tiebreaker + Strapi v4 array syntax), 0 removed. |

**Source of truth updated**:
- `openspec/specs/catalog-load-more/spec.md`

## Archive Contents

| Artifact | Path | Status |
|----------|------|--------|
| Exploration | `exploration.md` | ✅ |
| Proposal | `proposal.md` | ✅ |
| Spec delta | `specs/catalog-load-more/spec.md` | ✅ |
| Tasks | `tasks.md` | ✅ (14/14 complete) |
| Verify report | `verify-report.md` | ✅ |
| Archive report | `archive-report.md` | ✅ |

> **Note**: The `apply-progress` artifact exists only in Engram (observation #384); no OpenSpec `apply-progress.md` file was produced.

## Engram Traceability

| Artifact | Observation ID | Topic key |
|----------|----------------|-----------|
| Exploration | #380 | `sdd/fix-catalog-duplicate-keys/explore` |
| Proposal | #381 | `sdd/fix-catalog-duplicate-keys/proposal` |
| Spec | #382 | `sdd/fix-catalog-duplicate-keys/spec` |
| Tasks | #383 | `sdd/fix-catalog-duplicate-keys/tasks` |
| Apply progress | #384 | `sdd/fix-catalog-duplicate-keys/apply-progress` |
| Verify report | #385 | `sdd/fix-catalog-duplicate-keys/verify-report` |
| Archive report | (this report) | `sdd/fix-catalog-duplicate-keys/archive-report` |

## Verification Summary

- **Tasks complete**: 14/14
- **Unit tests**: 678 passed / 0 failed / 0 skipped
- **TypeScript**: `npx tsc --noEmit` passed
- **Prettier**: passed on changed files
- **Verdict**: PASS WITH WARNINGS
- **Warning**: The "zero React duplicate-key warnings with all 102 products" acceptance criterion was met via spec-defined manual browser verification (task 4.1) rather than an automated covering test. The dedup mechanism is unit-tested and the user confirmed the real-world outcome, so the residual risk is low.

## Risks and Follow-Up Recommendations

| Item | Severity | Recommendation |
|------|----------|----------------|
| Manual verification for zero duplicate-key warnings | Low | Consider an automated RTL test that spies on `console.error` for duplicate-key messages when rendering the full catalog. |
| Pre-existing `api.ts` double-fetch bug | Low | Already documented as out-of-scope debt in `exploration.md`. Recommend a focused follow-up SDD change to remove the wasted HTTP request per paginated call. |
| `fetchApi` console.log URL leak | Low | Remove or gate the URL log in `src/lib/api.ts:47` in a future cleanup change. |
| Redundant `sort[0]=id:asc` + `sort[1]=id:asc` when no explicit sort | Very low | Harmless and explicitly tested. Could be cleaned up to emit only one `id:asc` key in the default case. |

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. The main spec baseline now reflects the new stable-sort and deduplication behavior. Ready for the next change.
