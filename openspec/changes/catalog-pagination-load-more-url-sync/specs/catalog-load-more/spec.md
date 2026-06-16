# Catalog Load More Specification

## Purpose

Define paginated product fetching, "Load More" interaction, and URL synchronization for the catalog grid.

## Requirements

### Requirement: Paginated Product Fetching

The system MUST fetch products from Strapi in paginated batches. The default page size SHALL be 8 items. The `getProducts()` service MUST remain backward-compatible when no pagination params are provided.

#### Scenario: Initial catalog load

- GIVEN the user visits `/tienda`
- WHEN the catalog page renders
- THEN the first 8 products are fetched and displayed

#### Scenario: Load more products

- GIVEN the catalog shows page 1 of products
- WHEN the user clicks the "Load More" button
- THEN the next 8 products are fetched and appended to the grid

#### Scenario: Backward-compatible un-paginated call

- GIVEN a consumer calls `getProducts()` without pagination params
- WHEN the request executes
- THEN all matching products are returned (existing behavior preserved)

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
