
import { test, expect } from '@playwright/test';
import { MOCK_SHIPPED_ORDER, MOCK_ORDERS_RESPONSE, MOCK_USER, MOCK_AUTH_RESPONSE } from './utils/mocks';

test.describe('Order Tracking and Details', () => {
    test.beforeEach(async ({ page }) => {
        // Setup initial auth state
        await page.addInitScript((token) => {
            window.localStorage.setItem('jwt', token);
        }, MOCK_AUTH_RESPONSE.jwt);

        // Mock API calls
        await page.route('**/api/users/me', async (route) => {
            await route.fulfill({ json: MOCK_USER });
        });

        await page.route('**/api/orders?*', async (route) => {
            await route.fulfill({ json: MOCK_ORDERS_RESPONSE });
        });

        await page.route('**/api/orders/ORD-SHIPPED-678', async (route) => {
            await route.fulfill({ json: { data: MOCK_SHIPPED_ORDER } });
        });
    });

    test('Should view order history and tracking details', async ({ page }) => {
        // 1. Ir a mis pedidos
        await page.goto('/mi-cuenta/pedidos');
        await expect(page.locator('h1')).toContainText('Mis Pedidos');

        // 2. Verificar que el pedido aparece en la lista
        const orderCard = page.locator('a').filter({ hasText: 'ORD-SHIPPED-678' });
        await expect(orderCard).toBeVisible({ timeout: 15000 });

        // 3. Click en la tarjeta
        await orderCard.click();

        // 4. Verificar detalles del pedido
        await expect(page).toHaveURL(/.*\/mi-cuenta\/pedidos\/ORD-SHIPPED-678/);
        await expect(page.locator('h1')).toContainText('Detalles del Pedido');

        await expect(page.locator('text=ORD-SHIPPED-678').first()).toBeVisible();

        // 5. Verificar información de envío
        await expect(page.locator('text=Información de Seguimiento')).toBeVisible();
        await expect(page.locator('text=TRACK-999-BENI')).toBeVisible();
        await expect(page.locator('text=Correos')).toBeVisible();
    });
});
