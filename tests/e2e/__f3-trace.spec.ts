/**
 * TEMPORARY diagnostic spec (F3 verify) — NOT part of the suite.
 * Runs against an already-running server on :3000 (prod `next start`
 * or dev) with mock Strapi on :1337. Deleted after the verification run.
 */
import { test } from '@playwright/test'

test.setTimeout(120000)

test('trace /tienda browser behaviour (stack capture)', async ({ page }) => {
  const events: string[] = []
  const t0 = Date.now()
  const mark = () => `${String(Date.now() - t0).padStart(6, ' ')}ms`

  page.on('request', (r) => {
    if (r.url().includes('/api/') || r.url().includes('chunk') || r.url().includes('.js'))
      events.push(`${mark()} REQ ${r.method()} ${r.url()}`)
  })
  page.on('response', (r) => {
    if (r.url().includes('/api/')) events.push(`${mark()} RESP ${r.status()} ${r.url()}`)
  })
  page.on('pageerror', (e) =>
    events.push(`${mark()} PAGEERROR ${String(e.stack ?? e).slice(0, 600)}`)
  )
  page.on('console', (m) => {
    if (m.type() !== 'info' && m.type() !== 'log')
      events.push(`${mark()} CONSOLE[${m.type()}] ${m.text().slice(0, 400)}`)
  })

  await page.goto('/tienda', { waitUntil: 'domcontentloaded', timeout: 60000 })
  events.push(`${mark()} --- domcontentloaded, waiting 20s ---`)
  await page.waitForTimeout(20000)

  const loading = await page.getByText('Cargando productos...').count()
  const none = await page.getByText('No se encontraron productos').count()
  const total = await page.getByText(/resultados/).count()
  events.push(`${mark()} STATE loading=${loading} noProducts=${none} resultadosText=${total}`)

  console.log('=== TRACE2 /tienda ===')
  for (const e of events) console.log(e)
})
