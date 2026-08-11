/**
 * Pure helper that validates and sanitizes a redirect target.
 * Always returns a safe same-origin path, falling back to `/mi-cuenta`
 * when the input is missing, invalid, or potentially malicious.
 */
const DEFAULT_REDIRECT = '/mi-cuenta'

export function sanitizeRedirect(value: string | null | undefined): string {
  if (typeof value !== 'string' || value.length === 0) return DEFAULT_REDIRECT
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\')
  ) {
    return DEFAULT_REDIRECT
  }
  // Reject schemes hidden after leading slash quirks and bare scheme URLs
  const lower = value.toLowerCase()
  if (
    lower.includes('://') ||
    lower.startsWith('/javascript:') ||
    lower.startsWith('/data:') ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  ) {
    return DEFAULT_REDIRECT
  }
  // First path segment only (ignore query/fragment)
  const pathOnly = value.split(/[?#]/, 2)[0] ?? value
  const segment = pathOnly.split('/').filter(Boolean)[0]?.toLowerCase()
  if (segment === 'login' || segment === 'registro') return DEFAULT_REDIRECT
  return value
}
