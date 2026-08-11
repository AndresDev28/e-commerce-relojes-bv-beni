import { test, expect } from '@playwright/test';
import { MOCK_AUTH_RESPONSE } from './utils/mocks';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('Login redirect round-trip (TC-01 / TC-02)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the login API
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        json: MOCK_AUTH_RESPONSE,
      });
    });

    // Mock the session endpoint so the app hydrates the user after redirect
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        json: { user: MOCK_AUTH_RESPONSE.user },
      });
    });
  });

  test('TC-01: /login?redirect=/tienda lands on /tienda after successful login', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login?redirect=/tienda`);
    await page.waitForLoadState('networkidle');

    // Fill in credentials
    await page.fill('input#Identifier', 'jdoe@example.com');
    await page.fill('input#password', 'secret123');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for navigation to complete — should land on /tienda
    await page.waitForURL('**/tienda', { timeout: 10000 });

    expect(page.url()).toContain('/tienda');
  });

  test('TC-02: /login?redirect=/tienda/classic-chronograph lands on detail page', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login?redirect=/tienda/classic-chronograph`);
    await page.waitForLoadState('networkidle');

    // Fill in credentials
    await page.fill('input#Identifier', 'jdoe@example.com');
    await page.fill('input#password', 'secret123');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for navigation — should land on the product detail page
    await page.waitForURL('**/tienda/classic-chronograph', { timeout: 10000 });

    expect(page.url()).toContain('/tienda/classic-chronograph');
  });
});
