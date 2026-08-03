# Exploration: frontend/ux-breadcrumbs

> Date: 2026-07-18  | Phase: explore  | Repo HEAD: f29b36e  | Mode: read-only

## Current State

Breadcrumbs are rendered by a single presentational component
`src/app/components/ui/Breadcrumbs.tsx` (an atomic-design molecule under
`src/app/components/ui/`). It accepts `breadcrumbs: { name: string; href: string }[]`
and renders `<nav aria-label="Breadcrumb">` + `<ol>` of `<Link>` items separated by `/`.

Producers (every route hardcodes its own `breadcrumbs` array literal):

- `src/app/tienda/page.tsx:31-34` → `[{Inicio},{Tienda}]` **IGNORES `?category=`/`?sort=`/`?page=`**.
- `src/app/tienda/[slug]/page.tsx` → **renders NO breadcrumbs at all** (delegates to
  `<ProductDetailClient>` which also has none). Note: prior exploration claimed this
  page did not exist — it DOES exist at HEAD.
- `src/app/carrito/page.tsx:39-42` → `[{Inicio},{Carrito}]`.
- `src/app/checkout/page.tsx:38-42` → `[{Inicio},{Cesta},{Finalizar Compra}]`.
- `src/app/favoritos/page.tsx:12-15` → `[{Inicio},{Favoritos}]`.
- `src/app/mi-cuenta/pedidos/page.tsx` → `[{Inicio},{Mi Cuenta},{Mis Pedidos}]`.
- `src/app/mi-cuenta/pedidos/[orderId]/page.tsx:55-60` → 4-level with dynamic `orderId`
  (this is the ONLY route already producing a dynamic breadcrumb).
- `src/app/(auth)/login/page.tsx` and `src/app/(auth)/registro/page.tsx` →
  `[{Inicio},{Login|Registro}]` (note: local var misspelled `breadcrums`).

Consumers (renderers): all producers above import `Breadcrumbs` and call
`<Breadcrumbs breadcrumbs={breadcrumbs} />`. The catalog feature's
`ShopLoopHead` renders breadcrumbs as a sub-section of the shop-loop header.

Data flow (catalog only, end-to-end):
1. `src/app/tienda/page.tsx` `CatalogContent` fetches categories once on mount via
   `getCategories()` (`src/lib/api.ts:197`) → `StrapiCategory[]` (`{id,name,slug}`),
   filtered to `{name,slug}[]` and passed to `<ShopLoopHead categories={...}>`.
2. `CatalogContent` ALSO builds the static `breadcrumbs` literal (line 31-34) and
   passes it to `<ShopLoopHead breadcrumbs={...}>`.
3. `ShopLoopHead` re-renders on `useSearchParams()` changes (category/sort/page) but
   DOES NOT re-derive breadcrumbs — the prop is frozen at the parent's static literal.
4. `<Breadcrumbs breadcrumbs={breadcrumbs}/>` renders the list (no `aria-current`,
   no JSON-LD).

`useProducts` (`src/features/catalog/hooks/useProducts.ts`) reads `category`, `page`,
`sort` from `useSearchParams()` and pushes them into `getProducts(params)` — this is
the URL-state source of truth breadcrumbs MUST mirror.

## Affected Areas

- `src/app/components/ui/Breadcrumbs.tsx` — add `aria-current="page"` on last item;
  optional JSON-LD `<script type="application/ld+json">` BreadcrumbList emission;
  consider accepting an optional `className` for layout contexts.
- `src/features/catalog/components/ShopLoopHead.tsx` — either (a) re-derive
  breadcrumbs from `useSearchParams()` + `categories` prop INSIDE the component, or
  (b) keep receiving as prop but parent must recompute. `Breadcrumb` interface here
  is a duplicate of the one in `Breadcrumbs.tsx` — DRY violation to consolidate.
- `src/app/tienda/page.tsx` — derive breadcrumb array from the active category
  slug; needs the category NAME (already fetched via `getCategories`, so a
  slug→name lookup is O(1) with no extra request).
- `src/app/tienda/[slug]/page.tsx` + `src/features/catalog/components/ProductDetailClient.tsx`
  — render breadcrumbs for product detail. `getProductBySlug` already returns
  `category.name` (object-or-array normalized in both the page and `useProducts`),
  so a 4-level `Inicio / Tienda / {Category} / {Product name}` is derivable with no
  new fetch. The SSR page already passes a normalized `Product` to the client
  component; breadcrumbs can be built server-side and threaded as prop, or built
  client-side from `product.category` + `product.name`.
- `src/app/carrito/page.tsx`, `src/app/checkout/page.tsx`, `src/app/favoritos/page.tsx`,
  `src/app/(auth)/login/page.tsx`, `src/app/(auth)/registro/page.tsx`,
  `src/app/mi-cuenta/pedidos/page.tsx` — these static breadcrumbs are NOT broken for
  this change's scope (they don't depend on URL params), but a shared
  `buildBreadcrumbs()` helper would de-duplicate and fix the `breadcrums` typo.
- `src/types/index.ts` (or a new `src/types/breadcrumb.ts`) — consolidate the
  duplicated `Breadcrumb` interface into a single exported type.
- SEO surface: no `generateMetadata` and no JSON-LD anywhere in the repo. Adding
  BreadcrumbList JSON-LD is greenfield; best emitted from the SSR product detail
  page (`/tienda/[slug]/page.tsx`) via `generateMetadata` or a sibling script tag.
- Tests: existing patterns — `src/features/catalog/hooks/__tests__/useProducts.test.ts`
  (renders hook + mocks `next/navigation` + mocks `@/lib/api`) and
  `src/app/mi-cuenta/pedidos/[orderId]/__tests__/page.test.tsx` (mocks
  `Breadcrumbs` with `data-testid="breadcrumbs"` and asserts text content). The
  apply phase can reuse the `Breadcrumbs` mock pattern and the category mock shape
  `{ id, name, slug }`.

## Approaches

1. **Client-side derivation inside `ShopLoopHead`** — pass the `categories` array
   (already a prop) and let `ShopLoopHead` build the breadcrumb list from
   `useSearchParams()` + slug→name lookup. Add a `useBreadcrumbs()` hook for reuse.
   - Pros: single source of truth (URL), re-render-free for the parent, reuses
     already-fetched categories, easy to unit-test with `renderHook`.
   - Cons: breadcrumbs only update after client hydration (brief SSR/static
     `Inicio / Tienda` flash on category deep-link). SSR `<Breadcrumbs>` not aware
     of category until hydration.
   - Effort: Low (~30-60 LOC + tests)

2. **Server-side breadcrumb builder called from each page** — a pure
   `buildBreadcrumbs({ route, categorySlug, categories, product? })` helper invoked
   in the page (or `ShopLoopHead` parent) before render. For `/tienda`, the page
   already has `categories`; for `/tienda/[slug]` the SSR page has the product.
   - Pros: SSR-correct (no hydration flash), reusable across all producer routes,
     pure function trivially unit-testable, de-duplicates the 8 hardcoded arrays,
     fixes the `breadcrums` typo, integrates naturally with `generateMetadata` for
     JSON-LD.
   - Cons: requires threading the builder's output as a prop into existing
     `ShopLoopHead` (minor refactor of `CatalogContent`); for client-side
     category changes WITHOUT a full navigation, `router.replace` still triggers a
     re-render of the page, so SSR-builder runs again — but `/tienda` is a
     `'use client'` page so there is no SSR pass there; the builder runs on the
     client during render, which is fine and matches Approach 1's cost.
   - Effort: Low-Medium (~50-90 LOC + tests)

3. **URL-driven hook + JSON-LD in `generateMetadata`** — Approach 2 for the visible
   breadcrumbs, PLUS a `generateMetadata` export on `/tienda/[slug]/page.tsx`
   returning a BreadcrumbList structured-data script. On `/tienda` (client page)
   add JSON-LD via a client-rendered `<script>` since there's no SSR metadata path.
   - Pros: SEO-correct, gives Google rich-result BreadcrumbList, future-proof for
     product rich results.
   - Cons: larger surface, JSON-LD on a client page is awkward (needs
     `dangerouslySetInnerHTML` in a client component or migrating `/tienda` to SSR).
   - Effort: Medium (~90-150 LOC + tests + metadata)

## Recommendation

**Approach 2 (server-side / page-level builder) for visible breadcrumbs**, deferred
JSON-LD (Approach 3) to a follow-up change. Rationale:

- The builder is a pure, easily-tested function — fits strict TDD cleanly.
- It works for ALL producer routes (cart, checkout, favorites, orders, auth, tienda,
  product detail) from day one and removes the 8 duplicated literals.
- It makes the dynamic-category case trivial on `/tienda` (the page already holds
  `categories`).
- It makes product-detail breadcrumbs (`Inicio / Tienda / {Category} / {Product}`)
  straightforward on the SSR `/tienda/[slug]` page, where `product.category` and
  `product.name` are already known.
- JSON-LD can be layered on top later without re-architecting the visible component.

## Risks

- **SSR vs client mismatch on `/tienda`** — `/tienda/page.tsx` is `'use client'`.
  Category deep-links (`/tienda?category=chrono`) render the static
  `Inicio / Tienda` on the server before hydration, then update client-side. Acceptable
  for now; flag for SEO if JSON-LD is added. Proposal should decide: migrate `/tienda`
  to a server component with a client child, or accept the brief mismatch.
- **Category name availability** — `getCategories` is called in a client `useEffect`
  on `/tienda`. On first render `categories` is `[]`, so the breadcrumb for a
  category deep-link shows `Inicio / Tienda` until the fetch resolves (~1 request).
  Mitigations: (a) accept the transient, (b) SSR-fetch categories,
  (c) use the slug as a fallback label. Proposal should pick one.
- **Product detail category shape** — `getProductBySlug` returns
  `category` as either an object or an array (the code normalizes both). The builder
  must handle both shapes defensively. `useProducts.formatProduct` already does this
  normalization — reuse it or replicate.
- **Next.js 15 async `searchParams`/`params`** — `/tienda/[slug]/page.tsx` already
  `await`s `params`. `/tienda/page.tsx` is fully client and uses `useSearchParams()`.
  Do not regress to sync `searchParams`.
- **DRY violation in `Breadcrumb` interface** — duplicated across `Breadcrumbs.tsx`
  and `ShopLoopHead.tsx`. Consolidating is a breaking import change; proposal should
  decide whether to do it in-scope or as a separate refactor.
- **JSON-LD absent site-wide** — out of scope for this change unless user wants it.
  Flag as a discovery; do not block.
- **Accessibility gap** — current `<Breadcrumbs>` does not set `aria-current="page"`
  on the last crumb (WCAG 2.2 nuance). Low-effort fix, include in-scope.
- **Typo `breadcrums`** in `login` and `registro` pages — cosmetic, fix opportunistically.
- **i18n** — site is es-ES single-locale (evidence: `Intl.NumberFormat('es-ES')`).
  No breadcrumb strings need translation scaffolding now. Reconfirm before proposal
  if user plans multi-locale.
- **Tailwind conventions** — `Breadcrumbs.tsx` uses `font-serif text-neutral-medium
  hover:text-primary transition-colors` and `neutral-light` border tokens. Any new
  rendering MUST keep these tokens to match ShopLoopHead's styling.

## Scope Estimate

- Pure builder function + unit tests: ~40 LOC source + ~60 LOC tests.
- `/tienda` page wiring (category-aware): ~15 LOC.
- `/tienda/[slug]` + `ProductDetailClient` breadcrumbs: ~25 LOC.
- `Breadcrumbs` a11y fix (`aria-current`): ~5 LOC + ~10 LOC tests.
- Consolidate `Breadcrumb` type + fix `breadcrums` typo: ~20 LOC churn.
- **Total: ~60-105 LOC source + ~70-100 LOC tests.** Review budget of 400 lines is
  safe; no chained PR expected.

## Ready for Proposal

**Yes.** Recommend `sdd-propose` next. Proposal should explicitly decide:
(1) builder location (`src/features/catalog/utils/buildBreadcrumbs.ts` vs
`src/utils/breadcrumbs.ts` — prefer the latter since it serves ALL routes, not just
catalog); (2) whether to migrate `/tienda` to SSR for category breadcrumbs or accept
transient client-side update; (3) whether JSON-LD is in-scope or follow-up.