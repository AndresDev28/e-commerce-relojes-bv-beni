/**
 * [BREAD-03] <Breadcrumbs> a11y contract.
 *
 * Per design Decision 3 and spec "Accessibility Semantics":
 * - <nav aria-label="Breadcrumb"> wraps the list
 * - Exactly the trailing <li> carries aria-current="page"
 * - The trailing item is rendered as a <span>, NOT as a link
 * - Non-trailing items render as <a> tags with matching href
 *
 * Renders the real component (no mock) and inspects the DOM with
 * Testing Library roles.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import Breadcrumbs from '../Breadcrumbs'

describe('[BREAD-03] <Breadcrumbs> a11y contract', () => {
  const sample = [
    { name: 'Inicio', href: '/' },
    { name: 'Tienda', href: '/tienda' },
    { name: 'Cronómetros', href: '/tienda?category=cronometros' },
  ]

  describe('Landmark', () => {
    it('wraps the list in a <nav aria-label="Breadcrumb">', () => {
      render(<Breadcrumbs breadcrumbs={sample} />)
      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
      expect(nav).toBeInTheDocument()
    })
  })

  describe('Trailing item — #3 aria-current="page"', () => {
    it('marks exactly one <li> as aria-current="page"', () => {
      const { container } = render(<Breadcrumbs breadcrumbs={sample} />)
      const currentItems = container.querySelectorAll('li[aria-current="page"]')
      expect(currentItems).toHaveLength(1)
    })

    it('renders the trailing item as a <span> (NOT as a link)', () => {
      const { container } = render(<Breadcrumbs breadcrumbs={sample} />)
      const currentLi = container.querySelector(
        'li[aria-current="page"]',
      ) as HTMLElement | null
      expect(currentLi).not.toBeNull()

      // Inside the trailing <li>, the visible label lives in a <span>.
      // (The component also renders an inter-item separator span ('/') when
      // index > 0, so we look for the span whose text matches the label —
      // that is the label <span>, not the separator.)
      const spans = currentLi!.querySelectorAll('span')
      const labelSpan = Array.from(spans).find(
        (s) => s.textContent === 'Cronómetros',
      )
      expect(labelSpan).toBeDefined()
      expect(labelSpan!.textContent).toBe('Cronómetros')

      // And there is NO anchor inside the trailing <li>.
      const anchor = currentLi!.querySelector('a')
      expect(anchor).toBeNull()
    })
  })

  describe('Non-trailing items — earlier items are <a> with matching href', () => {
    it('renders each non-trailing item as an <a> tag pointing at its href', () => {
      const { container } = render(<Breadcrumbs breadcrumbs={sample} />)
      const list = screen.getByRole('list')
      const items = within(list).getAllByRole('listitem')

      // 3 items total
      expect(items).toHaveLength(3)

      // Items 0 and 1 are <a> with matching href
      const firstLi = items[0]
      const secondLi = items[1]
      const thirdLi = items[2]

      const firstAnchor = firstLi.querySelector('a')
      const secondAnchor = secondLi.querySelector('a')

      expect(firstAnchor).not.toBeNull()
      expect(firstAnchor!.getAttribute('href')).toBe('/')
      expect(firstAnchor!.textContent).toBe('Inicio')

      expect(secondAnchor).not.toBeNull()
      expect(secondAnchor!.getAttribute('href')).toBe('/tienda')
      expect(secondAnchor!.textContent).toBe('Tienda')

      // Trailing <li> does NOT contain an <a>
      expect(thirdLi.querySelector('a')).toBeNull()
    })
  })

  describe('Edge cases', () => {
    it('handles a single-item list (single item is both first and trailing)', () => {
      const { container } = render(
        <Breadcrumbs breadcrumbs={[{ name: 'Inicio', href: '/' }]} />,
      )
      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
      expect(nav).toBeInTheDocument()

      const listItems = container.querySelectorAll('li')
      expect(listItems).toHaveLength(1)

      // The single <li> is the trailing one.
      const onlyLi = listItems[0] as HTMLElement
      expect(onlyLi.getAttribute('aria-current')).toBe('page')
      // And it renders as a <span>, not a link.
      expect(onlyLi.querySelector('span')).not.toBeNull()
      expect(onlyLi.querySelector('a')).toBeNull()
    })
  })
})