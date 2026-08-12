# Delta for Breadcrumbs

## ADDED Requirements

### Requirement: Tooltip & Truncation Defense (UXW-02)

The breadcrumb renderer MUST preserve each item's full label while controlling overflow. If a trailing current-page item or a non-trailing ancestor link exceeds the available width, the rendered text MUST truncate with an ellipsis and the corresponding element MUST expose the full label through a `title` attribute. The `title` attribute is always rendered on every breadcrumb item (native browser tooltip behavior); truncation CSS no-ops when text fits.

#### Scenario: Long trailing current-page label

- GIVEN a breadcrumb list whose trailing item has a long label
- WHEN its available width is narrower than the label
- THEN the trailing label truncates with an ellipsis
- AND its element exposes the full label through `title`

#### Scenario: Long non-trailing ancestor label

- GIVEN a breadcrumb list with a long non-trailing ancestor label
- WHEN its available width is narrower than the label
- THEN the link text truncates with an ellipsis
- AND the link exposes the full label through `title`

#### Scenario: Short label

- GIVEN a breadcrumb item whose label fits within the available width
- WHEN the breadcrumb renders
- THEN its text remains complete without truncation
- AND its element still exposes the full label through `title` (native browser tooltip on all labels)

#### Scenario: Screen reader label

- GIVEN a breadcrumb list with an overflowing item
- WHEN a screen reader announces the breadcrumb
- THEN every item's full label is included in its accessible name rather than only the truncated visual text (WCAG 2.5.3 Label in Name)
