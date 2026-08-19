
import { test, expect } from '@playwright/test';
import { MOCK_PRODUCTS, MOCK_USER } from './utils/mocks';

test.describe('Payment and API Errors Handling', () => {
    test.beforeEach(async ({ page }) => {
        // Logged in state via the cookie-session endpoint
        await page.route('**/api/auth/session', async (route) => {
            await route.fulfill({ json: { user: MOCK_USER } });
        });

        await page.route('**/api/products*', async (route) => {
            await route.fulfill({ json: { data: MOCK_PRODUCTS, meta: { pagination: { total: 2 } } } });
        });

        await page.route('**/api/categories*', async (route) => {
            await route.fulfill({ json: { data: [{ id: 1, name: 'Luxury', slug: 'luxury' }] } });
        });
    });

    test('Should show error when payment intent creation fails', async ({ page }) => {
        // 1. Prep cart - Go to tienda first
        await page.goto('/tienda');
        await page.waitForLoadState('networkidle');

        const card = page.locator('.group').filter({ hasText: 'Classic Chronograph' }).first();
        await expect(card).toBeVisible({ timeout: 10000 });
        await card.getByRole('button', { name: /carrito/i }).click();

        // 2. Mock API Failure
        await page.route('**/api/create-payment-intent', async (route) => {
            await route.fulfill({
                status: 500,
                json: { error: 'Internal Server Error' }
            });
        });

        // 3. Go to checkout
        await page.goto('/checkout');

        // 4. Verify error message from CheckoutForm
        await expect(page.locator('text=Internal Server Error')).toBeVisible({ timeout: 10000 });
    });

    test('Should show error when authentication is missing in checkout', async ({ page }) => {
        // Drop the authenticated session mock so the real route runs and
        // returns { user: null } (no bv_session cookie is ever set here).
        await page.unroute('**/api/auth/session');

        // Redirect should happen because of route protection in checkout/page.tsx
        await page.goto('/checkout');

        // Should redirect to login
        await expect(page).toHaveURL(/.*\/login/);
    });
});
