/**
 * [ORD-01] Tests for GET /api/orders endpoint
 *
 * Test-Driven Development (TDD) - RED phase
 * These tests will FAIL initially until we implement the route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'

// Mock Strapi API
vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337'
}))

describe('[ORD-01] GET /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock global fetch
    global.fetch = vi.fn()
  })

  it('should return 401 if no authorization header is provided', async () => {
    // Arrange: Create request without auth header
    const request = new NextRequest('http://localhost:3000/api/orders')

    // Act: Call the endpoint
    const response = await GET(request)
    const data = await response.json()

    // Assert: Should return 401 Unauthorized
    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized - JWT token required')
  })

  it('should return 401 if authorization header is malformed', async () => {
    // Arrange: Create request with malformed auth header
    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'InvalidToken123'
      }
    })

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized - Invalid token format')
  })

  it('should fetch orders from Strapi and return them sorted by date', async () => {
    // Arrange: Mock successful Strapi response
    const mockOrders = [
      {
        id: 2,
        documentId: 'doc-002',
        orderId: 'ORD-1700000002-A',
        items: [{ id: 1, name: 'Reloj A', price: 100, quantity: 1 }],
        subtotal: 100,
        shipping: 10,
        total: 110,
        orderStatus: 'paid',
        createdAt: '2025-11-20T10:00:00Z',
        updatedAt: '2025-11-20T10:00:00Z',
        publishedAt: '2025-11-20T10:00:00Z'
      },
      {
        id: 1,
        documentId: 'doc-001',
        orderId: 'ORD-1700000001-A',
        items: [{ id: 2, name: 'Reloj B', price: 200, quantity: 1 }],
        subtotal: 200,
        shipping: 10,
        total: 210,
        orderStatus: 'pending',
        createdAt: '2025-11-19T10:00:00Z',
        updatedAt: '2025-11-19T10:00:00Z',
        publishedAt: '2025-11-19T10:00:00Z'
      }
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOrders })
    })

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(2)
    expect(data.data[0].orderId).toBe('ORD-1700000002-A') // Most recent first
    expect(data.data[1].orderId).toBe('ORD-1700000001-A')

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/orders'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer valid-jwt-token'
        })
      })
    )
  })

  it('should handle Strapi errors gracefully', async () => {
    // Arrange: Mock Strapi error response
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Database connection failed' } })
    })

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch orders from Strapi')
  })

  it('should handle network errors gracefully', async () => {
    // Arrange: Mock network failure
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
