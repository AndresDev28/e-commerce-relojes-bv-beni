import type { CartItem } from '@/types'

/**
 * Shared CartItem fixture (design A-5, proposal F4=A).
 *
 * Single source of truth for the FULL 8-field CartItem shape
 * (id, name, price, quantity, images, href, description, stock).
 * obs #1740 lesson: partial inline shapes drifted across test files and
 * only surfaced at `tsc --noEmit`; this factory keeps unit, integration and
 * E2E mocks byte-consistent with the CartItem contract.
 */
export const CART_ITEM_FIELDS: CartItem = {
  id: '1',
  name: 'Reloj Casio Classic',
  price: 99.99,
  quantity: 1,
  images: ['/images/reloj-casio.jpg'],
  href: '/products/reloj-casio-classic',
  description: 'Reloj Casio de cuarzo con correa de acero',
  stock: 10,
}

/**
 * Build a full 8-field CartItem, optionally overriding individual fields.
 * Spread order guarantees every required field is always present.
 */
export function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return { ...CART_ITEM_FIELDS, ...overrides }
}

/**
 * Build a cart line with a specific quantity (subtotal math helper in tests).
 */
export function makeCartItemWithQuantity(quantity: number): CartItem {
  return makeCartItem({ quantity })
}
