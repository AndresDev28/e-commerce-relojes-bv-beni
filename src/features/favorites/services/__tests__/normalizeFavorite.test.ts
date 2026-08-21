/**
 * Tests for normalizeFavorite / normalizeFavorites (pure helpers).
 *
 * These tests pin the canonical Product shape produced from raw Strapi
 * favorite objects returned by GET /api/users/me?populate=favorites.
 *
 * The Strapi response includes numeric `id` and partial fields — the
 * helpers must coerce `id` to string, fill defensive fallbacks, and
 * drop unusable entries.
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeFavorite,
  normalizeFavorites,
} from '../normalizeFavorite'
import type { Product } from '@/types'

describe('normalizeFavorite', () => {
  it('coerces a numeric Strapi `id` to string and fills defensive fallbacks', () => {
    const result = normalizeFavorite({
      id: 42,
      name: 'Casio LA670WEA-1EF',
      price: 3990,
      stock: 5,
    }) as Product

    expect(result).not.toBeNull()
    expect(result.id).toBe('42')
    expect(typeof result.id).toBe('string')
    expect(result.name).toBe('Casio LA670WEA-1EF')
    expect(result.price).toBe(3990)
    expect(result.stock).toBe(5)
    expect(result.images).toEqual([])
    expect(result.href).toBe('')
    expect(result.description).toBe('')
    expect(result.category).toBeUndefined()
  })

  it('falls back to `documentId` when `id` is absent', () => {
    const result = normalizeFavorite({
      documentId: 'ab12cd34',
      name: 'Casio LA670WEA-8AEF',
    }) as Product

    expect(result).not.toBeNull()
    expect(result.id).toBe('ab12cd34')
    expect(typeof result.id).toBe('string')
    expect(result.name).toBe('Casio LA670WEA-8AEF')
  })

  it('preserves an already-string `id` byte-identical', () => {
    const result = normalizeFavorite({
      id: 'p-1',
      name: 'Z',
    }) as Product

    expect(result).not.toBeNull()
    expect(result.id).toBe('p-1')
  })

  it('returns null when neither `id` nor `documentId` is usable', () => {
    expect(normalizeFavorite({ name: 'No ID' })).toBeNull()
    expect(normalizeFavorite({ id: '', documentId: '' })).toBeNull()
  })

  it('applies defensive fallbacks for missing/invalid name, price and stock', () => {
    const result = normalizeFavorite({
      id: 7,
      name: null,
      price: undefined,
      stock: null,
    }) as Product

    expect(result).not.toBeNull()
    expect(result.id).toBe('7')
    expect(result.name).toBe('Sin nombre')
    expect(result.price).toBe(0)
    expect(result.stock).toBe(0)
  })

  it('preserves existing `images`, `href`, `description` and `category` when present', () => {
    const result = normalizeFavorite({
      id: 5,
      name: 'Casio',
      price: 100,
      stock: 2,
      images: ['/img/a.jpg', '/img/b.jpg'],
      href: '/tienda/casio',
      description: 'Casio description',
      category: 'Casio',
    }) as Product

    expect(result).not.toBeNull()
    expect(result.images).toEqual(['/img/a.jpg', '/img/b.jpg'])
    expect(result.href).toBe('/tienda/casio')
    expect(result.description).toBe('Casio description')
    expect(result.category).toBe('Casio')
  })

  it('returns null for non-object inputs (null, undefined, primitives)', () => {
    expect(normalizeFavorite(null)).toBeNull()
    expect(normalizeFavorite(undefined)).toBeNull()
    expect(normalizeFavorite('string')).toBeNull()
    expect(normalizeFavorite(42)).toBeNull()
    expect(normalizeFavorite(true)).toBeNull()
  })
})

describe('normalizeFavorites', () => {
  it('maps a list of raw Strapi favorites to canonical Product[]', () => {
    const input = [
      { id: 1, name: 'A', price: 10, stock: 1 },
      { id: 2, name: 'B', price: 20, stock: 2 },
    ]

    const result = normalizeFavorites(input)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
    expect(result[0].name).toBe('A')
    expect(result[1].name).toBe('B')
  })

  it('silently drops null entries from the list', () => {
    const input = [
      { id: 1, name: 'A', price: 10, stock: 1 },
      null,
      { id: 2, name: 'B', price: 20, stock: 2 },
    ]

    const result = normalizeFavorites(input)

    expect(result).toHaveLength(2)
    expect(result.map((p) => p.id)).toEqual(['1', '2'])
  })

  it('returns an empty array for any non-array input', () => {
    expect(normalizeFavorites(null)).toEqual([])
    expect(normalizeFavorites(undefined)).toEqual([])
    expect(normalizeFavorites('not-an-array')).toEqual([])
    expect(normalizeFavorites({})).toEqual([])
    expect(normalizeFavorites(42)).toEqual([])
  })

  it('returns an empty array when every entry fails normalization', () => {
    const result = normalizeFavorites([
      { name: 'No ID' },
      null,
      'string-entry',
    ])

    expect(result).toEqual([])
  })
})
