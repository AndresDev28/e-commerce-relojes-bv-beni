## Exploration: Catalog Pagination / Load More with URL Sync

### Current State

The catalog page (`/tienda`) is a **single `'use client'` component** (`src/app/tienda/page.tsx`) that:
- Fetches **ALL products** at once via `getProducts()` (no pagination params sent to Strapi)
- Fetches **ALL categories** at once via `getCategories()`
- Manages client-side state for `activeCategory` and `sortOrder` via `useState`
- Filters and sorts the full product list client-side via `useMemo`
- Renders the entire product grid in one shot (no pagination, no load-more)
- Does **NOT** sync any filter/sort/page state to the URL — refreshing loses all state

The Strapi API already supports pagination: `src/lib/api.ts` has a `StrapiApiResponse<T>` type with `meta.pagination` (page, pageSize, pageCount, total), but `getProducts()` ignores it — it fetches all products with `populate: '*'` and no pagination params.

There is an **existing pagination pattern** in the project: `OrderHistory.tsx` in `src/features/orders/components/` uses `useSearchParams` + `useRouter` + `usePathname` to sync page state with URL params (`?page=N`). This is the established convention for URL-synced pagination in this codebase.

The homepage (`src/app/page.tsx`) is a **Server Component** that calls `getProducts()` and `getCategories()` directly, passing data down to `FeaturedProducts` and `CategoryGrid`.

### Affected Areas

- `src/app/tienda/page.tsx` — Main catalog page; currently fetches all products client-side, no pagination
- `src/lib/api.ts` — `getProducts()` needs pagination params (page, pageSize, category filter); `fetchApi()` already handles `StrapiApiResponse` pagination meta but discards it
- `src/features/catalog/components/ShopLoopHead.tsx` — Category filter and sort UI; needs URL sync for category & sort
- `src/features/catalog/index.ts` — Public API of catalog feature; new hook/component exports
- `src/features/catalog/hooks/useProducts.ts` — Currently a stub (1 line comment); should become the data-fetching hook with pagination
- `src/app/page.tsx` — Uses `getProducts()` for homepage; may need adjustment if API function signature changes
- `src/types/index.ts` — May need a `PaginationMeta` type (already exists locally in OrderHistory but not shared)
- `src/app/tienda/[slug]/page.tsx` — Product detail page; unaffected but worth noting for deep-link consistency

### Approaches

#### 1. Traditional Pagination with URL Sync (like OrderHistory)

**Description**: Convert `ShopLoopHead` and the product grid into a paginated list with page numbers. Sync `?page=N&category=X&sort=Y` to URL. Use `useSearchParams` + `useRouter` like `OrderHistory`.

- **Pros**:
  - Established pattern in the codebase (OrderHistory already does this)
  - Simple to implement, well-understood UX
  - Good for SEO — each page has a unique URL
  - Server-friendly: can pre-render page 1
- **Cons**:
  - Full page reload on every page change (unless using Next.js navigation)
  - Not the best UX for browsing a product catalog (users prefer scrolling)
  - Possible CLS/largest-content-shift on navigation
- **Effort**: Medium

#### 2. Load More (Infinite Scroll) with URL Sync

**Description**: Show initial batch (e.g., 8-12 products) and a "Load More" button or intersection observer trigger. Each load appends to the list. Sync `?page=N&category=X&sort=Y` to URL so refreshing preserves position.

- **Pros**:
  - Better UX for browsing — no full-page reload, accumulates content
  - URL sync preserves state on refresh
  - Feels modern and app-like
  - Good for mobile UX
- **Cons**:
  - More complex state management (append vs replace)
  - URL `page=N` represents the deepest loaded page, not current scroll position
  - Back button behavior needs consideration
  - Duplicate product risk if not careful with state management
- **Effort**: Medium-High

#### 3. Server-Side Pagination (convert to Server Component with Suspense)

**Description**: Convert `/tienda/page.tsx` to a Server Component. Use `searchParams` prop (Next.js App Router). Each page change triggers a server-side fetch with Strapi pagination. Wrap in `Suspense` for streaming.

- **Pros**:
  - Best for SEO — server-rendered HTML per page
  - Less client-side JS
  - Follows Next.js App Router best practices
  - No client-side loading state闪烁
- **Cons**:
  - Requires restructuring the current `'use client'` page
  - Category filter / sort would need to use URL params (which is the goal anyway)
  - More architectural change
- **Effort**: High

### Recommendation

**Approach 2: Load More with URL Sync**, following the existing URL-sync pattern from `OrderHistory`.

Rationale:
- The project already uses `useSearchParams` + `useRouter` for URL state sync — this is the established convention.
- A "Load More" button (not infinite scroll via Intersection Observer — too implicit) gives explicit user control while being more browsing-friendly than page numbers.
- We should leverage the `useProducts` hook stub that's already in the catalog feature.
- The Strapi API already supports pagination via `pagination[page]` and `pagination[pageSize]` query params, plus `filters[category][name][$eq]` for category filtering — we just need to pass them.
- URL should encode all filter state: `?page=2&category=Chronograph&sort=price-asc`.
- The `ShopLoopHead` sort/category changes should also update the URL, resetting page to 1.

This approach balances UX, codebase consistency, and implementation effort.

### Risks

- **Strapi category filter syntax**: Need to verify exact filter syntax for Strapi v4 (`filters[category][name][$eq]=X` or `filters[category][slug][$eq]=X`). The current `getProducts()` doesn't send any filters.
- **Client/Server component boundary**: Adding `useSearchParams` to a page requires a `Suspense` boundary in Next.js App Router, or the entire page becomes client-rendered. Need to handle this properly.
- **Homepage `getProducts()` impact**: If we modify `getProducts()` to accept pagination params, the homepage call must still work (it fetches all products for the featured section). Keep backward-compatible defaults.
- **Category change resets accumulated products**: When user switches category while products are loaded, all accumulated products must be cleared and the page reset to 1.
- **Existing tests**: No existing catalog tests, but the `OrderHistory.tsx` has comprehensive test patterns for URL-synced pagination that we can follow.

### Ready for Proposal

Yes — the exploration is sufficient to propose a change. The scope is clear: add pagination/load-more to the catalog page with URL synchronization for page, category, and sort state.