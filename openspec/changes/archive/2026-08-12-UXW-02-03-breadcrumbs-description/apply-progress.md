# Apply Progress: UXW-02-03-breadcrumbs-description

## Summary

Implemented both UXW work units on branch `frontend/UXW-02-03-breadcrumbs-description` in two focused work-unit commits. Strict TDD (RED → GREEN) followed. Vitest, Playwright (Chromium + Firefox), and `next build` all verified.

## Commits

| SHA | Message | Scope |
|---|---|---|
| `0d15f1e` | feat(breadcrumbs): add title attr + truncation defense (UXW-02) | C1 |
| `cfdb7eb` | feat(product-detail): convert Strapi blocks to markdown description (UXW-03) | C2 |

## Tasks

- [x] T1 RED — 4 UXW-02 cases in `Breadcrumbs.test.tsx`
- [x] T2 GREEN — `title` + `max-w-[12rem] truncate` both branches
- [x] T3 VERIFY — scoped + full vitest
- [x] T4 RED — blocks fixture + converter cases + ReactMarkdown cases
- [x] T5 GREEN — `StrapiBlock`/`StrapiBlockChild` types + `blocksToMarkdown`
- [x] T6 GREEN — page.tsx converter + catalog mappers `description: ''`
- [x] T7 VERIFY — E2E spec (Chromium + Firefox) + next build

## TDD Cycle Evidence

| Task | Test File | Layer | RED | GREEN |
|---|---|---|---|---|
| T1→T2 | `src/components/ui/__tests__/Breadcrumbs.test.tsx` | Unit | 4 new cases failed (title/truncate/short-label) | 9/9 pass |
| T4→T5 | `src/utils/__tests__/blocks.test.ts` | Unit | module `../blocks` not found | 16/16 pass |
| T4→T6 | `src/app/tienda/[slug]/__tests__/page.test.tsx` | Integration | `'' !== 'A classic watch\n\n'` | 7/7 pass |
| T4 | `src/features/catalog/__tests__/ProductDetailClient.test.tsx` | Integration | characterization (renderer pre-existing; no strict RED) | 4/4 pass |
| T7 | `tests/e2e/product-detail-ux.spec.ts` | E2E | — | 4/4 pass (2 tests × chromium+firefox) |

## Files Changed

| File | Action |
|---|---|
| `src/components/ui/Breadcrumbs.tsx` | Modified — title + truncate both branches |
| `src/components/ui/__tests__/Breadcrumbs.test.tsx` | Modified — +4 UXW-02 cases |
| `src/types/index.ts` | Modified — `StrapiBlock`/`StrapiBlockChild`; `description: StrapiBlock[] \| null` |
| `src/utils/blocks.ts` | Created — `blocksToMarkdown` |
| `src/utils/__tests__/blocks.test.ts` | Created — 16 converter cases |
| `src/app/tienda/[slug]/page.tsx` | Modified — `blocksToMarkdown(description ?? [])` |
| `src/app/tienda/[slug]/__tests__/page.test.tsx` | Modified — blocks fixture + description assertion |
| `src/features/catalog/hooks/useProducts.ts` | Modified — `description: ''` |
| `src/features/catalog/components/FeaturedProducts.tsx` | Modified — `description: ''` |
| `src/features/catalog/__tests__/ProductDetailClient.test.tsx` | Created — 4 ReactMarkdown/fallback cases |
| `tests/e2e/product-detail-ux.spec.ts` | Created — PDP paragraphs + breadcrumb title |
| `tests/e2e/mock-strapi-server.mjs` | Created — Strapi mock for server-component fetch |

## Verification

- **Vitest** (`npx vitest run --maxWorkers=2`): 974 tests, 953 passed, 21 failed. The 21 failures are **pre-existing** (`src/__tests__/context/CartContext.test.tsx` 17 + `src/components/ui/__tests__/CookieBanner.test.tsx` 4), caused by `window.localStorage.clear is not a function` — confirmed failing on the clean tree (git stash) before this change.
- **Playwright** (`npx playwright test tests/e2e/product-detail-ux.spec.ts`): 4 passed (2 tests × Chromium + Firefox).
- **next build** (`npx next build`): success (exit 0), `/tienda/[slug]` dynamic route rendered.

## Deviations from Design

1. **E2E mock mechanism**: `page.route('**/api/products*')` cannot intercept the product detail page's server-component fetch (it runs in the Node dev-server process, not the browser). Confirmed empirically (page rendered 404) and corroborated by the codebase note in `uxw01-regression-sweep.spec.ts` TC-16. Added `tests/e2e/mock-strapi-server.mjs` + a dev server pointed at it (`STRAPI_API_URL=http://localhost:1338`) as the effective mock. `page.route` remains in the spec (design-compliant surface) but is a no-op for the SSR path.
2. **ProductDetailClient.test.tsx** is a characterization test — it passes against the pre-existing ReactMarkdown renderer (no strict RED), since ProductDetailClient is unchanged per design.
3. **CSS class assertions** in `Breadcrumbs.test.tsx` (`max-w-[12rem] truncate`) — strict-tdd discourages CSS class assertions, but the design explicitly requires locking the truncation defense.
4. **Manual a11y smoke** (keyboard traversal, 200% zoom, screen-reader) from T3 not performed by this agent — delegated to human/manual verification.

## Work Unit Evidence

| Unit | Focused test result | Runtime harness | Rollback boundary |
|---|---|---|---|
| C1 breadcrumbs | `vitest run src/components/ui/__tests__/Breadcrumbs.test.tsx` → 9/9 | N/A — presentational attr/class change | `Breadcrumbs.tsx` + its test |
| C2 description | `vitest run blocks.test.ts + ProductDetailClient.test.tsx + page.test.tsx` → 27/27 | `playwright test product-detail-ux.spec.ts` → 4/4 | `blocks.ts`, types, PDP consumers, tests |

## Lessons

1. `next build` corrupts a running `next dev` server's `.next` cache (missing `vendor-chunks/mdast-util-to-hast.js` → 500s). Always stop dev servers before building, then `rm -rf .next` + restart.
2. Playwright `page.route` cannot intercept Next.js server-component fetches — use a standalone mock server + `STRAPI_API_URL` env override for SSR data.
