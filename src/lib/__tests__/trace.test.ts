/**
 * Unit tests for getTraceId helper.
 *
 * COVERAGE:
 * - Returns existing X-Trace-Id header when present
 * - Generates new UUID when header is absent
 * - Generated id matches UUID v4 format
 */

import { describe, it, expect } from 'vitest'
import { getTraceId } from '@/lib/trace'
import { NextRequest } from 'next/server'

describe('getTraceId', () => {
  it('returns existing X-Trace-Id header when present', () => {
    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: { 'X-Trace-Id': 'existing-trace-123' },
    })

    const traceId = getTraceId(request)

    expect(traceId).toBe('existing-trace-123')
  })

  it('generates a new UUID when X-Trace-Id is absent', () => {
    const request = new NextRequest('http://localhost:3000/api/orders')

    const traceId = getTraceId(request)

    expect(traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('generates unique ids for different requests without header', () => {
    const request1 = new NextRequest('http://localhost:3000/api/orders')
    const request2 = new NextRequest('http://localhost:3000/api/orders')

    const traceId1 = getTraceId(request1)
    const traceId2 = getTraceId(request2)

    expect(traceId1).not.toBe(traceId2)
  })
})
