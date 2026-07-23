import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Home from '../page'
import type { Breadcrumb } from '@/types/breadcrumb'

interface BreadcrumbsProps {
  breadcrumbs: Breadcrumb[]
}

const testState = vi.hoisted(() => ({
  getProducts: vi.fn(),
  getCategories: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  getProducts: testState.getProducts,
  getCategories: testState.getCategories,
}))

describe('Home breadcrumbs', () => {
  beforeEach(() => {
    testState.getProducts.mockResolvedValue([])
    testState.getCategories.mockResolvedValue([])
  })

  it('passes the home breadcrumb list to Breadcrumbs', async () => {
    const home = await Home()
    render(home)

    expect(
      screen.getByRole('navigation', { name: 'Breadcrumb' }),
    ).toBeInTheDocument()

    const homeChildren = Children.toArray(
      (home as ReactElement<{ children: ReactNode }>).props.children,
    )
    const breadcrumb = homeChildren[0]

    expect(isValidElement<BreadcrumbsProps>(breadcrumb)).toBe(true)
    if (!isValidElement<BreadcrumbsProps>(breadcrumb)) {
      throw new Error('Expected the first home page child to be Breadcrumbs')
    }

    expect(breadcrumb.type).toBe(Breadcrumbs)
    expect(breadcrumb.props.breadcrumbs).toEqual([{ name: 'Inicio', href: '/' }])
  })
})
