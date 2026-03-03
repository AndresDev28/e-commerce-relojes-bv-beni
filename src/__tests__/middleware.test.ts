import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { middleware } from '../middleware'
import { NextRequest, NextResponse } from 'next/server'

describe('Rate Limit Middleware', () => {
    beforeEach(() => {
        // Reset internal state by waiting for the window MS or mocking the Date.now
        // Since ipMap is not exported, we simulate requests directly.
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    const createMockRequest = (pathname: string, ip: string) => {
        const url = new URL(`http://localhost${pathname}`)
        return new NextRequest(url, {
            headers: new Headers({
                'x-forwarded-for': ip
            })
        })
    }

    it('should allow requests below the limit (path /api/checkout)', async () => {
        const req = createMockRequest('/api/checkout', '192.168.1.100')
        const response = middleware(req)

        // As per middleware definition, allowed requests returning NextResponse.next() 
        // are functionally distinguishable from custom NEXT_RESPONSE (429) via headers and status.
        expect(response.status).toBe(200) // NextResponse.next() usually implies 200 or no specific block
        expect(response.headers.get('Retry-After')).toBeNull()
    })

    it('should return 429 when limit is exceeded', () => {
        const req = createMockRequest('/api/orders/123', '192.168.1.5')

        let lastResponse;
        // Window limit in middleware is 10. Let's send 11.
        for (let i = 0; i < 11; i++) {
            lastResponse = middleware(req)
        }

        // The 11th request should be blocked
        expect(lastResponse!.status).toBe(429)
        expect(lastResponse!.headers.get('Retry-After')).toBe('60')
        expect(lastResponse!.headers.get('Content-Type')).toBe('application/json')
    })

    it('should reset limit after timeframe', () => {
        const req = createMockRequest('/api/send-order-email', '10.0.0.1')

        // Exhaust limit
        for (let i = 0; i < 11; i++) {
            middleware(req)
        }

        // Advance time by 61 seconds (Window is 60s)
        vi.advanceTimersByTime(61 * 1000)

        // Should be allowed again
        const newResponse = middleware(req)
        expect(newResponse.status).not.toBe(429)
    })

    it('should ignore non-critical paths', () => {
        const req = createMockRequest('/tienda', '192.168.1.200')

        // Attempt 15 requests
        for (let i = 0; i < 15; i++) {
            middleware(req)
        }

        // None should be blocked
        const response = middleware(req)
        expect(response.status).not.toBe(429)
    })
})
