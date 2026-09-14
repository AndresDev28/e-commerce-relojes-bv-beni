/**
 * E2E — origin assertion for browser catalog fetches (F3 PR2).
 *
 * This test does NOT use `page.route` to mock `/api/products` or
 * `/api/categories` — that would mask origin regressions because mocks
 * match any origin. Instead, it relies on Playwright's `waitForRequest`
 * to observe the actual request URL the browser issues and asserts:
 *
 *   1. The request URL starts with the page origin (same-origin).
 *   2. The request URL does NOT contain `localhost:1337` (the developer's
 *      local Strapi host must not leak into the visitor's bundle).
 *
 * Both browser context and server context run in parallel via the
 * Playwright-managed dev server (which proxies `/api/*` to the
 * mock-Strapi instance on :1337). The browser never reaches :1337
 * directly after F3 ships — that is the whole point.
 */
import { test, expect } from '@playwright/test'

test.describe('catalog origin assertion — browser fetches stay same-origin (F3 PR2)', () => {
  test('tienda issues a same-origin request for /api/products (not localhost:1337)', async ({
    page,
  }) => {
    // Anti-pattern guard: no page.route for /api/products in this test.
    // We observe the real request via waitForRequest.

    const productsRequestPromise = page.waitForRequest(
      (request) => request.url().includes('/api/products'),
      { timeout: 15000 }
    )

    // Navigate. The page might show empty/error state if Strapi data is
    // unavailable — we don't assert on rendered content here, only on
    // the request URL the browser initiated.
    await page.goto('/tienda')

    const request = await productsRequestPromise
    const requestUrl = request.url()
    const pageOrigin = new URL(page.url()).origin

    // 1. Request URL must start with the page origin (same-origin).
    expect(requestUrl.startsWith(pageOrigin)).toBe(true)
    // 2. Request URL must NOT contain the developer's Strapi host —
    //    proves the browser never tries to reach localhost:1337 directly.
    expect(requestUrl).not.toContain('localhost:1337')
  })

  test('tienda issues a same-origin request for /api/categories (not localhost:1337)', async ({
    page,
  }) => {
    // Anti-pattern guard: no page.route for /api/categories in this test.

    const categoriesRequestPromise = page.waitForRequest(
      (request) => request.url().includes('/api/categories'),
      { timeout: 15000 }
    )

    await page.goto('/tienda')

    const request = await categoriesRequestPromise
    const requestUrl = request.url()
    const pageOrigin = new URL(page.url()).origin

    expect(requestUrl.startsWith(pageOrigin)).toBe(true)
    expect(requestUrl).not.toContain('localhost:1337')
  })
})
