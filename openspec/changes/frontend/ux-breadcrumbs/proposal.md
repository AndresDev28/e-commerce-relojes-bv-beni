# Proposal: Breadcrumbs UX

## Intent

8 routes hardcode breadcrumb literals. `/tienda?category=...` ignores the active category, `/tienda/[slug]` renders no breadcrumbs at all, `(auth)/{login,registro}` has a `breadcrums` typo. The visible `Breadcrumbs` molecule lacks `aria-current="page"`. The `Breadcrumb` interface is duplicated in two files. Replace the 8 literals with a single URL/page-aware builder, fix a11y, consolidate the type.

## Scope

### In Scope

- Pure `buildBreadcrumbs(input)` in `src/utils/breadcrumbs.ts`, used by all 8 producer routes.
- Category-aware crumb on `/tienda` (slug-to-name lookup, slug as fallback).
- 4-level crumb on `/tienda/[slug]` built SSR-side from `product.category` + `product.name`.
- `aria-current="page"` on the last crumb (WCAG 2.2).
- Consolidate the `Breadcrumb` interface into `src/types/breadcrumb.ts` (single source of truth).
- Fix `breadcrums` typo in `(auth)/{login,registro}`.
- Unit tests for the builder + page render tests reusing the existing `data-testid="breadcrumbs"` mock pattern.

### Out of Scope

- JSON-LD `BreadcrumbList` structured data (no `generateMetadata` anywhere in repo; defer to follow-up SEO change).
- Migrating `/tienda` from `'use client'` to SSR (current transient is acceptable; SSR migration past 400 LOC budget).
- i18n / multi-locale scaffolding (site is es-ES single locale, verified by `Intl.NumberFormat('es-ES')`).
- Crumbs for `?sort=` or `?page=` (only `?category=` is user-meaningful in the current state).
- Any change to the `catalog-load-more` capability.

## Capabilities

### New Capabilities

- `breadcrumbs`: URL/state-driven breadcrumb generation across catalog, account, checkout, cart, favorites, and auth flows. Includes the a11y contract and the shared `Breadcrumb` type.

### Modified Capabilities

- None.

## Approach

**Single primary approach — server-side/page-level pure builder.** A `buildBreadcrumbs({ route, searchParams?, categories?, product? })` function in `src/utils/breadcrumbs.ts` (NOT `src/features/catalog/utils/` — it serves every route, not only catalog) returns `Breadcrumb[]`. Each page calls it before render:

- `/tienda/page.tsx` (client) — passes `categories` (already fetched via `getCategories`) plus `searchParams.get('category')`; builder returns `Inicio / Tienda / {CategoryName or slug}`.
- `/tienda/[slug]/page.tsx` (SSR) — passes the already-normalized `product`; builder returns `Inicio / Tienda / {Category} / {Product}`.
- All other routes — pass a `route` constant; builder returns the static 2- or 3-level list.
- **Home page (`/`) is OUT of scope** (deferred to a follow-up change — locked 2026-07-18). The builder exposes `route: 'home'` but the home page is not migrated in this change.

Reuses existing Tailwind tokens (`font-serif text-neutral-medium hover:text-primary transition-colors`) and the `neutral-light` border token. `aria-current="page"` on the last `<li>`.

### Decisions on the 7 key risks

1. **SSR vs client mismatch on `/tienda`** — accept transient (deep-link shows `Inicio / Tienda` until hydration). SSR migration expands scope past the 400 LOC budget.
2. **Category name timing on deep-link** — **hide the 3rd crumb until `getCategories` resolves** (no slug label rendered). Cleanest UI; avoids showing a raw slug. The 4-level /tienda/[slug] SSR page is unaffected.
3. **Product-detail category shape** — defensive normalization (object-or-array) inside `buildBreadcrumbs`, mirroring `useProducts.formatProduct` semantics. If `product.category` is empty/null, the builder returns 3 levels (`Inicio / Tienda / {Product}`) — NOT 4.
4. **a11y `aria-current="page"`** — IN scope. Low effort, WCAG 2.2 alignment.
5. **DRY `Breadcrumb` interface** — IN scope. Consolidate to `src/types/breadcrumb.ts`.
6. **JSON-LD** — OUT of scope (defer to a dedicated SEO change).
7. **`breadcrums` typo** — IN scope, opportunistic fix.

### Product Decisions (locked 2026-07-18 with the user)

| # | Decision | Outcome |
|---|----------|---------|
| 1 | Slug fallback on deep-link before fetch | **Hide the 3rd crumb until `getCategories` resolves** (no slug rendered). |
| 2 | Stale category link (Strapi category deleted) | **Show the raw slug as the label** (graceful degradation; small visual signal that the link is stale). |
| 3 | Product without category (`/tienda/[slug]`) | **3 levels** — `Inicio / Tienda / {Product}`. NO `Sin categoría` crumb. |
| 4 | `?sort=` / `?page=` in crumbs | **Only `?category=` is reflected**. `sort` and `page` stay OUT of scope. |
| 5 | `(auth)/{login,registro}` copy | **Keep `Login` / `Registro` (es-ES literal)** — most common in e-commerce, shorter copy, lower friction for breadcrumbs. (See commit message for rationale.) |
| 6 | Home page (`/`) | **OUT of scope** — deferred to a follow-up change. Builder exposes `route: 'home'` for future use but `src/app/page.tsx` is not migrated in this change. |

Alternatives considered (one-liners): client-only `useBreadcrumbs()` hook inside `ShopLoopHead` (loses SSR-correctness on product detail); JSON-LD in the same change (balloons scope).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/utils/breadcrumbs.ts` | New | Pure `buildBreadcrumbs()` helper. |
| `src/types/breadcrumb.ts` | New | Shared `Breadcrumb` interface (replaces both duplicates). |
| `src/app/components/ui/Breadcrumbs.tsx` | Modified | Adds `aria-current="page"`; imports typed `Breadcrumb[]` from new type. |
| `src/app/tienda/page.tsx` | Modified | Passes `categories` + active slug into builder. |
| `src/app/tienda/[slug]/page.tsx` + `src/features/catalog/components/ProductDetailClient.tsx` | Modified | SSR-built crumbs threaded as prop. |
| `src/app/carrito/page.tsx`, `src/app/checkout/page.tsx`, `src/app/favoritos/page.tsx`, `src/app/mi-cuenta/pedidos/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/registro/page.tsx` | Modified | Replace 6 hardcoded literals with builder call; fix `breadcrums` typo. |
| `src/features/catalog/components/ShopLoopHead.tsx` | Modified | Imports `Breadcrumb` from `src/types/breadcrumb.ts` (drops local duplicate). |

## Risks (chosen approach)

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Builder drifts from URL state | Low | Single helper, single test surface; URL params typed at the boundary. |
| Strapi changes `category` shape (object/array) | Low | Defensive normalization mirroring `useProducts.formatProduct`; tests cover both shapes. |
| `aria-current` regression when last item swaps | Low | Builder returns the last item explicitly; spec covers the a11y scenario. |
| Page-level test mocks for `Breadcrumbs` break | Low | Reuse the `data-testid="breadcrumbs"` pattern from `mi-cuenta/pedidos/[orderId]/__tests__/`. |

## Rollback Plan

Single revert of the change commit. No schema migration, no data shape change, no feature flag. Visible behavior returns to the 8 hardcoded literals (less the `breadcrums` typo fix). All changes are local to breadcrumb rendering — no API contract changes.

## Dependencies

- None external. Internal: `getCategories()` (`src/lib/api.ts:197`) and `useProducts` (`src/features/catalog/hooks/useProducts.ts`) for the category-shape normalization pattern.

## Success Criteria

Specs: see `specs/breadcrumbs/spec.md`.

- [ ] All 8 producer routes render breadcrumbs via `buildBreadcrumbs`; no hardcoded literals remain (except as test fixtures).
- [ ] `/tienda?category=chrono` shows `Cronómetros` after fetch, **hides the 3rd crumb during the transient** (no slug rendered).
- [ ] `/tienda/[slug]` renders a 4-level crumb with the product's category (object-or-array normalized); **falls back to 3 levels** when the product has no category.
- [ ] Stale-category deep-link renders `Inicio / Tienda / {slug}` (raw slug label, not the human name).
- [ ] `?sort=` / `?page=` are NOT reflected in any breadcrumb.
- [ ] `(auth)/{login,registro}` crumbs read `Inicio / Login` and `Inicio / Registro` (literal es-ES).
- [ ] `aria-current="page"` present on the last crumb of every breadcrumb list (verified by a11y unit test).
- [ ] `Breadcrumb` interface defined once in `src/types/breadcrumb.ts`; no duplicates anywhere.
- [ ] `(auth)/{login,registro}` no longer contains `breadcrums`.
- [ ] Test suite green: `npx vitest run --maxWorkers=2`.
