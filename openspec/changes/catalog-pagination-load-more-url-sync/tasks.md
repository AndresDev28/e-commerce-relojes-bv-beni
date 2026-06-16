# Tasks: Catalog Pagination / Load More with URL Sync

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250–350 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Foundation — Types and API Layer

- [x] 1.1 Add `PaginationMeta`, `GetProductsParams`, and `ProductsResponse` interfaces to `src/types/index.ts`
- [x] 1.2 Add overload signatures to `getProducts()` in `src/lib/api.ts`: no-args returns `StrapiProduct[]`, params returns `ProductsResponse`
- [x] 1.3 Implement param-to-Strapi-query mapping in `getProducts(params)`: `pagination[page]`, `pagination[pageSize]`, `filters[category][slug][$eq]`, `sort` with colon syntax (`price:asc`)
- [x] 1.4 Write unit tests in `src/lib/api/__tests__/products-pagination.test.ts` verifying query string generation for each param combo (spec: Paginated Product Fetching — backward-compatible scenario)

## Phase 2: Core — useProducts Hook

- [x] 2.1 Rewrite `src/features/catalog/hooks/useProducts.ts`: read `page`, `category`, `sort` from `useSearchParams`, fetch page 1 on mount with `pageSize=8`
- [x] 2.2 Implement `loadMore()` function: increments page via `router.push`, fetches next page, appends products to accumulated state
- [x] 2.3 Implement parallel fetch on refresh: when `?page=N` in URL, `Promise.all` fetch pages 1..N, accumulate all products (spec: Refresh restores view)
- [x] 2.4 Implement filter reset: detect `category`/`sort` change from URL, clear accumulated products, fetch page 1 (spec: Category change resets pagination)
- [x] 2.5 Compute `hasMore` from `pagination.pageCount` and current page; expose `{ products, pagination, isLoading, hasMore, loadMore }`
- [x] 2.6 Write unit tests in `src/features/catalog/hooks/__tests__/useProducts.test.tsx`: accumulation, reset on filter change, `hasMore` calculation (spec scenarios: Load more, Category reset)

## Phase 3: Integration — UI Wiring

- [x] 3.1 Modify `ShopLoopHead.tsx`: add `useSearchParams`/`useRouter`/`usePathname`, call `router.replace` with `?page=1&category=slug&sort=value` on category/sort change instead of callbacks
- [x] 3.2 Update `ShopLoopHead` props: remove `onCategoryChange`/`onSortChange`, accept `categories` as `{ name, slug }[]` from API
- [x] 3.3 Rewrite `src/app/tienda/page.tsx`: replace `useState`/`useEffect`/`useMemo` with `useProducts()` hook, wrap grid in `Suspense` for loading state
- [x] 3.4 Add "Load More" button below grid in `page.tsx`: calls `loadMore()`, hidden when `!hasMore`, disabled while `isLoading` (spec: Load more products)
- [x] 3.5 Add `aspect-ratio` CSS to grid items in `page.tsx` to prevent CLS on append (spec: No layout shift on append)
- [x] 3.6 Export `useProducts` from `src/features/catalog/index.ts`
- [x] 3.7 Update `OrderHistory.tsx`: import `PaginationMeta` from `@/types` instead of local interface (cleanup, no-op rename)

## Phase 4: Testing and Verification

- [ ] 4.1 Write integration test in `src/app/tienda/__tests__/page.integration.test.tsx`: render with `?page=2&category=deportivo`, assert 16 products rendered, Load More visible (spec: Refresh restores view)
- [ ] 4.2 Write component test for `ShopLoopHead`: mock `useRouter`, verify `router.replace` called with correct params on category click (spec: Shareable filtered URL)
- [x] 4.3 Run `npm test -- --maxWorkers=2` — all existing tests pass, new tests green
- [x] 4.4 Run `npm run build` — no TypeScript errors, no lint violations
