
import { test, expect } from '@playwright/test';
import { MOCK_USER, MOCK_AUTH_RESPONSE } from './utils/mocks';

test.describe('Empty States Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Setup initial auth state for all tests since routes are protected
        await page.addInitScript((token) => {
            window.localStorage.setItem('jwt', token);
        }, MOCK_AUTH_RESPONSE.jwt);

        await page.route('**/api/users/me', async (route) => {
            await route.fulfill({ json: MOCK_USER });
        });
    });

    test('Should show empty cart message', async ({ page }) => {
        // Mock empty cart
        // Note: The cart state is managed in localStorage on the client.
        // If we want it truly empty, we ensure localStorage is clean.
        await page.addInitScript(() => {
            window.localStorage.removeItem('cart-storage');
        });

        await page.goto('/carrito');
        await expect(page.locator('text=Tu cesta está vacía')).toBeVisible();
        await expect(page.locator('text=Descubre nuestra colección')).toBeVisible();

        const shopLink = page.locator('a[href="/tienda"]').first();
        await expect(shopLink).toBeVisible();
    });

    test('Should show empty orders message in history', async ({ page }) => {
        // Mock empty orders list
        await page.route('**/api/orders?*', async (route) => {
            await route.fulfill({
                json: {
                    data: [],
                    meta: { pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 } }
                }
            });
        });

        await page.goto('/mi-cuenta/pedidos');
        await expect(page.locator('text=Aún no has realizado ningún pedido')).toBeVisible();
        const exploreBtn = page.locator('text=Explorar productos');
        await expect(exploreBtn).toBeVisible();
    });
});
