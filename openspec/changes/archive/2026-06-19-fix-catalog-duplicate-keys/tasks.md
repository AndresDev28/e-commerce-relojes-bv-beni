# Tasks: Fix Catalog Duplicate Keys

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 80–120 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Stable sort tiebreaker + dedup + tests | PR 1 (single) | All files touch the same concern; well under 400 lines |

## Phase 1: Foundation — Stable Sort Tiebreaker in `api.ts`

- [x] 1.1 Add `id:asc` as default secondary sort in `getProducts()` sort mapping (file: `src/lib/api.ts`)
- [x] 1.2 Change sort query from single `sort` key to Strapi v4 array syntax: `sort[0]=<primary>` and `sort[1]=id:asc` (file: `src/lib/api.ts`)
- [x] 1.3 Verify backward-compatible `getProducts()` without params still returns all products (no sort params added)

## Phase 2: Core — Deduplication Safety Net in `useProducts`

- [x] 2.1 Create `deduplicateById(products: Product[]): Product[]` utility in `src/features/catalog/hooks/useProducts.ts`
- [x] 2.2 Apply `deduplicateById` to `allProducts` before `setProducts()` in the accumulation path (line ~145 in `useProducts.ts`)
- [x] 2.3 Apply `deduplicateById` to `formattedPage1` before `setProducts()` in the page-1 path (line ~117)

## Phase 3: Testing

- [x] 3.1 Add test "default tiebreaker" in `src/lib/api/__tests__/products-pagination.test.ts`: assert URL contains `sort[0]=id:asc` when no sort param given with pagination
- [x] 3.2 Add test "explicit sort array syntax" in `src/lib/api/__tests__/products-pagination.test.ts`: assert URL contains `sort[0]=price:asc` and `sort[1]=id:asc` when `sort: 'price-asc'`
- [x] 3.3 Create `src/features/catalog/hooks/__tests__/useProducts.test.ts` with `renderHook` test: simulate duplicate IDs across pages, assert final products list has unique IDs only
- [x] 3.4 Run `npx vitest run --maxWorkers=2` and verify all tests pass

## Phase 4: Cleanup

- [x] 4.1 Verify no React duplicate-key warnings in browser console on `/tienda` with full catalog load
- [x] 4.2 Confirm existing pagination tests still pass (no regression from sort syntax change)
