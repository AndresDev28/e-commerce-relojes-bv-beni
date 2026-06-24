/**
 * Trace ID helper for request correlation.
 *
 * Reads an existing `X-Trace-Id` header from an incoming request or
 * generates a new one. Use this in route handlers to propagate the
 * same trace id to Strapi, Stripe, and response headers.
 */

/**
 * Read the `X-Trace-Id` header from a request, or generate a new one.
 *
 * If the request already carries a trace id (e.g. from a client-side
 * fetch that generated one), it is preserved. Otherwise a fresh UUID
 * is created.
 */
export function getTraceId(request: Request | { headers: { get: (name: string) => string | null } }): string {
  const existing = request.headers.get('X-Trace-Id')
  if (existing) return existing
  return generateTraceId()
}

/**
 * Generate a unique trace ID (UUID v4 or fallback).
 */
function generateTraceId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}
