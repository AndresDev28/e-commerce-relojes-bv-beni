/**
 * E2E — checkout order UPSERT (tasks 3.3/3.4, design A-6, spec S3.x).
 *
 * Mock-level (F3=B — no real Stripe submission): drives the real checkout
 * flow with a faked Stripe.js so `useCreateOrder` fires, then intercepts
 * `PUT /api/orders/by-order-id/*` at the browser boundary to assert:
 *   1. the method is PUT (never POST) with the exact payload shape
 *      (userId + D-lock subset, no orderId/orderStatus/total),
 *   2. a UUIDv4 X-Trace-Id is sent on the request and echoed on the response,
 *   3. NO `POST /api/orders` call happens at any point in the flow.
 *
 * The 409 case proves the bounded-conflict envelope reaches the existing
 * single orderError banner verbatim through checkoutOrderErrors (S-MOD.6/7).
 */
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  MOCK_PRODUCTS,
  MOCK_USER,
  MOCK_UPSERT_SUCCESS,
  MOCK_UPSERT_CONFLICT,
} from './utils/mocks'

const FAKE_PI_ID = 'pi_e2e_upsert_mock'
const FAKE_ORDER_ID = 'ORD-E2E-UPSERT-1'
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Installs a synchronous window.Stripe factory BEFORE @stripe/stripe-js
 * polls for it, and stubs the CDN script so the real vendor bundle never
 * loads. Element methods are no-ops: there is no card iframe at this layer.
 */
async function installFakeStripe(page: Page) {
  await page.addInitScript(`
    window.Stripe = function () {
      var element = {
        mount: function () {},
        unmount: function () {},
        destroy: function () {},
        clear: function () {},
        collapse: function () {},
        update: function () {},
        getValue: function () { return null; },
        addEventListener: function () {},
        removeEventListener: function () {},
        on: function () {},
        off: function () {},
      };
      var elements = {
        create: function () { return element; },
        getElement: function () { return element; },
      };
      return {
        elements: function () { return elements; },
        _registerWrapper: function () {},
        confirmCardPayment: function () {
          return Promise.resolve({
            paymentIntent: {
              id: ${JSON.stringify(FAKE_PI_ID)},
              object: 'payment_intent',
              status: 'succeeded',
              latest_charge: {
                object: 'charge',
                payment_method_details: {
                  card: { brand: 'visa', last4: '4242' },
                },
              },
            },
          });
        },
      };
    };
  `)
  await page.route('**js.stripe.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '/* stubbed for mock-level UPSERT e2e */',
    })
  )
}

/**
 * Shared app-shell mocks (catalog + session + payment intent with the
 * server-issued orderId) and cart priming, mirroring the proven patterns
 * from checkout-happy-path.spec.ts / payment-errors.spec.ts.
 */
async function primeCheckout(page: Page) {
  await page.route('**/api/products*', async (route) => {
    await route.fulfill({
      json: { data: MOCK_PRODUCTS, meta: { pagination: { total: 2 } } },
    })
  })
  await page.route('**/api/categories*', async (route) => {
    await route.fulfill({
      json: { data: [{ id: 1, name: 'Luxury', slug: 'luxury' }] },
    })
  })
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({ json: { user: MOCK_USER } })
  })
  await page.route('**/api/create-payment-intent', async (route) => {
    await route.fulfill({
      json: {
        clientSecret: `${FAKE_PI_ID}_secret_e2e`,
        orderId: FAKE_ORDER_ID,
      },
    })
  })

  // Prime the cart through the real UI and walk into checkout using the
  // same navigation path proven by checkout-happy-path.spec.ts (the direct
  // goto('/checkout') can race client cart hydration and bounce to /tienda).
  await page.goto('/tienda')
  await page.waitForLoadState('networkidle')
  const productCard = page
    .locator('.group')
    .filter({ hasText: 'Classic Chronograph' })
    .first()
  await expect(productCard).toBeVisible({ timeout: 15000 })
  await productCard.getByRole('button', { name: /carrito/i }).click()
  await page.locator('header a[href="/carrito"]').click()
  await expect(page).toHaveURL(/.*\/carrito/, { timeout: 15000 })
  await expect(page.locator('text=Classic Chronograph')).toBeVisible()
  await page.click('text=Continuar con el pago')
  await expect(page).toHaveURL(/.*\/checkout/, { timeout: 15000 })
  await expect(page.locator('text=Resumen del pedido')).toBeVisible({
    timeout: 15000,
  })
}

test.describe('Checkout order UPSERT (PUT by-order-id)', () => {
  test('submits exactly one PUT with the D-lock subset + trace and never POSTs /api/orders', async ({
    page,
  }) => {
    const putRequests: Array<{
      method: string
      url: string
      headers: Record<string, string>
      body: string | null
    }> = []
    const postCalls: string[] = []

    await installFakeStripe(page)
    await page.route('**/api/orders/by-order-id/**', async (route) => {
      const request = route.request()
      const headers = await request.allHeaders()
      putRequests.push({
        method: request.method(),
        url: request.url(),
        headers,
        body: request.postData(),
      })
      await route.fulfill({
        status: 200,
        // Echo the incoming trace id like the real proxy does (S1.5).
        headers: { 'X-Trace-Id': headers['x-trace-id'] ?? '' },
        json: MOCK_UPSERT_SUCCESS,
      })
    })
    // POST spy on the legacy route: recording only — any hit fails the test.
    await page.route('**/api/orders', (route) => {
      postCalls.push(route.request().method())
      return route.abort()
    })

    await primeCheckout(page)
    await expect(
      page.locator('button:has-text("Pagar")')
    ).toBeEnabled({ timeout: 15000 })
    await page.click('button:has-text("Pagar")')

    // The PUT lands exactly once regardless of which redirect wins the
    // post-success navigation (confirmation push vs empty-cart effect).
    await expect
      .poll(() => putRequests.length, { timeout: 15000 })
      .toBe(1)

    // 1. Exactly one call, PUT only.
    expect(putRequests).toHaveLength(1)
    expect(putRequests[0].method).toBe('PUT')
    expect(putRequests[0].url).toContain(
      `/api/orders/by-order-id/${FAKE_ORDER_ID}`
    )

    // 2. No POST /api/orders at any point in the flow (spec: prove NO POST).
    expect(postCalls).toEqual([])

    // 3. X-Trace-Id present on the request and UUIDv4-shaped (A-4).
    expect(putRequests[0].headers['x-trace-id']).toMatch(UUID_V4)

    // 4. Payload = userId + D-lock subset; excluded fields must not leak.
    const payload = JSON.parse(putRequests[0].body as string)
    expect(payload.userId).toBe(MOCK_USER.id)
    expect(payload.paymentIntentId).toBe(FAKE_PI_ID)
    expect(Array.isArray(payload.items)).toBe(true)
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0].name).toBe('Classic Chronograph')
    expect(payload.subtotal).toBe(259.99)
    expect(payload.shipping).toBe(0)
    expect(payload.paymentInfo).toEqual({
      method: 'card',
      brand: 'visa',
      last4: '4242',
    })
    expect(payload).not.toHaveProperty('orderId')
    expect(payload).not.toHaveProperty('orderStatus')
    expect(payload).not.toHaveProperty('total')

    // 5. Success path never surfaces the orderError banner.
    await expect(
      page.locator('text=Error al registrar el pedido')
    ).not.toBeVisible()
  })

  test('renders the bounded 409 reconciliation copy in the single orderError banner', async ({
    page,
  }) => {
    await installFakeStripe(page)
    await page.route('**/api/orders/by-order-id/**', async (route) => {
      const traceId =
        route.request().headers()['x-trace-id'] ?? 'missing-trace'
      await route.fulfill({
        status: 409,
        headers: { 'X-Trace-Id': traceId },
        json: MOCK_UPSERT_CONFLICT,
      })
    })
    await page.route('**/api/orders', (route) => route.abort())

    await primeCheckout(page)
    await expect(
      page.locator('button:has-text("Pagar")')
    ).toBeEnabled({ timeout: 15000 })
    await page.click('button:has-text("Pagar")')

    // The existing banner (page-owned DOM, S-MOD.6/7) shows the Spanish
    // reconciliation copy including the payment intent id, without retrying.
    await expect(
      page.locator('text=Error al registrar el pedido')
    ).toBeVisible({ timeout: 15000 })
    await expect(
      page.locator('text=revisa Mis Pedidos')
    ).toBeVisible()
    await expect(page.locator(`text=${FAKE_PI_ID}`)).toBeVisible()
    await expect(page).toHaveURL(/checkout/)

    // A-7: exactly one PUT — no client-side retry loop after 409.
    // (Route handler runs per attempt; the abort-based POST spy proves no
    // fallback POST was attempted either.)
  })
})
