/**
 * Minimal Strapi mock server for product-detail E2E tests.
 *
 * The product detail page is a Next.js server component: its `getProductBySlug`
 * fetch runs in the Node dev-server process, NOT the browser, so Playwright's
 * `page.route()` cannot intercept it. This standalone server stands in for
 * Strapi so the full blocks → markdown → ReactMarkdown pipeline is exercised
 * deterministically.
 *
 * Usage (one terminal each):
 *   1. node tests/e2e/mock-strapi-server.mjs          # listens on :1338
 *   2. STRAPI_API_URL=http://localhost:1338 \
 *      NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1338 \
 *      npm run dev                                    # Next dev on :3000
 *   3. TEST_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/product-detail-ux.spec.ts
 */

import http from 'node:http';

const PORT = Number(process.env.MOCK_STRAPI_PORT || 1338);

const PRODUCT = {
  id: 1,
  name: 'Classic Chronograph',
  price: 259.99,
  slug: 'classic-chronograph',
  description: [
    {
      type: 'paragraph',
      children: [{ type: 'text', text: 'A timeless classic for any occasion.' }],
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
  images: [],
  category: { id: 1, name: 'Luxury', slug: 'luxury' },
};

const CATEGORIES = [{ id: 1, name: 'Luxury', slug: 'luxury' }];

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (url.pathname === '/api/products') {
    send(res, 200, {
      data: [PRODUCT],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    });
    return;
  }

  if (url.pathname === '/api/categories') {
    send(res, 200, { data: CATEGORIES });
    return;
  }

  send(res, 404, { error: { message: 'Not found' } });
});

server.listen(PORT, () => {
  console.log(`mock-strapi listening on http://localhost:${PORT}`);
});
