# Product Detail Specification

## Purpose

Define product detail behavior for Strapi 5 product descriptions, including markdown conversion, graceful fallback, and type-compatible consumers.

## Requirements

### Requirement: Description Rendering

The product detail page MUST render a non-empty Strapi 5 blocks description as formatted markdown in the page body. Paragraphs MUST render as `<p>`, headings MUST preserve their heading level (`<h2>` or `<h3>`), lists MUST render as `<ul>` and `<li>`, and inline links, bold, and italic MUST retain their semantics and destination.

#### Scenario: Paragraph block

- GIVEN a product description containing a paragraph block
- WHEN the product detail page renders
- THEN the paragraph appears as a `<p>` element

#### Scenario: Heading block

- GIVEN a product description containing a heading block
- WHEN the product detail page renders
- THEN the heading level is preserved as `<h2>` or `<h3>`

#### Scenario: List block

- GIVEN a product description containing list blocks
- WHEN the product detail page renders
- THEN items appear inside `<ul>` and `<li>` elements

#### Scenario: Link inline

- GIVEN a product description containing a link inline
- WHEN the product detail page renders
- THEN an `<a href="https://example.com">` element presents the link text and destination

#### Scenario: Bold and italic inlines

- GIVEN a product description containing bold and italic inlines
- WHEN the product detail page renders
- THEN emphasis appears as `<strong>` and `<em>` elements

### Requirement: Blocks-to-Markdown Conversion

When the frontend receives a Strapi 5 blocks array, it MUST convert the array to a markdown string with `blocksToMarkdown()` from `src/utils/blocks.ts` before passing it to the markdown renderer.

#### Scenario: Paragraph conversion

- GIVEN a paragraph block with text
- WHEN `blocksToMarkdown()` runs
- THEN it returns the text separated by the required blank line, `text\n\n`

#### Scenario: Nested emphasis conversion

- GIVEN a text child marked bold or italic
- WHEN `blocksToMarkdown()` runs
- THEN bold text is returned as `**text**` and italic text as `*text*`

#### Scenario: Link conversion

- GIVEN a text child with a URL
- WHEN `blocksToMarkdown()` runs
- THEN it returns `[text](url)`

#### Scenario: Empty block array

- GIVEN an empty blocks array
- WHEN `blocksToMarkdown()` runs
- THEN it returns an empty string

### Requirement: Empty or Null Description Handling

The product detail page MUST render `No hay descripción disponible` when `description` is `null`, `undefined`, or an empty array, without crashing.

#### Scenario: Null description

- GIVEN `description` is `null`
- WHEN the product detail page renders
- THEN the fallback message is visible and the page does not crash

#### Scenario: Empty description blocks

- GIVEN `description` is an empty array
- WHEN the product detail page renders
- THEN the fallback message is visible and the page does not crash

#### Scenario: Runtime undefined description

- GIVEN the API response omits `description` and supplies `undefined`
- WHEN the product detail page renders
- THEN the fallback message is visible and the page does not crash

### Requirement: StrapiProduct Type Correctness

`StrapiProduct.description` MUST be typed `StrapiBlock[] | null` to match the Strapi 5 schema. The `StrapiBlock` type MUST represent a block's `type` and nested text children, including formatting and URL fields. Product-description consumers MUST NOT assume a string; each consumer MUST accept the blocks shape or receive converted markdown.

#### Scenario: Blocks payload type-checks

- GIVEN a `StrapiProduct` with a Strapi 5 blocks array
- WHEN the frontend type-checks
- THEN the payload compiles without a string guard

#### Scenario: Product detail consumer

- GIVEN the product detail page receives a `StrapiProduct`
- WHEN it renders the description
- THEN it handles null or empty blocks and converted non-empty blocks

#### Scenario: Catalog consumers

- GIVEN `useProducts.ts` and `FeaturedProducts.tsx` receive formatted products
- WHEN they process `description`
- THEN each handles the blocks shape or omits the unused field without a string-only assumption
