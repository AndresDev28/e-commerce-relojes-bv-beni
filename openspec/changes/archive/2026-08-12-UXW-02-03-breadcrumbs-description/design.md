# Design: UXW-02 + UXW-03 — Breadcrumb truncation + Product description rendering

## Technical Approach

Two independent PDP UX fixes in one branch, two work-unit commits.

**UXW-02**: native `title` + Tailwind `truncate` on both breadcrumb branches — no tooltip library, no overflow JS.

**UXW-03**: pure `blocksToMarkdown()` at the Strapi→`Product` boundary; `ProductDetailClient` keeps `react-markdown`. Catalog list mappers stop projecting unused description blocks.

Maps to locked proposal + delta specs (`breadcrumbs` additive UXW-02; NEW `product-detail`).

## Architecture (locked)

```
src/components/ui/Breadcrumbs.tsx
  ├─ Trailing span:  title={crumb.name} + max-w-[12rem] truncate
  └─ Non-trailing Link: title={crumb.name} + max-w-[12rem] truncate

src/utils/blocks.ts                 [NEW] blocksToMarkdown(blocks)
src/types/index.ts                  StrapiBlock* + description: StrapiBlock[] | null
src/app/tienda/[slug]/page.tsx      blocksToMarkdown(description ?? [])
src/features/catalog/hooks/useProducts.ts     description: ''  (omit blocks)
src/features/catalog/components/FeaturedProducts.tsx  description: ''  (omit blocks)
ProductDetailClient                 unchanged — still ReactMarkdown(product.description)
```

## Data Flow

```
Strapi 5 product
  description: StrapiBlock[] | null
        │
        ├─ /tienda/[slug]/page.tsx
        │     blocksToMarkdown(...) → Product.description: string
        │           → ProductDetailClient → ReactMarkdown → <p>/<h*>/<ul>
        │
        └─ useProducts / FeaturedProducts
              description: ''   (ProductCard never reads it)
```

## Resolved design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Title emission | **A — always emit `title`** | No overflow JS; WCAG 2.5.3 satisfied (full name in accessible name via text node + title). Native tooltip noise on short labels is acceptable. |
| Spec TC-03 short label | **Soften** (behavior note) | Always-present `title` means “no title when fits” is not a hard requirement. Truncation CSS still no-ops when text fits. |
| ProductCard description | **remove-from-projection** | Verified: `ProductCard` only uses name/price/images/href/stock. Set `description: ''` in both catalog mappers. |
| Tailwind max-w | **`max-w-[12rem]`** (~192px) | 3 crumbs on ~375px; ~30-char names; long names ellipsis + title recovery. |
| E2E mock scope | **B — full Strapi product payload** | Same pattern as `login-redirect.spec.ts`; exercises full PDP pipeline. |
| page.test mock shape | **blocks array** | Matches real Strapi; forces type + converter path. |
| useProducts / FeaturedProducts | **`description: ''`** | Coherent with Q1; avoids converter cost on list fetch. |
| Truncation target | **both branches** | Spec requires long ancestor links to truncate too. |

### Title strategy detail (Option A)

```tsx
// both branches
title={crumb.name}
className="… max-w-[12rem] truncate"
```

No `useRef`/`useEffect` measurement. Screen readers still get full label from text content (truncate is visual-only via CSS).

**Spec alignment (tasks MUST apply)**: rewrite breadcrumbs short-label scenario to: short labels remain visually complete (truncate no-ops); `title` MAY always be present.

## Architecture Decisions

### Decision: Converter location — `src/utils/blocks.ts`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `src/utils/blocks.ts` | Mirrors breadcrumbs util; no feature-boundary import | **Chosen** |
| `src/features/catalog/utils/` | Catalog-only; pages already import utils | Rejected |
| `@strapi/blocks-react-renderer` | New dep + larger surface | Deferred (proposal) |

### Decision: Catalog omits description blocks

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `description: ''` in list mappers | Smallest diff; ProductCard unused field | **Chosen** |
| Convert in every mapper | Extra work on list pages for unused field | Rejected |
| Make `Product.description` optional | Wider type blast radius (cart/favorites) | Rejected |

### Decision: Title always-on vs overflow detection

| Option | Tradeoff | Decision |
|--------|----------|----------|
| A always `title` | Simple, a11y-correct | **Chosen** |
| B measure overflow | Extra client code/state | Rejected |
| C title only on Links | Misses trailing mobile overflow | Rejected |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/ui/Breadcrumbs.tsx` | Modify | `title` + `max-w-[12rem] truncate` both branches |
| `src/utils/blocks.ts` | Create | `blocksToMarkdown` |
| `src/types/index.ts` | Modify | `StrapiBlock`/`StrapiBlockChild`; `StrapiProduct.description` |
| `src/app/tienda/[slug]/page.tsx` | Modify | Replace string guard with converter |
| `src/features/catalog/hooks/useProducts.ts` | Modify | `description: ''` |
| `src/features/catalog/components/FeaturedProducts.tsx` | Modify | `description: ''` |
| `src/components/ui/__tests__/Breadcrumbs.test.tsx` | Modify | +4 UXW-02 cases |
| `src/utils/__tests__/blocks.test.ts` | Create | Converter unit tests |
| `src/app/tienda/[slug]/__tests__/page.test.tsx` | Modify | Mock → blocks; assert description markdown |
| `src/features/catalog/__tests__/ProductDetailClient.test.tsx` | Create | ReactMarkdown pipeline |
| `tests/e2e/product-detail-ux.spec.ts` | Create | page.route full mock; Chromium+Firefox |

## Interfaces / Contracts

```ts
export interface StrapiBlockChild {
  type: string
  text?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  url?: string
  children?: Array<{ type: string; text?: string; url?: string }>
}

export interface StrapiBlock {
  type: string
  children: StrapiBlockChild[]
  level?: number
  format?: 'ordered' | 'unordered'
}

// StrapiProduct.description: StrapiBlock[] | null
// Product.description stays string (app layer)
```

### `blocksToMarkdown` (watch-store scope)

| Block | Output |
|-------|--------|
| paragraph | `text\n\n` |
| heading level N | `${'#'.repeat(N)} text\n\n` |
| list unordered | `- item\n` … + trailing `\n` |
| list ordered | `1. item\n` … |
| quote | `> text\n\n` |
| code block | fenced code |
| unsupported | flatten children text (never throw) |
| `[]` / nullish caller | `''` |

Inlines: bold `**`**, italic `*`, code `` ` ``, link `[t](url)`, strike `~~`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `blocksToMarkdown` | 8+ cases: para, bold, link, h2, ul, mixed, empty, null, unsupported |
| Unit | Breadcrumbs UXW-02 | title both branches; truncate class; short label still has title + full text |
| Integration | page.tsx mapping | blocks mock → product.description markdown string |
| Integration | ProductDetailClient | markdown → `<p>` / fallback empty |
| E2E | PDP + breadcrumbs | full `page.route` mock; 2 tests × chromium+firefox |

Strict TDD: RED then GREEN per commit. Command: `npx vitest run --maxWorkers=2`.

## Implementation order (2 commits, same branch)

**C1 — UXW-02 Breadcrumbs a11y**
1. RED: 4 failing cases in `Breadcrumbs.test.tsx`
2. GREEN: `title` + `max-w-[12rem] truncate` both branches
3. Verify scoped vitest green

**C2 — UXW-03 Description rendering**
1. RED: page.test mock → blocks (breaks type/guard); `blocks.test.ts`; ProductDetailClient tests
2. GREEN: `blocks.ts`, types, page.tsx, useProducts, FeaturedProducts
3. Verify vitest green
4. E2E `product-detail-ux.spec.ts` (full mock payload)

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Frontend-only; no flag; no wire-format change; backend untouched.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Strapi blocks evolve | Low | Single converter choke point |
| List mappers empty description surprises future UI | Low | ProductCard verified unused; add converter later if needed |
| Always-on title tooltip noise | Low | Acceptable; softens TC-03 |
| E2E mock drift vs live API | Low | Full payload; mirror seed shape |
| Fallback copy slightly longer than spec phrase | Low | Assert existing UI string containing “No hay descripción disponible” |

## Rollback

Single revert of branch `frontend/UXW-02-03-breadcrumbs-description`. Restores broken status quo. No data migration.

## Open Questions

- [x] Q1 ProductCard description — unused → `description: ''` in catalog mappers
- [x] Q2 max-w — `max-w-[12rem]`
- [x] Q3 E2E mock — Option B full payload
- [x] Title strategy — Option A; soften short-label spec in tasks
- [ ] None blocking design
