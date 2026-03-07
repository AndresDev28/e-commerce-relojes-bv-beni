/**
 * Utility functions to mask Personally Identifiable Information (PII)
 * Antigravity Global Rule #2: Zero Persistence of PII in logs
 */

/**
 * Masks an email address to protect PII.
 * @example
 * maskEmail("test@example.com") // "t***@example.com"
 * maskEmail("customer@domain.com") // "c***@domain.com"
 */
export function maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***'
    const [localPart, domain] = email.split('@')
    if (localPart.length <= 1) return `***@${domain}`

    const firstChar = localPart[0]
    return `${firstChar}***@${domain}`
}

/**
 * Masks a name to protect PII.
 * @example
 * maskName("Juan Perez") // "J*** P***"
 */
export function maskName(name: string | undefined | null): string {
    if (!name) return '***'

    return name
        .split(' ')
        .map(word => {
            if (word.length <= 1) return '***'
            return `${word[0]}***`
        })
        .join(' ')
}

/**
 * Masks payment information (e.g. card last 4 digits) if needed.
 * @example
 * maskCardLast4("4242") // "***2"
 */
export function maskCardLast4(last4: string | undefined | null): string {
    if (!last4 || last4.length < 4) return '***'
    return `***${last4.slice(-1)}`
}
