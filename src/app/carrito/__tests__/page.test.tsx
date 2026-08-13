import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import CartPage from '../page'

// Module-level mutable mocks so vi.mock factories (hoisted above this code)
// see the live values at call time — same pattern as the favorites hook test.
const mockPush = vi.fn()
let mockPathname = '/carrito'
let mockUser: { id: number; username: string; email: string } | null = null
let mockAuthLoading = false

// Mock next/navigation — the page uses useRouter for the auth guard redirect
// and usePathname for the encoded return path.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockPathname,
}))

// Mock next/link — render a plain anchor so we don't pull in Next's router.
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

// Mock next/image — the page imports it for the empty-cart illustration.
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
  }: {
    src: string
    alt: string
  }) => <img src={src} alt={alt} />,
}))

// Mock AuthContext — mutable user/loading so tests can drive the guard.
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: mockAuthLoading,
  }),
}))

// Mock the cart feature — page destructures cartItems/clearCart and renders
// CartItemRow in the populated view (not exercised by the guard tests).
vi.mock('@/features/cart', () => ({
  useCart: () => ({
    cartItems: [],
    clearCart: vi.fn(),
  }),
  CartItemRow: () => <div data-testid="cart-item-row-stub" />,
}))

describe('CartPage - auth guard redirect (DEBT-02)', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockPathname = '/carrito'
    mockUser = null
    mockAuthLoading = false
  })

  it('redirects unauthenticated users to /login?redirect=%2Fcarrito', () => {
    render(<CartPage />)

    expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fcarrito')
  })

  it('does not redirect while auth is still loading', () => {
    mockAuthLoading = true

    render(<CartPage />)

    expect(mockPush).not.toHaveBeenCalled()
  })
})
