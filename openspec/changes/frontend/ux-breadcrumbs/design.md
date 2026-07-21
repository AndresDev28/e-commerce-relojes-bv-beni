# Design: Breadcrumbs UX

## Technical Approach

Pure server-side/page-level `buildBreadcrumbs(input)` in `src/utils/breadcrumbs.ts`, consumed by all 8 producer routes. Consolidates the duplicated `Breadcrumb` interface into `src/types/breadcrumb.ts`, adds `aria-current="page"` plus trailing-as-span semantics in `src/app/components/ui/Breadcrumbs.tsx`, and threads builder output through `/tienda` (client, `useMemo` re-derives on `useSearchParams` change) and `/tienda/[slug]` (SSR). JSON-LD `BreadcrumbList` is **out of scope** — no `generateMetadata` exists anywhere in the repo; deferring to a dedicated SEO change keeps this PR under the 400-line review budget.

## Architecture Decisions

### Decision 1: Builder location — `src/utils/breadcrumbs.ts`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `src/utils/breadcrumbs.ts` | Mirrors `formatPrice`/`formatPaymentMethod` precedent; serves ALL routes (cart, checkout, favorites, orders, auth, catalog, product detail). | **Chosen** |
| `src/features/catalog/utils/` | Co-located with catalog, but cart/checkout/auth/orders cannot import across feature boundaries (Screaming Architecture). | Rejected |
| `src/features/catalog/hooks/useBreadcrumbs.ts` | Client hook only; loses SSR-correctness on `/tienda/[slug]`; cannot run server-side. | Rejected (per explore) |

### Decision 2: Single source of truth — `src/types/breadcrumb.ts`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| New file `src/types/breadcrumb.ts` | Clean grep surface; `^export interface Breadcrumb\b` matches exactly once. | **Chosen** |
| Append to `src/types/index.ts` | Grep surface noisy (528 LOC, many `interface`/`type` declarations) — assertion harder to keep precise. | Rejected |

The DRY grep test runs `execSync(\`grep -rnE "^(export\\s+)?(interface|type)\\s+Breadcrumb\\b" src/\`)` and asserts the output has **exactly one** line whose file path ends with `src/types/breadcrumb.ts`. The anchored regex catches `interface Breadcrumb`, `export interface Breadcrumb`, `type Breadcrumb = ...`, and `export type Breadcrumb` while ignoring identifier occurrences like `Breadcrumb[]` or `function processBreadcrumb()`. Re-exports (`export { type Breadcrumb } from ...`) and Zod schemas of the same shape are caught by the same regex.

### Decision 3: A11y — trailing item rendered as `<span aria-current="page">`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Trailing as `<span aria-current="page">`, earlier as `next/link` (renders `<a>`) | Matches WCAG 2.2 + spec scenario "earlier items are `<a>` tags". Tests inspect rendered HTML. | **Chosen** |
| All items as `<Link>` + only `aria-current` on last `<li>` | Smaller diff, but screen reader announces current page as still linkable. | Rejected |

`next/link` is retained for non-trailing items — it produces `<a>` automatically. No raw anchor wrapping needed; tests inspect rendered HTML directly.

### Decision 4: Product-without-category trailing crumb

The builder contract always populates the trailing item's `href` for data-shape completeness. For `route: 'tienda-product'` with `product.category` empty/null → exactly 3 items: `Inicio / Tienda / {ProductName}`, trailing `href: product.href` (`/tienda/[slug]`, self-link per orchestrator). The component renders the trailing item as a non-link `<span>`, so the href is informational only — the user never navigates away from the current page. The trailing item's `href` is preserved in the data shape for downstream consumers (e.g., a future JSON-LD emitter).

### Decision 5: `/tienda` category transient handling

`buildBreadcrumbs({ route: 'tienda', categorySlug, categories })` returns `Inicio / Tienda` (2 items) when `categorySlug` is non-empty but `categories` is empty (transient — locked decision #1: no slug label rendered). After fetch resolves, returns `Inicio / Tienda / {CategoryName}` (3 items). If the slug does not match any resolved category (stale, locked decision #2), returns `Inicio / Tienda / {rawSlug}` (3 items). The page wraps the call in `useMemo(() => buildBreadcrumbs(...), [categories, categorySlug])` so re-renders on `useSearchParams()` changes re-derive deterministically.

### Decision 6: Per-route test fixture strategy

**One** builder unit test (`src/utils/__tests__/breadcrumbs.test.ts`) is the source of truth for all 10 route enum values via `it.each([...])` parameterized blocks. Static-route pages do **not** get individual page tests — the builder test covers their expected output (trailing labels for `home`, `carrito`, `checkout`, `favoritos`, `pedidos`, `pedido-detail`, `login`, `registro`). Dynamic routes (`/tienda`, `/tienda/[slug]`) get page tests because they have runtime state worth verifying (category fetch transient, SSR category shape normalization).

## Data Flow

    /tienda (client)        /tienda/[slug] (SSR)         static routes
         │                         │                         │
         ▼                         ▼                         ▼
   useSearchParams          getProductBySlug          route literal
   getCategories()          strapiProduct.category    ('carrito', etc.)
         │                         │                         │
         └──────► buildBreadcrumbs({...}) ◄──────────────────┘
                              │  (useMemo on /tienda, SSR on /[slug])
                              ▼
                       Breadcrumb[]
                              │
                              ▼
                     <Breadcrumbs /> renders
                              ▼
                  <nav aria-label="Breadcrumb">
                    <ol>
                      <li><a href="/">Inicio</a></li>
                      <li><a href="/tienda">Tienda</a></li>
                      <li aria-current="page"><span>Cronómetros</span></li>
                    </ol>
                  </nav>

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/types/breadcrumb.ts` | Create | Single `Breadcrumb` interface (`name`, `href`) + JSDoc. |
| `src/utils/breadcrumbs.ts` | Create | Pure `buildBreadcrumbs(input)` — switch on `route`, handles `/tienda` dynamic + `/tienda/[slug]` SSR normalization + all static routes. |
| `src/app/components/ui/Breadcrumbs.tsx` | Modify | Import `Breadcrumb` from `@/types/breadcrumb`. Render trailing as `<span aria-current="page">`, others as `<Link>`. |
| `src/app/tienda/page.tsx` | Modify | Replace literal `breadcrumbs` with `useMemo(() => buildBreadcrumbs({ route: 'tienda', categorySlug, categories }), [categories, categorySlug])`. |
| `src/app/tienda/[slug]/page.tsx` | Modify | Compute `breadcrumbs = buildBreadcrumbs({ route: 'tienda-product', product: strapiProduct })` SSR. Pass to `ProductDetailClient`. |
| `src/features/catalog/components/ProductDetailClient.tsx` | Modify | Accept `breadcrumbs` prop; render `<Breadcrumbs breadcrumbs={breadcrumbs} />` at top. |
| `src/app/carrito/page.tsx`, `checkout`, `favoritos`, `mi-cuenta/pedidos`, `mi-cuenta/pedidos/[orderId]`, `(auth)/login`, `(auth)/registro` | Modify | Replace literal with `buildBreadcrumbs({ route: 'X' })`; fix `breadcrums` typo. |
| `src/features/catalog/components/ShopLoopHead.tsx` | Modify | Drop local `interface Breadcrumb`; import from `@/types/breadcrumb`. |
| `src/types/__tests__/breadcrumb-source.test.ts` | Create | DRY grep test + compile-time shape test. |
| `src/utils/__tests__/breadcrumbs.test.ts` | Create | Parameterized unit tests for all 10 routes + transient + stale + missing-category + object/array normalization + sort/page ignored. |
| `src/app/components/ui/__tests__/Breadcrumbs.test.tsx` | Create | a11y: real component, asserts `<nav aria-label>`, trailing `aria-current`, others `<a>`. |
| `src/app/tienda/__tests__/page.test.tsx` | Create | Mocks `getCategories`; asserts transient / stale / sort-page ignored. |
| `src/app/tienda/[slug]/__tests__/page.test.tsx` | Create | Mocks `getProductBySlug`; asserts 4 levels (object/array) and 3 levels (null/empty). |

## Interfaces / Contracts

```typescript
// src/types/breadcrumb.ts
/**
 * Single source of truth for breadcrumb data.
 * Both visible labels and target URLs are required for every item.
 */
export interface Breadcrumb {
  /** Visible label rendered to the user (es-ES literal). */
  name: string;
  /** Target URL. Informational for the trailing item — component renders trailing as <span aria-current="page">. */
  href: string;
}
```

```typescript
// src/utils/breadcrumbs.ts
export type BreadcrumbRoute =
  | 'home'           // 1 level: Inicio
  | 'tienda'         // 2-3 levels, depends on categorySlug + categories
  | 'tienda-product' // 3-4 levels, depends on product.category
  | 'carrito'        // 2 levels
  | 'checkout'       // 3 levels
  | 'favoritos'      // 2 levels
  | 'pedidos'        // 3 levels
  | 'pedido-detail'  // 4 levels, dynamic orderId
  | 'login'          // 2 levels, es-ES literal "Login"
  | 'registro';      // 2 levels, es-ES literal "Registro"

export interface CategoryLookup { name: string; slug: string }

export interface BuildBreadcrumbsInput {
  route: BreadcrumbRoute;
  /** Required only when route === 'tienda'. */
  categorySlug?: string | null;
  /** Required only when route === 'tienda'. */
  categories?: readonly CategoryLookup[];
  /** Required only when route === 'tienda-product'. */
  product?: { name: string; href: string; category?: unknown };
  /** Required only when route === 'pedido-detail'. */
  orderId?: string;
}

export function buildBreadcrumbs(input: BuildBreadcrumbsInput): Breadcrumb[];
```

`buildBreadcrumbs` is pure — no I/O, no hooks, no `next/link` references. All es-ES literals live in this module.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (builder) | All 10 enum values; transient (slug + `categories=[]`); stale (slug + no match); null/empty category; object-or-array `product.category`; `?sort=`/`?page=` ignored. | `it.each` parameterized; ~10 LOC per case. |
| Component a11y | `<Breadcrumbs>` renders `<nav aria-label="Breadcrumb">`; trailing `<li>` has `aria-current="page"`; earlier items are `<a>` with matching `href`. | Render real component (no mock); `getByRole('navigation')` + `getAllByRole('listitem')`. |
| DRY type | `Breadcrumb` interface declared exactly once in `src/types/breadcrumb.ts`. | `execSync` of grep + assertions on file count and path suffix. |
| Page (dynamic only) | `/tienda` transient / stale / sort-page-ignored. `/tienda/[slug]` 4-level (object+array category) + 3-level (null/empty). | Mock `getCategories` / `getProductBySlug`; render page with `<Breadcrumbs>` mocked to `data-testid="breadcrumbs"` (reuse pattern from `mi-cuenta/pedidos/[orderId]/__tests__/page.test.tsx`). |

Static-route producer wiring is verified by `tsc --noEmit` + the builder unit test (parameterized cases cover each static route's expected output). Test command: **`npx vitest run --maxWorkers=2`** (strict TDD).

## Threat Matrix

N/A — this change does not modify routing, shell, subprocess, VCS/PR automation, executable-file classification, or process integration. Only render-time data shaping.

## Migration / Rollout

No migration. Single revert of the change commit restores the 8 hardcoded literals (less the `breadcrums` typo fix). No schema, no API contract, no feature flag.

## Open Questions

- **Home page render**: spec scenario lists `/` → "trailing label reads `Inicio`". The home page (`src/app/page.tsx`) does NOT render breadcrumbs today and is NOT in the proposal's affected files. **Design stance**: builder supports `route: 'home'` returning `[{name:'Inicio', href:'/'}]`, satisfying the spec's builder-contract requirement, but rendering on the home page is deferred to a separate change unless product wants it added now. Flag for `sdd-tasks` to confirm.

## Work-Unit Breakdown (for `sdd-tasks`)

Each unit ships independently with RED → GREEN → REFACTOR and full suite green at commit time. Strict TDD throughout.

### WU1 — `Breadcrumb` type single source (RED → GREEN)
- **Start**: nothing.
- **Finish**: `src/types/breadcrumb.ts` + `src/types/__tests__/breadcrumb-source.test.ts` (DRY grep + compile-time shape).
- **Verification**: `npx vitest run --maxWorkers=2 src/types/__tests__/breadcrumb-source.test.ts` passes.
- **Rollback**: revert both files; no consumers.

### WU2 — `buildBreadcrumbs` pure function (RED → GREEN)
- **Start**: WU1 done.
- **Finish**: `src/utils/breadcrumbs.ts` + `src/utils/__tests__/breadcrumbs.test.ts` (parameterized for 10 enum values + transient + stale + null-category + object/array + sort/page-ignored).
- **Verification**: full suite passes; builder tests cover all spec scenarios.
- **Rollback**: revert `src/utils/breadcrumbs.ts`; no consumers yet.

### WU3 — `<Breadcrumbs>` a11y (RED → GREEN)
- **Start**: WU1 done.
- **Finish**: modify `src/app/components/ui/Breadcrumbs.tsx` (import from `@/types/breadcrumb`, trailing as `<span aria-current="page">`); add `src/app/components/ui/__tests__/Breadcrumbs.test.tsx`.
- **Verification**: a11y test passes; existing pages still render (no behavior change for non-trailing items).
- **Rollback**: revert the file; no consumers yet.

### WU4 — Static producer routes wired + typo fix (one commit, 7 files)
- **Start**: WU2 + WU3 done.
- **Finish**: replace literal `breadcrumbs` with `buildBreadcrumbs({ route: 'X' })` in 7 route files (`carrito`, `checkout`, `favoritos`, `mi-cuenta/pedidos`, `mi-cuenta/pedidos/[orderId]`, `(auth)/login`, `(auth)/registro`); fix `breadcrums` typo.
- **Verification**: full suite passes; each page type-checks; DRY grep test still passes.
- **Rollback**: revert per-file (each route is independent).

### WU5 — `/tienda` category-aware wiring (RED → GREEN)
- **Start**: WU2 + WU3 done.
- **Finish**: modify `src/app/tienda/page.tsx` (derive via `useMemo` over `[categories, categorySlug]`); add `src/app/tienda/__tests__/page.test.tsx`.
- **Verification**: page tests pass; full suite passes.
- **Rollback**: revert page + test.

### WU6 — `/tienda/[slug]` SSR product-detail wiring (RED → GREEN)
- **Start**: WU2 + WU3 done.
- **Finish**: modify `src/app/tienda/[slug]/page.tsx` (SSR builder call) + `src/features/catalog/components/ProductDetailClient.tsx` (accepts + renders `breadcrumbs`); add `src/app/tienda/[slug]/__tests__/page.test.tsx`.
- **Verification**: page tests pass; full suite passes.
- **Rollback**: revert both files.

### WU7 — `ShopLoopHead` drops local duplicate (GREEN only)
- **Start**: WU1 done.
- **Finish**: `src/features/catalog/components/ShopLoopHead.tsx` imports `Breadcrumb` from `@/types/breadcrumb`; local `interface Breadcrumb` removed.
- **Verification**: DRY grep test passes (only `src/types/breadcrumb.ts` declares it); full suite passes.
- **Rollback**: revert the file (local interface restored).

## Risks (design/apply boundary)

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `useMemo` deps drift on `/tienda` if builder gains new inputs | Low | Dep array documented in JSDoc on the page; unit tests cover each dep independently. |
| Builder call site proliferation (9 sites) → signature change blast radius | Low | `BuildBreadcrumbsInput` is a single interface; TypeScript surfaces every call site on signature change. |
| DRY grep test false-pass if someone declares `interface BreadcrumbXxx` | Negligible | Regex word-boundary `\b` prevents `BreadcrumbFoo` matches. |
| Home page render scope ambiguity (spec lists it, proposal omits it) | Medium | Surfaced as Open Question; `sdd-tasks` confirms before WU4. |

## LOC Budget

| Bucket | Estimated LOC |
|--------|---------------|
| Source (12 files) | 90-105 |
| Tests (5 files) | 250-280 |
| **Total** | **340-385** |

Fits the 400-line review budget as a **single PR**. If implementation overshoots, chained-PR fallback: **PR#1** = WU1+WU2+WU3+their tests (~150 LOC), **PR#2** = WU4+WU5+WU6+WU7+their tests (~230 LOC). Decision needed before apply: No. Chained PRs recommended: No. 400-line budget risk: Low.