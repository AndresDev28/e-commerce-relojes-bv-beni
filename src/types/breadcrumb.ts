/**
 * Single source of truth for breadcrumb data.
 *
 * Both visible labels and target URLs are required for every item. The
 * `<Breadcrumbs>` molecule renders non-trailing items as `next/link` anchors
 * pointing at `href`, and the trailing item as a non-link `<span>` whose
 * `aria-current="page"` marks the current page for screen readers (WCAG 2.2).
 * The trailing `href` is preserved in the data shape for downstream consumers
 * (e.g., a future JSON-LD `BreadcrumbList` emitter) but is informational only
 * — the component never navigates away from the current page.
 */

/**
 * A single breadcrumb item.
 *
 * @property name - Visible label rendered to the user (es-ES literal).
 * @property href - Target URL. Informational for the trailing item; the
 *                  component renders trailing items as `<span aria-current="page">`.
 */
export interface Breadcrumb {
  /** Visible label rendered to the user (es-ES literal). */
  name: string
  /** Target URL. Informational for the trailing item. */
  href: string
}