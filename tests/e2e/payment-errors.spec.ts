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

    // Hotfix (sprint-5-stripe-upsert): Test 2 below stays skipped — the
    // unauthenticated-redirect path is a separate ticket (F9 candidate, obs
    // #1808). Test 1 was re-enabled for F4 (friendly-error mapping) and now
    // asserts the page-level <ErrorMessage> shows the friendly Spanish copy
    // instead of the raw "Internal Server Error" text.

    test('Should show friendly Spanish copy when payment intent creation fails', async ({ page }) => {
        // Mock the payment-intent endpoint to return 500 with a raw English
        // body BEFORE we navigate to /checkout. This is what AGENT.md:51
        // forbids from reaching the user-facing alert surface.
        await page.route('**/api/create-payment-intent', async (route) => {
            await route.fulfill({
                status: 500,
                json: { error: 'Internal Server Error' },
            });
        });

        // Cart priming via the proven pattern from checkout-order-upsert.spec.ts
        // (direct goto('/checkout') races client cart hydration and bounces to
        // /tienda — see obs #1808). Walk through /tienda → /carrito → /checkout
        // so the CheckoutForm mounts with a hydrated cart.
        await page.goto('/tienda');
        await page.waitForLoadState('networkidle');

        const card = page.locator('.group').filter({ hasText: 'Classic Chronograph' }).first();
        await expect(card).toBeVisible({ timeout: 15000 });
        await card.getByRole('button', { name: /carrito/i }).click();
        await page.locator('header a[href="/carrito"]').click();
        await expect(page).toHaveURL(/.*\/carrito/, { timeout: 15000 });
        await expect(page.locator('text=Classic Chronograph')).toBeVisible();
        await page.click('text=Continuar con el pago');
        await expect(page).toHaveURL(/.*\/checkout/, { timeout: 15000 });

        // The friendly Spanish copy (STRIPE_ERROR_MESSAGES.api_error) must
        // reach the page-owned <ErrorMessage> banner. The raw English text
        // must NEVER appear in the DOM (AGENT.md:51).
        const errorAlert = page.getByRole('alert').first();
        await expect(errorAlert).toBeVisible({ timeout: 15000 });
        await expect(errorAlert).toContainText(/servidor de pagos/i);
        await expect(errorAlert).not.toContainText('Internal Server Error');

        // Belt-and-braces: scan the full DOM for the raw substring. If a
        // future refactor leaks it into a sibling banner or toast, this still
        // catches it.
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).not.toContain('Internal Server Error');
    });

    test.skip('Should show error when authentication is missing in checkout', async ({ page }) => {
        // Drop the authenticated session mock so the real route runs and
        // returns { user: null } (no bv_session cookie is ever set here).
        await page.unroute('**/api/auth/session');

        // Redirect should happen because of route protection in checkout/page.tsx
        await page.goto('/checkout');

        // Should redirect to login
        await expect(page).toHaveURL(/.*\/login/);
    });
});