# Catalog Load More Specification

## Purpose

Define paginated product fetching, "Load More" interaction, and URL synchronization for the catalog grid.

## Requirements

### Requirement: Paginated Product Fetching

The system MUST fetch products in paginated batches with a stable secondary sort by `id:asc`. The `getProducts()` service MUST use Strapi v4 array syntax (`sort[0]`, `sort[1]`). The default page size SHALL remain 8 items. Backward compatibility without params MUST be preserved.

#### Scenario: Initial catalog load

- GIVEN the user visits `/tienda`
- WHEN the catalog page renders
- THEN the first 8 products are fetched and displayed with `sort[0]=id:asc`

#### Scenario: Load more products

- GIVEN the catalog shows page 1 of products
- WHEN the user clicks the "Load More" button
- THEN the next 8 products are fetched and appended to the grid with the same stable sort

#### Scenario: Explicit sort

- GIVEN sort "price-asc" is selected
- WHEN products fetch
- THEN the request contains `sort[0]=price:asc` and `sort[1]=id:asc`

#### Scenario: Backward-compatible un-paginated call

- GIVEN a consumer calls `getProducts()` without pagination params
- WHEN the request executes
- THEN all matching products are returned (existing behavior preserved)

### Requirement: Product Deduplication on Accumulation

The system MUST deduplicate accumulated products by ID before state update. Duplicate IDs across pages SHALL be reduced to the first occurrence.

#### Scenario: Duplicate across pages

- GIVEN product ID 42 exists on page 1 and page 2
- WHEN pages are accumulated
- THEN product 42 appears exactly once

#### Scenario: 102-product catalog

- GIVEN 102 products in Strapi
- WHEN all pages load
- THEN the accumulated list contains 102 unique IDs
- AND zero React duplicate-key warnings fire

### Requirement: URL Synchronization

The system MUST synchronize `page`, `category`, and `sort` state to the URL query string. The page MUST be represented as `?page=N`. Category and sort MUST use `category` and `sort` keys respectively.

#### Scenario: Shareable filtered URL

- GIVEN the user selects category "sport" and sort "price-asc"
- WHEN the state updates
- THEN the URL becomes `/tienda?page=1&category=sport&sort=price-asc`

#### Scenario: Refresh restores view

- GIVEN the URL contains `?page=2&category=dress&sort=name-asc`
- WHEN the user refreshes the browser
- THEN the catalog restores the same 16 products with the same filters applied

### Requirement: Filter Change Reset

The system MUST reset accumulated products to page 1 whenever the category or sort filter changes.

#### Scenario: Category change resets pagination

- GIVEN the user is on page 3 of "sport" watches
- WHEN the user changes category to "dress"
- THEN the grid resets to page 1 of "dress" watches and the URL updates to `page=1`

### Requirement: Client-Side Interaction Performance

The system MUST meet Core Web Vitals thresholds during load-more interaction. New items appended to the grid MUST NOT cause cumulative layout shift.

#### Scenario: Load more without full reload

- GIVEN the catalog displays the first 8 products
- WHEN the user clicks "Load More"
- THEN new products are appended without a full page reload and INP remains below 200 ms

#### Scenario: No layout shift on append

- GIVEN the grid reserves fixed item dimensions via CSS
- WHEN additional products are appended
- THEN CLS remains at or below 0.1

### Requirement: LCP Budget

The system MUST load the initial 8 products server-side or during hydration such that LCP remains below 2.5 seconds.

#### Scenario: Initial page load performance

- GIVEN the user navigates to `/tienda`
- WHEN the page loads
- THEN the largest contentful paint occurs within 2.5 seconds
