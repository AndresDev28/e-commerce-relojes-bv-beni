import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

/**
 * Full Strapi 5 product payload for the product detail page (UXW-02/UXW-03).
 *
 * `description` is a Strapi blocks array (paragraph + heading + list) so the
 * test exercises the full blocks → markdown → ReactMarkdown pipeline. The
 * image URL points at the configured remotePatterns host so next/image does
 * not hard-fail during render.
 */
const MOCK_PRODUCT_PAYLOAD = {
  data: [
    {
      id: 1,
      name: 'Classic Chronograph',
      price: 259.99,
      slug: 'classic-chronograph',
      description: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: 'A timeless classic for any occasion.',
            },
          ],
        },
        {
          type: 'heading',
          level: 2,
          children: [{ type: 'text', text: 'Características' }],
        },
        {
          type: 'list',
          format: 'unordered',
          children: [
            {
              type: 'list-item',
              children: [{ type: 'text', text: 'Caja de acero inoxidable' }],
            },
            {
              type: 'list-item',
              children: [{ type: 'text', text: 'Resistente al agua' }],
            },
          ],
        },
      ],
      stock: 10,
      images: [{ id: 101, url: '/uploads/watch1.jpg' }],
      category: { id: 1, name: 'Luxury', slug: 'luxury' },
    },
  ],
  meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
};

test.describe('Product detail UX (UXW-02 / UXW-03)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the Strapi products endpoint with a blocks description.
    await page.route('**/api/products*', async (route) => {
      await route.fulfill({ status: 200, json: MOCK_PRODUCT_PAYLOAD });
    });
    // Mock categories (referenced by the breadcrumb builder's category lookup).
    await page.route('**/api/categories*', async (route) => {
      await route.fulfill({
        status: 200,
        json: { data: [{ id: 1, name: 'Luxury', slug: 'luxury' }] },
      });
    });
  });

  test('renders the blocks description as paragraphs', async ({ page }) => {
    await page.goto(`${BASE_URL}/tienda/classic-chronograph`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText('A timeless classic for any occasion.'),
    ).toBeVisible();

    // The heading block must preserve its level (h2).
    await expect(
      page.getByRole('heading', { name: 'Características' }),
    ).toBeVisible();

    // The list block must render as list items.
    await expect(page.getByText('Caja de acero inoxidable')).toBeVisible();
  });

  test('exposes the full label via title on the trailing breadcrumb item', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/tienda/classic-chronograph`);
    await page.waitForLoadState('networkidle');

    const trailingCrumb = page.locator(
      'li[aria-current="page"] span[title="Classic Chronograph"]',
    );
    await expect(trailingCrumb).toBeVisible();
    await expect(trailingCrumb).toHaveText('Classic Chronograph');
  });
});
