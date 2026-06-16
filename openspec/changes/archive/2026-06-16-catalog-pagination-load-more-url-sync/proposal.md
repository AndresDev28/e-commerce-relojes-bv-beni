# Proposal: Catalog Pagination / Load More with URL Sync

## Intent

Reduce initial page weight and improve catalog UX by paginating the product grid via a "Load More" button. Synchronize page, category, and sort state to the URL so filters survive refreshes and are shareable.

## Scope

### In Scope
- Paginated product fetching via Strapi (`page`, `pageSize`)
- "Load More" button appending batches to the grid
- URL sync for `page`, `category`, `sort`
- Category/sort changes reset accumulated items to page 1
- Backward-compatible `getProducts()` defaults

### Out of Scope
- Infinite scroll (Intersection Observer)
- Server Component conversion of `/tienda/page.tsx`
- Pagination for homepage or other pages

## Capabilities

### New Capabilities
- `catalog-load-more`: Paginated data fetch, append UI state, URL sync

### Modified Capabilities
- None

## Approach

Adopt **Approach 2: Load More with URL Sync** from exploration.
- Use the existing `OrderHistory.tsx` pattern (`useSearchParams` + `useRouter` + `usePathname`) for URL state.
- Implement `useProducts` hook in `src/features/catalog/hooks/useProducts.ts` to fetch paginated products.
- Modify `getProducts()` in `src/lib/api.ts` to accept optional pagination/filter params.
- Update `ShopLoopHead` to write `category` and `sort` to the URL, resetting `page` to 1.
- Render a "Load More" button below the grid; on click fetch `page + 1` and append results.
- Reserve grid item dimensions to prevent CLS.
- Keep page as a Client Component but wrap the grid in `Suspense` for loading states.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/tienda/page.tsx` | Modified | Integrate `useProducts` and "Load More" |
| `src/lib/api.ts` | Modified | Add pagination/filter params to `getProducts` |
| `src/features/catalog/hooks/useProducts.ts` | New | Paginated fetch + state management |
| `src/features/catalog/components/ShopLoopHead.tsx` | Modified | Sync category/sort to URL |
| `src/types/index.ts` | Modified | Shared `PaginationMeta` type |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Strapi filter syntax mismatch | Med | Verify `filters[category][slug][$eq]` against backend |
| URL state desync on back button | Low | Use `replace` for filter changes; `push` for page increments |
| CLS from appended grid items | Med | Reserve item height via `aspect-ratio` / fixed container sizes |

## Rollback Plan

Revert the three commits (API change, hook, UI integration) or restore the original `page.tsx` and `api.ts` from git.

## Dependencies

- Strapi pagination/filter syntax validation

## Success Criteria

- [ ] Catalog loads first 8 products server-side (LCP < 2.5s)
- [ ] "Load More" fetches next 8 and appends without full reload (INP < 200ms)
- [ ] URL reflects `?page=N&category=X&sort=Y` and refresh restores view
- [ ] No layout shift when new items appear (CLS ≤ 0.1)
- [ ] Homepage `getProducts()` still fetches all featured products
