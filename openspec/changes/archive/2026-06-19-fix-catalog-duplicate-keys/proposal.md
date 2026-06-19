# Proposal: Fix Catalog Duplicate Keys

## Intent

Fix React duplicate-key warnings and dropped products in `/tienda` caused by unstable Strapi pagination when no explicit sort is provided, combined with missing deduplication in `useProducts`. With 102 watches in the catalog, overlapping pages silently hide items and degrade UX.

## Scope

### In Scope
- Stable Strapi sort tiebreaker in `getProducts` (always emit `sort[0]=id:asc`; append `sort[1]=id:asc` for explicit sorts).
- Replace undocumented comma-separated sort syntax with Strapi v4 array syntax (`sort[0]` / `sort[1]`).
- `deduplicateById` safety net in `useProducts` before `setProducts`.
- Update `products-pagination.test.ts` sort assertions; add `useProducts` dedup unit test.

### Out of Scope
- X-Trace-Id header refactor.
- API error-mapping refactor.
- `page.tsx` architecture refactor.
- Fixing pre-existing `api.ts` double-fetch bug.
- UI changes for price sort (future intent).

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `catalog-load-more`: Paginated fetching must guarantee stable sort order (deterministic page boundaries) and accumulated products must be deduplicated by ID before rendering.

## Approach

Apply a two-layer fix:
1. **Query layer (`api.ts`)**: Ensure `getProducts` always emits a stable secondary sort `id:asc` using Strapi v4 array syntax. When no sort is passed, default to `sort[0]=id:asc`. When a sort is passed, express it as `sort[0]=field:asc&sort[1]=id:asc`.
2. **Accumulation layer (`useProducts`)**: Add a `deduplicateById` step before concatenating new pages into state. This acts as defense-in-depth against any residual pagination drift.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/api.ts` | Modified | Sort query building in `getProducts` — stable tiebreaker + array syntax. |
| `src/features/catalog/hooks/useProducts.ts` | Modified | Product accumulation — add `deduplicateById` safety net. |
| `src/lib/api/__tests__/products-pagination.test.ts` | Modified | Update sort assertions to array syntax; add default tiebreaker test. |
| `src/features/catalog/hooks/__tests__/useProducts.test.ts` | New | Dedup behavior test via `renderHook`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Default catalog order changes from arbitrary to `id:asc` (creation order). | High (intentional) | Confirmed acceptable with user. |
| Strapi v4 ignores array sort syntax and falls back to arbitrary order. | Low | `deduplicateById` safety net still prevents duplicate React keys. |
| Test updates miss a subtle URL encoding difference. | Low | Existing test patterns already cover query string building. |

## Rollback Plan

Revert the dedicated branch or run `git revert` on the merge commit. No database migrations or environment changes involved.

## Dependencies

None.

## Success Criteria

- [ ] Zero React duplicate-key warnings on `/tienda` with all 102 products loaded.
- [ ] Strapi requests always include a stable sort tiebreaker (`id:asc`).
- [ ] `products-pagination.test.ts` passes with updated array-sort assertions.
- [ ] `useProducts` dedup test passes via `renderHook`.
- [ ] Changed lines remain under 400.
