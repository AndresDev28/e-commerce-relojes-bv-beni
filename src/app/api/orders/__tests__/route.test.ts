/**
 * [ORD-01] Tests for GET /api/orders endpoint
 * [ORD-02] Tests for pagination
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

describe('[ORD-02] Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('should return 10 orders per page by default', async () => {
    // Arrange: Mock Strapi response with pagination metadata
    const mockOrders = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      documentId: `doc-00${i + 1}`,
      orderId: `ORD-170000000${i + 1}-A`,
      items: [{ id: 1, name: `Reloj ${i + 1}`, price: 100, quantity: 1 }],
      subtotal: 100,
      shipping: 10,
      total: 110,
      orderStatus: 'paid',
      createdAt: `2025-11-${20 - i}T10:00:00Z`,
      updatedAt: `2025-11-${20 - i}T10:00:00Z`,
      publishedAt: `2025-11-${20 - i}T10:00:00Z`
    }))

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockOrders,
        meta: {
          pagination: {
            page: 1,
            pageSize: 10,
            pageCount: 3,
            total: 25
          }
        }
      })
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
    expect(data.data).toHaveLength(10)
    expect(data.meta.pagination.pageSize).toBe(10)
    expect(data.meta.pagination.page).toBe(1)

    // Verify fetch was called with pagination parameters (URL-encoded)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('pagination%5BpageSize%5D=10'),
      expect.any(Object)
    )
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('pagination%5Bpage%5D=1'),
      expect.any(Object)
    )
  })

  it('should support page parameter', async () => {
    // Arrange: Mock Strapi response for page 2
    const mockOrders = Array.from({ length: 10 }, (_, i) => ({
      id: i + 11,
      documentId: `doc-0${i + 11}`,
      orderId: `ORD-170000000${i + 11}-A`,
      items: [{ id: 1, name: `Reloj ${i + 11}`, price: 100, quantity: 1 }],
      subtotal: 100,
      shipping: 10,
      total: 110,
      orderStatus: 'paid',
      createdAt: `2025-11-${10 - i}T10:00:00Z`,
      updatedAt: `2025-11-${10 - i}T10:00:00Z`,
      publishedAt: `2025-11-${10 - i}T10:00:00Z`
    }))

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockOrders,
        meta: {
          pagination: {
            page: 2,
            pageSize: 10,
            pageCount: 3,
            total: 25
          }
        }
      })
    })

    const request = new NextRequest('http://localhost:3000/api/orders?page=2', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(10)
    expect(data.meta.pagination.page).toBe(2)

    // Verify fetch was called with page=2 (URL-encoded)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('pagination%5Bpage%5D=2'),
      expect.any(Object)
    )
  })

  it('should return less than 10 orders on last page', async () => {
    // Arrange: Mock Strapi response for last page with only 5 orders
    const mockOrders = Array.from({ length: 5 }, (_, i) => ({
      id: i + 21,
      documentId: `doc-0${i + 21}`,
      orderId: `ORD-170000000${i + 21}-A`,
      items: [{ id: 1, name: `Reloj ${i + 21}`, price: 100, quantity: 1 }],
      subtotal: 100,
      shipping: 10,
      total: 110,
      orderStatus: 'paid',
      createdAt: `2025-11-0${i + 1}T10:00:00Z`,
      updatedAt: `2025-11-0${i + 1}T10:00:00Z`,
      publishedAt: `2025-11-0${i + 1}T10:00:00Z`
    }))

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockOrders,
        meta: {
          pagination: {
            page: 3,
            pageSize: 10,
            pageCount: 3,
            total: 25
          }
        }
      })
    })

    const request = new NextRequest('http://localhost:3000/api/orders?page=3', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(5)
    expect(data.meta.pagination.page).toBe(3)
    expect(data.meta.pagination.total).toBe(25)
  })

  it('should return empty array and proper metadata when no orders exist', async () => {
    // Arrange: Mock Strapi response with no orders
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: {
          pagination: {
            page: 1,
            pageSize: 10,
            pageCount: 0,
            total: 0
          }
        }
      })
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
    expect(data.data).toEqual([])
    expect(data.meta.pagination.total).toBe(0)
    expect(data.meta.pagination.pageCount).toBe(0)
  })

  it('should include pagination metadata in response', async () => {
    // Arrange
    const mockOrders = [
      {
        id: 1,
        documentId: 'doc-001',
        orderId: 'ORD-1700000001-A',
        items: [{ id: 1, name: 'Reloj A', price: 100, quantity: 1 }],
        subtotal: 100,
        shipping: 10,
        total: 110,
        orderStatus: 'paid',
        createdAt: '2025-11-20T10:00:00Z',
        updatedAt: '2025-11-20T10:00:00Z',
        publishedAt: '2025-11-20T10:00:00Z'
      }
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockOrders,
        meta: {
          pagination: {
            page: 1,
            pageSize: 10,
            pageCount: 5,
            total: 47
          }
        }
      })
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
    expect(data).toHaveProperty('meta')
    expect(data.meta).toHaveProperty('pagination')
    expect(data.meta.pagination).toEqual({
      page: 1,
      pageSize: 10,
      pageCount: 5,
      total: 47
    })
  })
})
