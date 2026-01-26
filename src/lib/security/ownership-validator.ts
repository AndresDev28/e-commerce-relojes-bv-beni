/**
 * [ORD-10] Resource Ownership Validator
 *
 * This module provides reusable validation for resource ownership in API endpoints.
 * It ensures that authenticated users can only access resources they own, preventing
 * unauthorized data access.
 *
 * LEARNING: What is Resource Ownership Validation?
 * ================================================
 *
 * Imagine you have an e-commerce site with orders. Each order belongs to a user.
 * Without ownership validation:
 *
 * ❌ BAD: User A could access User B's orders
 * User A: GET /api/orders/ORD-123 (User B's order)
 * Response: 200 OK with User B's order data ← SECURITY BREACH!
 *
 * ✅ GOOD: User A can only see their own orders
 * User A: GET /api/orders/ORD-123 (User B's order)
 * Response: 403 Forbidden ← Access denied!
 *
 * This is critical for:
 * 1. **Privacy**: Users shouldn't see others' data (orders, profiles, etc.)
 * 2. **Security**: Prevents horizontal privilege escalation attacks
 * 3. **Compliance**: Required by GDPR, PCI DSS, and other regulations
 * 4. **Trust**: Users trust your app to keep their data private
 *
 * LEARNING: What is Horizontal Privilege Escalation?
 * ==================================================
 *
 * This is when a user with valid credentials accesses resources of ANOTHER user
 * at the same privilege level.
 *
 * Example attack scenario:
 * 1. Attacker creates legitimate account (User ID: 100)
 * 2. Attacker notices order URLs: /api/orders/ORD-123
 * 3. Attacker tries: /api/orders/ORD-124, ORD-125, etc.
 * 4. If no ownership validation → Attacker sees OTHER users' orders!
 *
 * This middleware prevents this by checking: "Does the authenticated user OWN this resource?"
 *
 * LEARNING: Why use a reusable middleware?
 * ========================================
 *
 * Without middleware (inline validation in each endpoint):
 * - Code duplication across multiple endpoints
 * - Inconsistent validation logic
 * - Hard to maintain and test
 * - Easy to forget validation in new endpoints
 *
 * With middleware (centralized validation):
 * - Write once, use everywhere
 * - Consistent security across all endpoints
 * - Easy to add features (like audit logging)
 * - Single source of truth for tests
 */

/**
 * Result of ownership validation
 */
export interface OwnershipValidationResult {
  /** Whether the user owns the resource */
  isOwner: boolean
  /** Error details if validation fails */
  error?: {
    message: string
    status: number
  }
}

/**
 * Audit log entry for security monitoring
 */
export interface OwnershipAuditLog {
  /** ISO timestamp of the access attempt */
  timestamp: string
  /** Type of event (success or unauthorized_access) */
  event: 'authorized_access' | 'unauthorized_access'
  /** ID of the user making the request */
  requestingUserId: number
  /** ID of the resource being accessed */
  resourceId: string
  /** Type of resource (e.g., 'order', 'profile') */
  resourceType: string
  /** ID of the actual owner (only for unauthorized attempts) */
  actualOwnerId?: number
}

/**
 * Validates that a user owns a specific order
 *
 * LEARNING: Why do we need this function?
 * ======================================
 *
 * This function centralizes the ownership check logic so it can be:
 * 1. Reused across multiple endpoints
 * 2. Tested independently
 * 3. Enhanced with logging and monitoring
 * 4. Modified without touching endpoint code
 *
 * Security flow:
 * 1. Endpoint authenticates user (gets userId from JWT)
 * 2. Endpoint fetches order from database (includes owner info)
 * 3. THIS FUNCTION compares: order.user.id === authenticatedUserId
 * 4. If match → Allow access
 * 5. If no match → Deny access + Log attempt
 *
 * @param authenticatedUserId - ID of the user making the request (from JWT)
 * @param order - The order object from Strapi (must include user relation)
 * @param orderId - The order ID for logging purposes
 * @returns Validation result with isOwner flag and optional error
 *
 * @example
 * ```typescript
 * const order = await fetchOrderFromStrapi('ORD-123')
 * const result = validateOrderOwnership(
 *   authenticatedUserId: 1,
 *   order: { id: 1, user: { id: 1 }, ... },
 *   orderId: 'ORD-123'
 * )
 *
 * if (!result.isOwner) {
 *   return NextResponse.json(
 *     { error: result.error.message },
 *     { status: result.error.status }
 *   )
 * }
 * ```
 */
export function validateOrderOwnership(
  authenticatedUserId: number,
  order: { user?: { id: number }; [key: string]: unknown },
  orderId: string
): OwnershipValidationResult {
  // ================================================================
  // OWNERSHIP VALIDATION
  // ================================================================
  // Compare the authenticated user's ID with the order's owner ID
  // This is the core security check that prevents unauthorized access

  // Defensive check: ensure user relation is populated
  if (!order.user || typeof order.user.id !== 'number') {
    console.error(
      `❌ SECURITY ERROR: Order ${orderId} has no user relation. This should never happen.`
    )
    return {
      isOwner: false,
      error: {
        message: 'Order ownership could not be verified',
        status: 500,
      },
    }
  }

  const isOwner = order.user.id === authenticatedUserId

  // ================================================================
  // SECURITY AUDIT LOGGING
  // ================================================================
  // Log ALL access attempts for security monitoring and compliance
  // This helps detect:
  // - Brute force attempts (many failed validations)
  // - Compromised accounts (unusual access patterns)
  // - Application bugs (incorrect user IDs)

  const auditLog: OwnershipAuditLog = {
    timestamp: new Date().toISOString(),
    event: isOwner ? 'authorized_access' : 'unauthorized_access',
    requestingUserId: authenticatedUserId,
    resourceId: orderId,
    resourceType: 'order',
    actualOwnerId: !isOwner ? order.user.id : undefined,
  }

  // LEARNING: Why different log levels?
  // ===================================
  // - console.log: Normal operations (authorized access)
  // - console.warn: Suspicious but not critical (unauthorized attempts)
  // - console.error: Critical security issues (repeated attacks)
  //
  // Log aggregation tools (Datadog, LogRocket, Sentry) can:
  // - Alert on multiple console.warn within a timeframe
  // - Track trends in unauthorized access attempts
  // - Identify compromised accounts

  if (isOwner) {
    // Successful access - log at INFO level for audit trail
    console.log('🔒 [SECURITY AUDIT] Authorized order access:', {
      event: auditLog.event,
      userId: auditLog.requestingUserId,
      orderId: auditLog.resourceId,
      timestamp: auditLog.timestamp,
    })
  } else {
    // SECURITY WARNING: Unauthorized access attempt detected!
    // This could be:
    // - Legitimate user mistake (wrong URL)
    // - Attacker probing for vulnerabilities
    // - Bug in the application
    console.warn('⚠️ [SECURITY AUDIT] Unauthorized order access attempt:', {
      event: auditLog.event,
      requestingUserId: auditLog.requestingUserId,
      attemptedOrderId: auditLog.resourceId,
      actualOwnerId: auditLog.actualOwnerId,
      timestamp: auditLog.timestamp,
      // IMPORTANT: We log IDs but NOT sensitive order data
      // This prevents exposing customer information in logs
    })
  }

  // ================================================================
  // RETURN RESULT
  // ================================================================

  if (isOwner) {
    // Access granted - user owns the resource
    return {
      isOwner: true,
    }
  }

  // Access denied - user does NOT own the resource
  // SECURITY: Generic error message prevents information disclosure
  // We don't tell the attacker:
  // - Whether the order exists (prevents enumeration)
  // - Who owns it (protects privacy)
  // - Any details about the order (no data leakage)

  return {
    isOwner: false,
    error: {
      message: 'You do not have permission to view this order',
      status: 403, // 403 Forbidden: Authenticated but not authorized
    },
  }
}

/**
 * Type guard to check if an object has a user property with an id
 *
 * LEARNING: What is a Type Guard?
 * ================================
 *
 * TypeScript type guards help ensure type safety at runtime.
 * This function checks if an object has the structure we expect:
 * { user: { id: number } }
 *
 * Use case:
 * ```typescript
 * const orderData = await fetchOrder() // unknown type
 *
 * if (hasUserOwnership(orderData)) {
 *   // TypeScript now knows orderData.user.id is a number
 *   validateOrderOwnership(userId, orderData, orderId)
 * }
 * ```
 *
 * @param obj - Object to check
 * @returns True if object has user.id property
 */
export function hasUserOwnership(
  obj: unknown
): obj is { user: { id: number }; [key: string]: unknown } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'user' in obj &&
    typeof obj.user === 'object' &&
    obj.user !== null &&
    'id' in obj.user &&
    typeof obj.user.id === 'number'
  )
}

/**
 * Gets a safe summary of validation result for logging/debugging
 * Does NOT include sensitive information
 *
 * LEARNING: Why "safe" summary?
 * ============================
 *
 * When debugging or logging, we want information but NOT sensitive data.
 *
 * ❌ UNSAFE: Including order details in logs
 * { isOwner: false, orderTotal: 1299.99, customerEmail: "user@example.com" }
 * → If logs are compromised, customer data is exposed
 *
 * ✅ SAFE: Only metadata
 * { isOwner: false, hasError: true, errorStatus: 403 }
 * → Even if logs leak, no customer data is exposed
 *
 * @param result - Validation result
 * @returns Safe summary object
 */
export function getValidationSummary(
  result: OwnershipValidationResult
): Record<string, string | number | boolean> {
  return {
    isOwner: result.isOwner,
    hasError: !!result.error,
    errorStatus: result.error?.status ?? 0,
    // Note: We deliberately do NOT include error message
    // to prevent sensitive information in monitoring dashboards
  }
}
