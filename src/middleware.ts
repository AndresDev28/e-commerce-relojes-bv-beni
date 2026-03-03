import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// [SEC-01] Simple in-memory state for basic rate limiting in Edge runtime
// Note: This applies per isolate (Vercel edge node). It's a basic MVP implementation.
// For true global distributed rate limit, @upstash/ratelimit + redis is recommended.
const ipMap = new Map<string, { count: number, resetTime: number }>()

const LIMIT = 10 // Max requests
const WINDOW_MS = 60 * 1000 // 1 minute

function applyRateLimit(ip: string) {
    const now = Date.now()
    const windowData = ipMap.get(ip)

    if (!windowData || now > windowData.resetTime) {
        ipMap.set(ip, { count: 1, resetTime: now + WINDOW_MS })
        return { success: true }
    }

    if (windowData.count >= LIMIT) {
        return { success: false }
    }

    windowData.count++
    return { success: true }
}

export function middleware(request: NextRequest) {
    // Extract the pathname for check
    const path = request.nextUrl.pathname

    // Apply rate limiting to checkout, orders and email webhook endpoint
    if (path.startsWith('/api/orders') ||
        path.startsWith('/api/checkout') ||
        path.startsWith('/api/send-order-email')) {

        // Attempt to extract client IP address (works with Vercel and standard proxies)
        const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'anonymous'

        const { success } = applyRateLimit(ip)

        if (!success) {
            console.warn(`[RATE LIMIT EXCEEDED] IP: ${ip} on path: ${path}`)
            return new NextResponse(
                JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded, try again later.' }),
                {
                    status: 429,
                    headers: {
                        'Retry-After': '60',
                        'Content-Type': 'application/json'
                    }
                }
            )
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/api/orders/:path*',
        '/api/checkout/:path*',
        '/api/send-order-email'
    ],
}
