import Link from 'next/link'
import type { Breadcrumb } from '@/types/breadcrumb'

interface BreadcrumbsProps {
  breadcrumbs: Breadcrumb[]
}

/**
 * Accessible breadcrumb list.
 *
 * - Wraps the list in `<nav aria-label="Breadcrumb">` (WCAG 2.2 landmark).
 * - Non-trailing items are `next/link` anchors pointing at their `href`.
 * - The trailing item is rendered as a non-link `<span>` inside an
 *   `<li aria-current="page">`, marking the current page for screen readers.
 *
 * The trailing `Breadcrumb.href` is preserved in the data shape for
 * downstream consumers (e.g., a future JSON-LD `BreadcrumbList` emitter)
 * but is informational only — the user never navigates away from the
 * current page.
 */
const Breadcrumbs = ({ breadcrumbs }: BreadcrumbsProps) => {
  const lastIndex = breadcrumbs.length - 1

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-2">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === lastIndex

          return (
            <li
              key={crumb.href}
              aria-current={isLast ? 'page' : undefined}
            >
              <div className="flex items-center text-sm">
                {index > 0 && (
                  <span className="mx-2 text-neutral-medium">/</span>
                )}
                {isLast ? (
                  <span className="font-serif text-neutral-medium">
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="font-serif text-neutral-medium hover:text-primary transition-colors"
                  >
                    {crumb.name}
                  </Link>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs