# Design: Catalog Pagination / Load More with URL Sync

## Technical Approach

Shift from client-side fetch-all-then-filter to server-side paginated Strapi queries, accumulating products via "Load More" with `useSearchParams` + `useRouter` for URL state sync (following the existing `OrderHistory.tsx` pattern). URL becomes the single source of truth for `page`, `category`, `sort`. Initial page (8 items) loads fast for LCP; subsequent pages append without full reload for INP.

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| URL state sync | `useSearchParams` + `useRouter` (OrderHistory pattern) vs. `useState` + `useEffect` push | Established project convention, tested, handles refresh/back natively | `useSearchParams` + `useRouter` with `router.replace` for filter changes and `router.push` for page increments |
| API backward compat | Function overload (`getProducts(): StrapiProduct[]` vs `getProducts(params): ProductsResponse`) vs. always return envelope | Overloads keep homepage call unchanged; envelope would touch every consumer | Overloads — homepage `getProducts()` stays identical |
| Page accumulation on refresh | Fetch all pages 1..N in parallel on mount vs. fetch only current page | Parallel fetch restores full view on refresh (spec requirement); sequential is simpler but loses state | Parallel `Promise.all` of pages 1..N from URL `?page=N`, gated by `pageCount` from first response |
| Category/sort reset | `router.replace` to `?page=1&category=X&sort=Y` vs. `router.push` | `replace` avoids cluttering history with filter changes; `push` fills back-button with noise | `replace` for filter/sort changes, `push` for load-more increments |
| Filter key in URL | `category=slug` vs. `category=name` | Slug is URL-safe, consistent with product routes; name has spaces/accents | `category` uses Strapi `slug` (e.g., `deportivo` not `Deportivo`) |
| CLS prevention | `aspect-ratio` on grid items + explicit `width`/`height` on images vs. `min-height` placeholder | `aspect-ratio` is native, works with responsive grid; `min-height` requires JS calc | `aspect-ratio` CSS on grid-item wrappers, explicit dimensions on `next/image` |

## Data Flow

```
User clicks "Load More"
    │
    ▼
useProducts.loadMore() ──► router.push(`?page=${current+1}`)
    │                              │
    │                              ▼
    │                     useSearchParams detects page change
    │                              │
    ▼                              ▼
fetch next-page products ──► append to accumulated state
    │
    ▼
grid re-renders with new items (below existing, no layout shift)
```

On filter change (`ShopLoopHead`):
```
category/sort changed
    │
    ▼
router.replace(`?page=1&category=slug&sort=value`)
    │
    ▼
useProducts detects reset → clears accumulated → fetches page 1
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/types/index.ts` | Modify | Add `PaginationMeta`, `GetProductsParams`, `ProductsResponse` shared types |
| `src/lib/api.ts` | Modify | Overload `getProducts()` with pagination/filter/sort params; build Strapi query strings (`pagination[page]`, `filters[category][slug][$eq]`, `sort`) |
| `src/features/catalog/hooks/useProducts.ts` | Rewrite | Full hook: reads URL params → parallel-fetches pages 1..N → accumulates products → exposes `loadMore`, `products`, `pagination`, `loading` |
| `src/features/catalog/components/ShopLoopHead.tsx` | Modify | Add `useSearchParams`/`useRouter` for URL-synced category/sort; `router.replace` on change resets page to 1 |
| `src/features/catalog/index.ts` | Modify | Export `useProducts` hook |
| `src/app/tienda/page.tsx` | Modify | Replace local `useState`/`useEffect`/`useMemo` with `useProducts`; wrap in `Suspense`; add Load More button; remove client-side filtering logic |
| `src/features/orders/components/OrderHistory.tsx` | Modify | Import `PaginationMeta` from `@/types` instead of local interface (cleanup) |

## Interfaces / Contracts

```typescript
// src/types/index.ts (new exports)
export interface PaginationMeta {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export interface GetProductsParams {
  page?: number
  pageSize?: number
  category?: string   // Strapi slug
  sort?: string        // 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'
}

export interface ProductsResponse {
  products: StrapiProduct[]
  pagination: PaginationMeta
}

// src/lib/api.ts (overload signatures)
export async function getProducts(): Promise<StrapiProduct[]>
export async function getProducts(params: GetProductsParams): Promise<ProductsResponse>

// src/features/catalog/hooks/useProducts.ts
export function useProducts(): {
  products: Product[]          // accumulated formatted products
  pagination: PaginationMeta | null
  isLoading: boolean
  hasMore: boolean
  loadMore: () => void
}
```

Strapi query mapping:
- `page` → `pagination[page]=N`
- `pageSize` → `pagination[pageSize]=8`
- `category` → `filters[category][slug][$eq]=slug`
- `sort: 'price-asc'` → `sort=price:asc` (colon-separated in Strapi)

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `getProducts` param building | Test query string generation for each param combination |
| Unit | `useProducts` state transitions | Hook tests via `@testing-library/react-hooks` — accumulation, reset on filter change, `hasMore` calculation |
| Unit | `ShopLoopHead` URL writes | Mock `useRouter`, verify `replace` called with correct params on category/sort click |
| Integration | Page mount with URL params | Render `page.tsx` with `?page=2&category=deportivo`, assert 16 products rendered, Load More available |
| E2E | Full user journey | Playwright: visit `/tienda` → click category → verify grid resets → click Load More → verify append → refresh → verify state restored |

## Migration / Rollout

No migration required. Backward-compatible: homepage `getProducts()` call is unmodified. `OrderHistory` import change is a no-op rename (same shape). Feature flag not needed — change is additive on a single route.

## Open Questions

- [ ] Strapi `sort` syntax: confirm `sort=price:asc` (colon) vs `sort=price%3Aasc` encoding. Test against deployed Strapi instance.
- [ ] Max `pagination[pageSize]` for "all products" fallback: Strapi default cap is 100. If catalog exceeds 100 products, homepage FeaturedProducts will miss items. Accept as pre-existing limitation or add client-side aggregate fetch?
