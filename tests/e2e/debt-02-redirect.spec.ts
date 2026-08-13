import { test, expect } from '@playwright/test';
import { MOCK_AUTH_RESPONSE } from './utils/mocks';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('DEBT-02 redirect generation (TC-03 / TC-04 / TC-05)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the login API
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        json: MOCK_AUTH_RESPONSE,
      });
    });

    // Mock the session endpoint. Default = authenticated (used by TC-05).
    // TC-03 / TC-04 override this handler to return an unauthenticated user.
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        json: { user: MOCK_AUTH_RESPONSE.user },
      });
    });
  });

  test('TC-03: /checkout (unauth) generates /login?redirect=%2Fcheckout', async ({
    page,
  }) => {
    // Override the session mock to force the unauthenticated branch in
    // /checkout → useEffect. The handler registered here runs first
    // (Playwright routes are reverse-order), so this one wins over the
    // beforeEach handler.
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        json: { user: null },
      });
    });

    // Visit /checkout while unauthenticated — page should redirect.
    await page.goto(`${BASE_URL}/checkout`);

    // Wait for the client-side redirect to /login?redirect=%2Fcheckout
    await page.waitForURL(/\/login\?redirect=%2Fcheckout/, { timeout: 10000 });

    expect(page.url()).toContain('/login?redirect=%2Fcheckout');
  });

  test('TC-04: /carrito (unauth) generates /login?redirect=%2Fcarrito', async ({
    page,
  }) => {
    // Same override pattern as TC-03 — force unauthenticated session.
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        json: { user: null },
      });
    });

    // Visit /carrito while unauthenticated — page should redirect.
    await page.goto(`${BASE_URL}/carrito`);

    // Wait for the client-side redirect to /login?redirect=%2Fcarrito
    await page.waitForURL(/\/login\?redirect=%2Fcarrito/, { timeout: 10000 });

    expect(page.url()).toContain('/login?redirect=%2Fcarrito');
  });

  test('TC-05: Authenticated user with empty cart lands on /tienda from /checkout', async ({
    page,
  }) => {
    // Session is already mocked as authenticated by beforeEach. The cart
    // starts empty (fresh browser context, no localStorage), so when we
    // visit /checkout the empty-cart guard should fire and redirect us
    // to /tienda. We do NOT need to fill the login form — the mocked
    // session alone establishes the authenticated user for this test.
    await page.goto(`${BASE_URL}/checkout`);

    // Wait for the empty-cart guard redirect to /tienda.
    await page.waitForURL(/\/tienda(\?|$|\/)/, { timeout: 10000 });

    // URL must be exactly /tienda (no query string, no trailing path).
    const url = new URL(page.url());
    expect(url.pathname).toBe('/tienda');
  });
});
