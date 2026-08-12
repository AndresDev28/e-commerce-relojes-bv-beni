# UXW-02-03 QA Test Plan — Breadcrumb a11y + Product description rendering

> **Perspective**: external QA tester (no code knowledge beyond what the spec says)
> **Goal**: verify that the breadcrumb tooltip/truncation defense works on long labels and that the product description renders as formatted markdown on `/tienda/{slug}`.
> **Author**: SDD verify phase pre-merge manual Q&A
> **Branch**: `frontend/UXW-02-03-breadcrumbs-description` @ `cfdb7eb` (C2 HEAD; C1 = `0d15f1e`)
> **Last updated**: 2026-08-12

---

## 0. Pre-flight checklist (BEFORE running tests)

This change has **two** setups you need to choose between:

**Option A — Mock Strapi (recommended, deterministic, matches E2E)**:

- [ ] **Mock Strapi running**: `node tests/e2e/mock-strapi-server.mjs` (listens on `:1338`, serves the rich `Classic Chronograph` product at slug `classic-chronograph`)
- [ ] **Frontend running on this branch** pointed at the mock:
  ```bash
  STRAPI_API_URL=http://localhost:1338 \
  NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1338 \
  npm run dev
  ```
- [ ] Confirm branch: `git branch --show-current` → `frontend/UXW-02-03-breadcrumbs-description`
- [ ] Confirm HEAD: `git log --oneline -2` → top commit is `cfdb7eb feat(product-detail): convert Strapi blocks to markdown description (UXW-03)`
- [ ] Dependencies fresh if first time on this branch: `rm -rf .next && npm ci`
- [ ] Browser ready: Chrome or Firefox with DevTools open (Network + Console + Accessibility tabs visible)

**Option B — Real Strapi backend** (if you want to test against actual catalog data):

- [ ] **Backend running**: `cd ../e-commerce-relojes-bv-beni-api && npm run dev` (or remote Strapi URL configured in `.env`)
- [ ] **Frontend running on this branch**: plain `npm run dev` (no STRAPI_API_URL override)
- [ ] Confirm `/tienda` renders multiple cards (need data for the long-name tests)

**For both options**:

- [ ] Confirm you're on `frontend/UXW-02-03-breadcrumbs-description` (NOT main)
- [ ] One incognito window (anonymous), one authenticated window (test user — register at `/registro` if needed)
- [ ] Screen reader available (optional but recommended for a11y scenarios): VoiceOver / NVDA / orca
- [ ] Long product name in the catalog: with the real Strapi you can find a long-name product; with the mock, the slug is `classic-chronograph` (short) — for the long-name breadcrumb tests, **you'll need to create or seed a product with a long name**. If using the mock, see TC-01 "alt" path below.

---

## 1. Critical scenarios (P0 — the bug fix itself)

### TC-01 — Breadcrumb tooltip on long product name (UXW-02)

> **The original bug**: breadcrumb last item cut off mid-character with no `title` attribute. Long product names overflowed on mobile. This test confirms both fixes are in.

- [ ] **Precondition**: a product with a name > 40 chars exists in your test data. If using the mock, the only product is `Classic Chronograph` (short name) — use the **alt path** below.
- [ ] **Step 1**: navigate to `/tienda/{slug-with-long-name}` (e.g., `/tienda/reloj-cronografo-suizo-de-lujo-para-caballero-con-correa-de-cuero`)
- [ ] **Step 2**: look at the breadcrumb. Locate the trailing `<span>` (the current page item, marked with `aria-current="page"`).
- [ ] **Step 3**: hover the trailing span with your mouse
- [ ] **Expected**:
  - A native browser tooltip appears showing the **full product name**
  - The visible text in the breadcrumb is truncated with an ellipsis (`...`)
  - The element has a `title="<full product name>"` attribute (verify in DevTools → Elements)
- [ ] **PASS / FAIL**: _______

**Alt path (mock server + short slug)**:
- [ ] **Step 1**: navigate to `/tienda/classic-chronograph`
- [ ] **Step 2**: open DevTools → Elements → find the trailing `<span aria-current="page">`
- [ ] **Step 3**: confirm it has a `title="Classic Chronograph"` attribute (the design chose Option A: title always present)
- [ ] **PASS / FAIL**: _______

> **Note**: TC-01's short-name behavior was deliberately softened during the design phase (TC-03 scenario). The trailing item now ALWAYS has `title`, even when text fits — that's correct per the locked design decision.

---

### TC-02 — Product description renders as formatted markdown (UXW-03)

> **The original bug**: the product description was fetched from Strapi as `blocks` (array), the frontend guarded with `typeof === 'string'` which is always false, so `cleanDescription = ''` and the user saw "No hay descripción disponible" instead of the actual product description. This test confirms the markdown renders.

- [ ] **Precondition**: mock Strapi running, navigate to `/tienda/classic-chronograph`
- [ ] **Step 1**: scroll to the product description section
- [ ] **Step 2**: confirm you see three distinct blocks:
  - A paragraph: "A timeless classic for any occasion."
  - A heading: "Características" (rendered as `<h2>` — check DevTools)
  - A bulleted list with two items: "Caja de acero inoxidable" and "Resistente al agua"
- [ ] **Step 3**: confirm the fallback "No hay descripción disponible" is NOT shown
- [ ] **Step 4**: open DevTools → Network → confirm `GET /api/products` returns 200 with the blocks array
- [ ] **PASS / FAIL**: _______

> **Why this matters**: SEO (Google now sees the actual description), purchase decision (user can read details), accessibility (screen reader can announce the content).

---

### TC-03 — Breadcrumb tooltip on long ancestor label

> **Defensive**: long names can also appear in ancestor crumbs (e.g., long category name). Design chose to truncate both branches.

- [ ] **Precondition**: a product with a long category name (e.g., `Relojería de Lujo para Caballeros`). If using mock, the category is `Luxury` (short) — use **alt path**.
- [ ] **Step 1**: navigate to `/tienda/{slug}` and inspect the breadcrumb
- [ ] **Step 2**: find a non-trailing crumb that should overflow (the category or `Inicio`)
- [ ] **Step 3**: hover it
- [ ] **Expected**:
  - Tooltip shows the full label
  - Visible text truncates with ellipsis
  - Element has `title="<full label>"` attribute
- [ ] **PASS / FAIL**: _______

**Alt path (mock server)**:
- [ ] **Step 1**: navigate to `/tienda/classic-chronograph`
- [ ] **Step 2**: open DevTools → find the `Inicio` and `Tienda` crumbs (both are Links, not spans)
- [ ] **Step 3**: confirm both have `title="Inicio"` and `title="Tienda"` attributes respectively
- [ ] **PASS / FAIL**: _______

---

### TC-04 — Screen reader reads full breadcrumb label

> **WCAG 2.5.3 "Label in Name"**: even with CSS truncation, the accessible name must contain the full text.

- [ ] **Precondition**: enable VoiceOver (`Cmd+F5`), NVDA, or ORCA. Navigate to a product page with a long product name.
- [ ] **Step 1**: use the screen reader to navigate to the breadcrumb region (it's `<nav aria-label="Breadcrumb">`)
- [ ] **Step 2**: focus the trailing span (current page)
- [ ] **Expected**: screen reader announces the **full product name**, NOT the truncated text. Visual truncation is purely CSS — the text node still contains the full label.
- [ ] **Step 3**: focus a non-trailing link (e.g., the category)
- [ ] **Expected**: same — full label announced
- [ ] **PASS / FAIL**: _______

---

## 2. UX correctness scenarios (P1 — design decisions validation)

### TC-05 — Description with markdown links renders correctly

> **Why this matters**: watch descriptions may contain links (e.g., to brand info or warranty).

- [ ] **Precondition**: stop the mock Strapi. The mock doesn't include link blocks. To test, you can either:
  - (a) modify `tests/e2e/mock-strapi-server.mjs` to add a link block, OR
  - (b) use a real Strapi product with link-rich description, OR
  - (c) trust the unit test in `src/utils/__tests__/blocks.test.ts` line ~30-50 (paragraph + link inline) and skip this TC
- [ ] **Step 1**: navigate to a PDP with a link in the description
- [ ] **Expected**: the link text is rendered as a clickable `<a>` with the correct `href`
- [ ] **PASS / FAIL**: _______ (or "N/A — verified via unit test")

---

### TC-06 — Description with HTML special chars (&, <, >) renders correctly

> **Defensive check**: descriptions may contain entities like "100m & waterproof" or "<30s wind".

- [ ] **Precondition**: the mock's description text doesn't include HTML chars; you may need to modify the mock or use real data.
- [ ] **Step 1**: navigate to the PDP
- [ ] **Expected**: characters render as their literal form (e.g., `&` not `&amp;`), NOT as escaped entities
- [ ] **PASS / FAIL**: _______ (or "N/A — verified via unit test")

---

### TC-07 — Empty description shows graceful fallback

> **Defensive check**: Strapi may return `description: null` for products without descriptions.

- [ ] **Precondition**: a product with `description: null` (no description field in Strapi). Mock doesn't have one — modify the mock to set `description: null` and reload, OR use a real product with no description.
- [ ] **Step 1**: navigate to that PDP
- [ ] **Expected**: section renders the fallback message **"No hay descripción disponible"** (matching `src/features/catalog/components/ProductDetailClient.tsx` L162-164). NO crash, NO blank section.
- [ ] **PASS / FAIL**: _______

---

### TC-08 — Breadcrumb on adjacent routes (regression check)

> **Why this matters**: `Breadcrumbs.tsx` is shared across 14 routes. The fix should not break any of them.

Smoke-test each (just confirm the breadcrumb renders, not the truncation behavior — that was tested in TC-01/03):

- [ ] `/carrito` — breadcrumb shows `Inicio / Carrito`
- [ ] `/checkout` — breadcrumb shows `Inicio / Carrito / Checkout` (or similar)
- [ ] `/favoritos` — breadcrumb shows `Inicio / Favoritos`
- [ ] `/mi-cuenta` — breadcrumb shows `Inicio / Mi cuenta`
- [ ] `/mi-cuenta/pedidos` — 3 levels `Inicio / Mi cuenta / Pedidos`
- [ ] `/login` — breadcrumb shows `Inicio / Login`
- [ ] `/registro` — breadcrumb shows `Inicio / Registro`
- [ ] `/tienda` — breadcrumb shows `Inicio / Tienda`

For each route: confirm `<nav aria-label="Breadcrumb">` is present and the trailing item has `aria-current="page"`. Title attribute may or may not be present (it's there per design but doesn't need to be checked again).

- [ ] **PASS / FAIL**: _______ (one PASS covers all 8 if they all rendered correctly)

---

### TC-09 — Catalog pagination / load-more still works (regression check)

> **Why this matters**: the change touches catalog types (`useProducts.ts`, `FeaturedProducts.tsx`). Make sure pagination didn't break.

- [ ] **Precondition**: real Strapi with >12 products (or use mock seed data), navigate to `/tienda`
- [ ] **Step 1**: scroll to the bottom of the catalog grid
- [ ] **Step 2**: confirm "Cargar más" (or similar) button appears
- [ ] **Step 3**: click it
- [ ] **Expected**: more product cards load, no console errors, no 500 from the API
- [ ] **PASS / FAIL**: _______

---

## 3. Edge cases (P2 — defensive checks)

### TC-10 — Mobile viewport doesn't break breadcrumbs

> **Why this matters**: BV Beni is mobile-first. The truncation defense is for mobile.

- [ ] **Precondition**: Chrome DevTools → toggle device toolbar (`Cmd+Shift+M`) → select "iPhone 14 Pro" or similar
- [ ] **Step 1**: navigate to `/tienda/{slug-with-long-name}` on mobile viewport
- [ ] **Step 2**: confirm the breadcrumb doesn't overflow the viewport horizontally (page should NOT scroll horizontally)
- [ ] **Step 3**: confirm the trailing span truncates with ellipsis (not bleeding off-screen)
- [ ] **PASS / FAIL**: _______

---

### TC-11 — Page renders without JS (SSR)

> **Why this matters**: the description rendering is server-side. JS-disabled users should still see the description.

- [ ] **Precondition**: Chrome DevTools → Network → "Disable cache" + DevTools → Command Menu → "Show JavaScript coverage" or use `curl`
- [ ] **Step 1**: `curl -s http://localhost:3000/tienda/classic-chronograph | grep -A 2 "A timeless classic"`
- [ ] **Expected**: the paragraph text appears in the raw HTML (server-rendered), not just hydrated client-side
- [ ] **PASS / FAIL**: _______

---

### TC-12 — Description with mixed markdown (paragraph + heading + list + link)

> **Why this matters**: the converter supports multiple block types in sequence. Verify they all render in order.

- [ ] **Precondition**: the mock description has paragraph + heading + list. That's TC-02.
- [ ] **Step 1**: scroll the description and confirm visual order:
  1. Paragraph
  2. Heading
  3. List with items
- [ ] **Expected**: rendered in that exact order, no reshuffling
- [ ] **PASS / FAIL**: _______

---

### TC-13 — Empty/null description fallback (P2 variant)

> **Defensive**: also covers `description: undefined` (if Strapi omits the field entirely).

- [ ] **Precondition**: modify `tests/e2e/mock-strapi-server.mjs` to set `description: undefined` (omit the field)
- [ ] **Step 1**: navigate to `/tienda/classic-chronograph`
- [ ] **Expected**: fallback message shows, no crash
- [ ] **PASS / FAIL**: _______

---

### TC-14 — Catalog grid (`/tienda`) ProductCard doesn't show description

> **Why this matters**: the design removed `description` from catalog mappers (ProductCard never read it). Confirm ProductCard still renders name/price/image.

- [ ] **Precondition**: navigate to `/tienda`
- [ ] **Step 1**: inspect any product card
- [ ] **Expected**: card shows image, name, price — NO description text
- [ ] **PASS / FAIL**: _______

---

## 4. Regression sweep (P2 — make sure nothing else broke)

Quick smoke tests on adjacent features. These don't need exhaustive coverage; just confirm nothing visibly regressed.

- [ ] **TC-15** — `/` (home page) loads, hero banner renders
- [ ] **TC-16** — Add an item to cart from `/tienda/{slug}` — cart icon shows count
- [ ] **TC-17** — Add an item to favorites (authenticated) — heart fills
- [ ] **TC-18** — Login flow at `/login` — works (does NOT need to honor `?redirect=`, that's DEBT-LOGIN-REDIRECT follow-up)
- [ ] **TC-19** — Logout from header — returns to anon state

---

## 5. Reporting

When you finish testing, report results in this format:

```markdown
## UXW-02-03 QA Report

**Tester**: <your name>
**Date**: YYYY-MM-DD
**Branch**: frontend/UXW-02-03-breadcrumbs-description @ <commit-sha>
**Environment**: <mock Strapi / real Strapi>
**Setup**: <mock:1338 or real backend>

### Results

| TC ID | Status | Notes |
|-------|--------|-------|
| TC-01 | ✅ PASS / ❌ FAIL | <observation> |
| TC-02 | ✅ PASS / ❌ FAIL | <observation> |
| TC-03 | ✅ PASS / ❌ FAIL | <observation> |
| TC-04 | ✅ PASS / ❌ FAIL | <observation> |
| TC-05 | ✅ PASS / ❌ FAIL / N/A | <observation> |
| TC-06 | ✅ PASS / ❌ FAIL / N/A | <observation> |
| TC-07 | ✅ PASS / ❌ FAIL | <observation> |
| TC-08 | ✅ PASS / ❌ FAIL | <observation> |
| TC-09 | ✅ PASS / ❌ FAIL | <observation> |
| TC-10 | ✅ PASS / ❌ FAIL | <observation> |
| TC-11 | ✅ PASS / ❌ FAIL | <observation> |
| TC-12 | ✅ PASS / ❌ FAIL | <observation> |
| TC-13 | ✅ PASS / ❌ FAIL | <observation> |
| TC-14 | ✅ PASS / ❌ FAIL | <observation> |
| TC-15..19 | ✅ PASS | <smoke tests, no notes> |

### Summary

- P0 results: X/Y passed (TC-01, TC-02, TC-03, TC-04)
- P1 results: X/Y passed (TC-05..09)
- P2 results: X/Y passed (TC-10..19)
- Known debt confirmed: NO new debt (the 21 pre-existing Vitest failures are jsdom gap, unrelated)

### Blockers (if any)

<list of issues that block merge>

### Recommended action

- ✅ READY TO MERGE
- ⚠️ MERGE WITH MINOR FOLLOW-UPS (list them)
- ❌ BLOCK MERGE (list blocking issues)
```

---

## 6. Quick reference

**Routes that exist** (don't go hunting for ones that don't):
- `/`, `/tienda`, `/tienda/{slug}` (PDP)
- `/carrito`, `/checkout`
- `/favoritos`, `/mi-cuenta`, `/mi-cuenta/pedidos`, `/mi-cuenta/pedidos/{orderId}`
- `/login`, `/registro`

**Routes that DO NOT exist**:
- `/productos/{id}` — does NOT exist. Detail page is `/tienda/{slug}`.

**Mock product** (when using `tests/e2e/mock-strapi-server.mjs`):
- Slug: `classic-chronograph`
- Name: `Classic Chronograph`
- Price: $259.99
- Description blocks: paragraph ("A timeless classic for any occasion.") + h2 ("Características") + unordered list (2 items)

**Network expectations** (mock server, DevTools Network tab):
- `GET http://localhost:1338/api/products` → 200 with `data: [PRODUCT]`
- `GET http://localhost:1338/api/categories` → 200 with `data: [CATEGORIES]`
- Strapi calls hit `localhost:1338` (mock), not `localhost:1337` (real)

**Console expectations**:
- Zero errors during TC-01, TC-02 (the bug-fix TCs)
- React `act(...)` warnings are non-blocking (pre-existing suggestion, unrelated to this change)

**Setup commands cheatsheet**:
```bash
# Terminal 1: mock Strapi
node tests/e2e/mock-strapi-server.mjs

# Terminal 2: dev server pointed at mock
STRAPI_API_URL=http://localhost:1338 \
NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1338 \
npm run dev

# Browser
open http://localhost:3000/tienda/classic-chronograph

# When done
pkill -f "next dev"
pkill -f "mock-strapi-server.mjs"
```
