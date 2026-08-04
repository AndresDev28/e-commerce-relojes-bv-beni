# Delta for Catalog Load More

## MODIFIED Requirements

### Requirement: Paginated Product Fetching

The system MUST fetch products in paginated batches with a stable secondary sort by `id:asc`. The `getProducts()` service MUST issue exactly one request per call and MUST use Strapi v4 array syntax (`sort[0]`, `sort[1]`). The default page size SHALL remain 8 items. Backward compatibility without params MUST be preserved. Errors from the product fetch MUST be mapped to friendly, non-technical messages surfaced in the UI.
(Previously: did not require a single request per call and did not require friendly error mapping.)

#### Scenario: Initial catalog load

- GIVEN the user visits `/tienda`
- WHEN the catalog page renders
- THEN exactly one request fetches the first 8 products with `sort[0]=id:asc`

#### Scenario: Load more products

- GIVEN the catalog shows page 1 of products
- WHEN the user clicks the "Load More" button
- THEN exactly one request fetches the next 8 products and appends them to the grid with the same stable sort

#### Scenario: Explicit sort

- GIVEN sort "price-asc" is selected
- WHEN products fetch
- THEN a single request contains `sort[0]=price:asc` and `sort[1]=id:asc`

#### Scenario: Backward-compatible un-paginated call

- GIVEN a consumer calls `getProducts()` without pagination params
- WHEN the request executes
- THEN all matching products are returned in a single request (existing behavior preserved)

#### Scenario: Network failure surfaces friendly message

- GIVEN the Strapi request fails
- WHEN the error is handled
- THEN the UI displays a friendly message instead of the raw HTTP error text

#### Scenario: Strapi error response surfaces friendly message

- GIVEN Strapi returns a 4xx or 5xx response
- WHEN the error is handled
- THEN the UI displays a mapped friendly message that does not expose internal details
