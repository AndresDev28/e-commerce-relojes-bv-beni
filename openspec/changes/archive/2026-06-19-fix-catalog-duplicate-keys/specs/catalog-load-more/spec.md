# Delta for Catalog Load More

## ADDED Requirements

### Requirement: Product Deduplication on Accumulation

The system MUST deduplicate accumulated products by ID before state update. Duplicate IDs across pages SHALL be reduced to the first occurrence.

#### Scenario: Duplicate across pages

- GIVEN product ID 42 exists on page 1 and page 2
- WHEN pages are accumulated
- THEN product 42 appears exactly once

#### Scenario: 102-product catalog

- GIVEN 102 products in Strapi
- WHEN all pages load
- THEN the accumulated list contains 102 unique IDs
- AND zero React duplicate-key warnings fire

## MODIFIED Requirements

### Requirement: Paginated Product Fetching

The system MUST fetch products in paginated batches with a stable secondary sort by `id:asc`. The `getProducts()` service MUST use Strapi v4 array syntax (`sort[0]`, `sort[1]`). The default page size SHALL remain 8. Backward compatibility without params MUST be preserved.
(Previously: Sort used a single `sort` key without tiebreaker.)

#### Scenario: Initial load

- GIVEN the user visits `/tienda`
- WHEN the catalog renders
- THEN 8 products load with `sort[0]=id:asc`

#### Scenario: Load more

- GIVEN page 1 is visible
- WHEN the user clicks "Load More"
- THEN page 2 fetches with the same stable sort

#### Scenario: Explicit sort

- GIVEN sort "price-asc" is selected
- WHEN products fetch
- THEN the request contains `sort[0]=price:asc` and `sort[1]=id:asc`

#### Scenario: Backward-compatible call

- GIVEN `getProducts()` is called without params
- WHEN the request executes
- THEN all products return (no pagination, no sort constraints)

## REMOVED Requirements

None.

## RENAMED Requirements

None.

## Acceptance Criteria

1. Zero React duplicate-key warnings on `/tienda` with all 102 products loaded.
2. Strapi requests always include `id:asc` as a tiebreaker.
3. `sort` parameter uses `sort[0]` / `sort[1]` array syntax.

## Test Plan

| Test | File | Change |
|------|------|--------|
| Default tiebreaker | `products-pagination.test.ts` | Assert `sort[0]=id:asc` when no sort given |
| Explicit sort array | `products-pagination.test.ts` | Assert `sort[0]=price:asc` and `sort[1]=id:asc` |
| Dedup behavior | `useProducts.test.ts` (new) | `renderHook` with duplicate IDs across pages |
| Command | `npx vitest run --maxWorkers=2` | Hardware-aware execution rule |

## Out of Scope

- X-Trace-Id refactor.
- API error-mapping refactor.
- `page.tsx` architecture refactor.
- Pre-existing `api.ts` double-fetch bug.
- Price-sort UI changes.
