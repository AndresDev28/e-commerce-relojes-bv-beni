/**
 * Integration test for the Next.js image optimizer allowlist (capability C3,
 * spec #1688 — `next.config.ts remotePatterns`).
 *
 * What this test proves
 * ---------------------
 * Mock-based component tests mock `next/image`, so they cannot catch a
 * misconfigured `remotePatterns` allowlist. This integration test boots a
 * real Next.js server and hits `/_next/image` with a real URL — the same
 * code path the browser uses — so a future config change that breaks the
 * allowlist (e.g., dropping `localhost:1337` or the Render host) fails
 * this test before the production 400 surfaces.
 *
 * Scenarios covered (spec #1688 C3):
 *   C3.S1 — allowlisted hosts do NOT return 400 from the optimizer.
 *           The optimizer distinguishes:
 *             - 400 → URL rejected by `remotePatterns` (allowlist miss)
 *             - 404 → allowlist passed, upstream returned 404 (fetch failure)
 *             - 200 → allowlist passed, upstream served, transform OK
 *           We assert the allowlist status (`status !== 400`) because that
 *           is the regression signal we actually care about. We deliberately
 *           do NOT assert status === 200 for remote hosts because Strapi may
 *           not be running in the test environment; the optimizer's
 *           allowlist check still works correctly when upstream is unreachable.
 *   C3.S2 — a non-allowlisted host (e.g., attacker.example.com) returns
 *           400 (optimizer refuses to proxy unknown origins).
 *   C3.S2 — wrong pathname on an allowlisted host also returns 400.
 *
 * Implementation note
 * -------------------
 * We use the existing `TestServer` helper (test/integration/helpers/test-server.ts)
 * which boots `next` programmatically with `dev: true`. This is functionally
 * equivalent to `next dev` (the same optimizer runs), avoids spawning a
 * detached process, and lets the afterAll hook close cleanly via
 * `TestServer.stop()`. Plan called for `spawn('npx', ['next', 'dev', ...])` —
 * using the helper keeps the test idiomatic with the existing email IT and
 * avoids the flakiness of detached subprocess teardown.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, type TestServer } from './helpers/test-server'

let server: TestServer
const NEXT_PORT = 3100
const NEXT_BASE = `http://127.0.0.1:${NEXT_PORT}`

beforeAll(async () => {
  server = await createTestServer(NEXT_PORT)
}, 120_000)

afterAll(async () => {
  if (server) {
    await server.stop()
  }
})

/**
 * Probe the image optimizer for a given absolute URL.
 * Returns the HTTP status. The optimizer contract:
 *   - 400 = URL rejected by `remotePatterns` (allowlist miss)
 *   - 404 = allowlist passed, upstream returned 404 (fetch failure)
 *   - 200 = allowlist passed, upstream served the image, transform OK
 */
async function check(url: string): Promise<number> {
  const fullUrl = `${NEXT_BASE}/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`
  const res = await fetch(fullUrl)
  return res.status
}

describe('next/image allowlist (C3) — regression guard', () => {
  it('C3.S1 — allowlisted hosts do NOT return 400 from the image optimizer', async () => {
    // These hosts are explicitly listed in `next.config.ts remotePatterns`.
    // The optimizer's allowlist check returns 400 when the URL is rejected
    // and 200/404 when it passes. We assert status !== 400 because the
    // "allowlist permits" signal is what we're guarding; upstream reachability
    // depends on the test environment (Strapi may not be running).
    const allowlisted = [
      'http://localhost:1337/uploads/test.jpg',
      'http://127.0.0.1:1337/uploads/test.jpg',
      'https://relojes-bv-beni-api.onrender.com/uploads/test.jpg',
      'https://res.cloudinary.com/test.jpg',
    ]

    for (const url of allowlisted) {
      const status = await check(url)
      // 400 would mean the allowlist regressed and rejected an entry that
      // spec #1688 says must be permitted. 200/404 are both acceptable
      // outcomes for an allowlisted URL in this test environment.
      expect({ url, status, rejected: status === 400 }).toEqual({
        url,
        status,
        rejected: false,
      })
    }
  })

  it('C3.S2 — a non-allowlisted host returns 400', async () => {
    const status = await check('https://attacker.example.com/x.jpg')
    // 400 = the optimizer refused the URL because the host is not in
    // remotePatterns. Any other status would mean the allowlist regressed.
    expect(status).toBe(400)
  })

  it('C3.S2 — wrong pathname on an allowlisted host returns 400', async () => {
    // localhost:1337 is allowlisted for `/uploads/**` only. Hitting a
    // different path on the same host must still be rejected.
    const status = await check('http://localhost:1337/admin/x.jpg')
    expect(status).toBe(400)
  })
})
