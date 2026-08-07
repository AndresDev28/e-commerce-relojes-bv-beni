/**
 * Approval tests for the public API of src/lib/api/orders.ts.
 *
 * After the cookie-based auth migration, the legacy runtime helpers
 * (`createOrder`, `getUserOrders`) were removed — all authenticated
 * order traffic now flows through Next.js route handlers that read the
 * httpOnly session cookie. This test pins the public surface so a
 * regression that re-introduces client-side JWT handling fails loudly.
 */

import { describe, it, expect } from 'vitest'
import * as ordersModule from '../orders'

describe('lib/api/orders public API', () => {
  it('is importable as a module', () => {
    expect(ordersModule).toBeDefined()
    expect(typeof ordersModule).toBe('object')
  })

  it('does not export the legacy runtime helpers', () => {
    expect((ordersModule as Record<string, unknown>).createOrder).toBeUndefined()
    expect((ordersModule as Record<string, unknown>).getUserOrders).toBeUndefined()
  })

})
