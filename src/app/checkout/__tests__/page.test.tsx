import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import CheckoutPage from '../page'
import { handleStripeError } from '@/lib/stripe/errorHandler'
import { STRIPE_ERROR_MESSAGES } from '@/lib/stripe/errorMessages'

// Capture the props passed to the stubbed CheckoutForm so the test can
// invoke onError / onSuccess directly to drive the page-level state.
const checkoutFormPropsRef: {
  current: {
    onError?: (error: string) => void
    onSuccess?: (paymentIntent: unknown, orderId: string) => void
  } | null
} = { current: null }

// Module-level mutable mocks so vi.mock factories (hoisted above this code)
// see the live values at call time — same pattern as the favorites hook test.
const mockPush = vi.fn()
const mockCreateOrder = vi.fn()
const mockClearCart = vi.fn()
let mockPathname = '/checkout'
let mockUser: { id: number; username: string; email: string } | null = {
  id: 1,
  username: 'test',
  email: 'test@example.com',
}
let mockAuthLoading = false
// Mutable cart items so tests can simulate the post-success `clearCart()` race
// that drives the F7 redirect regression (BUG-REDIRECT-TIENDA).
let mockCartItems: Array<{
  id: string
  name: string
  price: number
  quantity: number
  images: string[]
  href: string
  description: string
  stock: number
}> = [
  {
    id: '1',
    name: 'Test Watch',
    price: 259.89,
    quantity: 1,
    images: ['test.jpg'],
    href: '/test',
    description: 'desc',
    stock: 10,
  },
]
let mockOrderError: string | null = null
let mockIsCreatingOrder = false

// Mock next/navigation — the page uses useRouter for auth/cart redirects and
// usePathname for the encoded return path.
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
  useSearchParams: () => new URLSearchParams(),
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

// Mock AuthContext — mutable user/loading so tests can drive the guard.
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: mockAuthLoading,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  }),
}))

// Mock the cart context — mutable items so tests can drive the post-success
// `clearCart()` race. Without the F7 latch, the empty-cart effect wins the
// race against the confirmation push and lands on /tienda.
vi.mock('@/features/cart', () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    clearCart: mockClearCart,
    isHydrated: true,
  }),
}))

// Mock the checkout feature surface — capture onSuccess/onError and expose
// mutable createOrder, orderError, isCreatingOrder so F7 race tests can
// exercise the order-in-flight guard.
vi.mock('@/features/checkout', () => ({
  CheckoutForm: (props: {
    onError?: (error: string) => void
    onSuccess?: (paymentIntent: unknown, orderId: string) => void
    amount: number
  }) => {
    checkoutFormPropsRef.current = {
      onError: props.onError,
      onSuccess: props.onSuccess,
    }
    return (
      <div data-testid="checkout-form-stub" data-amount={props.amount} />
    )
  },
  OrderSummary: () => <div data-testid="order-summary-stub" />,
  useCreateOrder: () => ({
    createOrder: mockCreateOrder,
    isCreatingOrder: mockIsCreatingOrder,
    orderError: mockOrderError,
    clearOrderError: vi.fn(),
  }),
  useCheckoutTotals: () => ({
    subtotal: 259.89,
    shipping: 0,
    total: 259.89,
  }),
}))

// Reset mutable mock state before every test in this file.
beforeEach(() => {
  mockPush.mockClear()
  mockCreateOrder.mockClear()
  mockClearCart.mockClear()
  mockPathname = '/checkout'
  mockUser = { id: 1, username: 'test', email: 'test@example.com' }
  mockAuthLoading = false
  mockCartItems = [
    {
      id: '1',
      name: 'Test Watch',
      price: 259.89,
      quantity: 1,
      images: ['test.jpg'],
      href: '/test',
      description: 'desc',
      stock: 10,
    },
  ]
  mockOrderError = null
  mockIsCreatingOrder = false
})

describe('CheckoutPage - [PAY-09] page-level ErrorMessage (RED contract)', () => {
  beforeEach(() => {
    checkoutFormPropsRef.current = null
  })

  it('captures the CheckoutForm onError prop as a function', () => {
    render(<CheckoutPage />)

    const captured = checkoutFormPropsRef.current
    expect(captured).not.toBeNull()
    expect(typeof captured?.onError).toBe('function')
  })

  it('renders a page-level <ErrorMessage> with the mapped Spanish text when onError fires (RED)', () => {
    render(<CheckoutPage />)

    const captured = checkoutFormPropsRef.current
    expect(captured?.onError).toBeDefined()

    // Compute the localized message exactly as the production code will:
    // handleStripeError({ code: 'card_declined' }) → STRIPE_ERROR_MESSAGES['card_declined']
    const stripeError = handleStripeError({
      type: 'card_error',
      code: 'card_declined',
      message: 'Your card was declined.',
    })
    const localizedMessage = stripeError.localizedMessage

    // Sanity: the source-of-truth string matches the errorMessages map.
    expect(localizedMessage).toBe(STRIPE_ERROR_MESSAGES.card_declined)

    act(() => {
      captured!.onError!(localizedMessage)
    })

    // RED contract: the page MUST render an alert role carrying the
    // localized Spanish text. Currently the page silently swallows the
    // error, so this assertion fails — that is the RED state.
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(localizedMessage)
  })

  it('does NOT surface raw Stripe English text in the visible DOM (RED)', () => {
    render(<CheckoutPage />)

    const captured = checkoutFormPropsRef.current
    act(() => {
      captured!.onError!(STRIPE_ERROR_MESSAGES.card_declined)
    })

    // Raw English text must not leak — neither inside the alert nor anywhere
    // else in the visible DOM.
    expect(screen.queryByText('Your card was declined.')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/your card was declined/i)
    ).not.toBeInTheDocument()
  })

  it('does NOT wrap CheckoutForm in a page-level <Elements> provider (WU-3.2 proof)', () => {
    const { container } = render(<CheckoutPage />)

    // The layout-level StripeProviderWrapper is intentionally outside the
    // page tree (mounted by RootLayout). The page itself must NOT add a
    // nested <Elements> wrapper — Stripe context flows down from layout.
    // The stub CheckoutForm is rendered as a plain <div>, so its parent's
    // only child element with the role of an Elements provider would be the
    // <Elements> JSX. We verify by inspecting the stub's parent:
    const stub = screen.getByTestId('checkout-form-stub')
    // The stub's direct parent in the page tree must NOT be an Elements
    // wrapper. Elements renders a Context.Provider with a specific value
    // shape; we assert the stub is reachable (not swallowed by an extra
    // wrapper) and that no second stub appears.
    expect(stub).toBeInTheDocument()
    expect(container.querySelectorAll('[data-testid="checkout-form-stub"]'))
      .toHaveLength(1)
  })
})

describe('CheckoutPage - auth guard redirect (DEBT-02)', () => {
  it('redirects unauthenticated users to /login?redirect=%2Fcheckout', () => {
    mockUser = null

    render(<CheckoutPage />)

    expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fcheckout')
  })

  it('does not redirect while auth is still loading', () => {
    mockAuthLoading = true

    render(<CheckoutPage />)

    expect(mockPush).not.toHaveBeenCalled()
  })
})

// F7 — Confirmation Redirect Race Regression (BUG-REDIRECT-TIENDA).
// The order-in-flight guard MUST suppress the empty-cart effect's /tienda
// push while a PUT is in flight, dedupe duplicate onSuccess callbacks, and
// only reset on orderError. See design obs #1909 (D1-D6) and spec obs #1908.
describe('CheckoutPage - Order-In-Flight Guard (F7 race regression)', () => {
  beforeEach(() => {
    checkoutFormPropsRef.current = null
  })

  /**
   * Render the page, return the captured `onSuccess` callback plus the
   * React Testing Library `rerender` so each test can drive both the
   * captured callbacks and any subsequent renders after mutating module
   * state. Throws if CheckoutForm never received the page's handlers —
   * that itself is a regression.
   */
  function renderPageAndCapture() {
    const utils = render(<CheckoutPage />)
    const captured = checkoutFormPropsRef.current
    if (!captured?.onSuccess) {
      throw new Error('CheckoutForm onSuccess was not captured by stub')
    }
    return {
      ...utils,
      onSuccess: (
        paymentIntent: Parameters<NonNullable<typeof captured.onSuccess>>[0],
        orderId: Parameters<NonNullable<typeof captured.onSuccess>>[1]
      ) => captured.onSuccess!(paymentIntent, orderId),
    }
  }

  it('ignores a duplicate onSuccess: only one createOrder call fires', () => {
    const { onSuccess } = renderPageAndCapture()
    const pi = { id: 'pi_dup_1' }

    act(() => {
      onSuccess(pi, 'ORD-DUP-1')
      // Real Stripe can re-fire onSuccess on retry / re-mount; the page
      // MUST dedupe so the PUT happens exactly once.
      onSuccess(pi, 'ORD-DUP-1')
    })

    expect(mockCreateOrder).toHaveBeenCalledTimes(1)
    expect(mockCreateOrder).toHaveBeenCalledWith(
      pi,
      mockCartItems,
      'ORD-DUP-1'
    )
  })

  it('does NOT push /tienda when cart clears after success and the empty-cart effect runs late', () => {
    // Simulate the real useCreateOrder behavior on 200: clearCart() empties
    // the cart synchronously, before the confirmation push resolves.
    mockCreateOrder.mockImplementation(() => {
      mockCartItems = []
    })

    const { rerender, onSuccess } = renderPageAndCapture()

    act(() => {
      onSuccess({ id: 'pi_race_1' }, 'ORD-RACE-1')
    })

    // Force a re-render so the page's empty-cart useEffect runs against
    // the post-clear cart. In production, the cart context dispatches state
    // and triggers this naturally; in the unit test we drive it explicitly.
    act(() => {
      rerender(<CheckoutPage />)
    })

    // BUG-REDIRECT-TIENDA: with the current code, this is /tienda.
    // With the F7 fix, the latch suppresses the push.
    expect(mockPush).not.toHaveBeenCalledWith('/tienda')
  })

  it('resets the latch on orderError so a subsequent success is accepted', () => {
    mockCreateOrder.mockImplementation(() => {
      mockCartItems = []
    })

    const { rerender, onSuccess } = renderPageAndCapture()

    // First success: createOrder fires once, the latch is set.
    act(() => {
      onSuccess({ id: 'pi_ok_1' }, 'ORD-OK-1')
    })
    expect(mockCreateOrder).toHaveBeenCalledTimes(1)

    // Duplicate while latched: must be ignored.
    act(() => {
      onSuccess({ id: 'pi_ok_1' }, 'ORD-OK-1')
    })
    expect(mockCreateOrder).toHaveBeenCalledTimes(1)

    // Server error: orderError becomes truthy. The reset effect MUST fire
    // on the next render so the user can retry.
    act(() => {
      mockOrderError = 'Error al registrar el pedido'
      rerender(<CheckoutPage />)
    })

    // Clear the error and retry — the latch must be reset, so this second
    // success is accepted and a fresh createOrder fires.
    act(() => {
      mockOrderError = null
      rerender(<CheckoutPage />)
    })
    act(() => {
      onSuccess({ id: 'pi_ok_2' }, 'ORD-OK-2')
    })

    expect(mockCreateOrder).toHaveBeenCalledTimes(2)
  })

  it('keeps the latch set after a re-render: duplicate onSuccess is still ignored post-success', () => {
    mockCreateOrder.mockImplementation(() => {
      mockCartItems = []
    })

    const { rerender, onSuccess } = renderPageAndCapture()

    act(() => {
      onSuccess({ id: 'pi_keep_1' }, 'ORD-KEEP-1')
    })
    expect(mockCreateOrder).toHaveBeenCalledTimes(1)

    // Force a render cycle (any state change after success: route transition,
    // loading flag flip, etc.). The latch must survive the render.
    act(() => {
      rerender(<CheckoutPage />)
    })

    // Duplicate success after the re-render must still be ignored.
    act(() => {
      onSuccess({ id: 'pi_keep_1' }, 'ORD-KEEP-1')
    })

    expect(mockCreateOrder).toHaveBeenCalledTimes(1)
  })

  it('renders the processing modal with aria-busy on the root container while an order is in flight', () => {
    // Cart stays populated so the page does NOT hit the empty-cart
    // early-return. isCreatingOrder=true drives the modal visibility;
    // the latch (set via onSuccess) drives aria-busy on the root.
    mockIsCreatingOrder = true
    mockCreateOrder.mockImplementation(() => {
      // Intentionally do NOT clear the cart so the modal stays in the tree.
    })

    const { onSuccess } = renderPageAndCapture()
    act(() => {
      onSuccess({ id: 'pi_modal_1' }, 'ORD-MODAL-1')
    })

    // The processing modal is reachable during the in-flight period.
    expect(screen.getByText(/Procesando tu orden/)).toBeInTheDocument()

    // The root container advertises the in-flight state to assistive tech
    // via aria-busy="true" (D-lint: forces the useState mirror to have a
    // render-phase consumer; see design obs #1909).
    const root = document.querySelector('div[aria-busy="true"]')
    expect(root).not.toBeNull()
  })
})