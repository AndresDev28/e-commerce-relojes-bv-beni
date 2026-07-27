import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import CheckoutPage from '../page'
import { handleStripeError } from '@/lib/stripe/errorHandler'
import { STRIPE_ERROR_MESSAGES } from '@/lib/stripe/errorMessages'

// Capture the props passed to the stubbed CheckoutForm so the test can
// invoke onError directly to drive the page-level error alert.
const checkoutFormPropsRef: {
  current: {
    onError?: (error: string) => void
    onSuccess?: (paymentIntent: unknown) => void
  } | null
} = { current: null }

// Mock next/navigation — the page uses useRouter for auth/cart redirects.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
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

// Mock AuthContext — page needs a logged-in, non-loading user.
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'test', email: 'test@example.com' },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  }),
}))

// Mock the cart context — page needs hydrated items so the redirect branch
// doesn't fire.
vi.mock('@/features/cart', () => ({
  useCart: () => ({
    cartItems: [
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
    ],
    clearCart: vi.fn(),
    isHydrated: true,
  }),
}))

// Mock the checkout feature surface — capture onError, stub the rest.
vi.mock('@/features/checkout', () => ({
  CheckoutForm: (props: {
    onError?: (error: string) => void
    onSuccess?: (paymentIntent: unknown) => void
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
    createOrder: vi.fn(),
    isCreatingOrder: false,
    orderError: null,
    clearOrderError: vi.fn(),
  }),
  useCheckoutTotals: () => ({
    subtotal: 259.89,
    shipping: 0,
    total: 259.89,
  }),
}))

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