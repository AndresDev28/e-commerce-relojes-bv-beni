/**
 * [ORD-10] Tests para el middleware de validación de propiedad
 *
 * Tests unitarios siguiendo TDD para el ownership validator middleware.
 *
 * LEARNING: Why test a security middleware?
 * =========================================
 *
 * Security code is CRITICAL - bugs here mean data breaches.
 * These tests ensure:
 * 1. Legitimate users CAN access their resources (no false positives)
 * 2. Attackers CANNOT access others' resources (no false negatives)
 * 3. Audit logging works correctly for compliance
 * 4. No sensitive data leaks in error messages
 *
 * Test categories:
 * - Authorized access (happy path)
 * - Unauthorized access (security path)
 * - Audit logging verification
 * - Data privacy checks
 * - Edge cases
 *
 * CRITERIOS DE ACEPTACIÓN:
 * - Valida correctamente cuando usuario es propietario (200)
 * - Rechaza correctamente cuando usuario NO es propietario (403)
 * - Loggea intentos de acceso no autorizado
 * - NO expone información sensible en logs o errores
 * - Coverage > 80%
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateOrderOwnership,
  hasUserOwnership,
  getValidationSummary,
  type OwnershipValidationResult,
} from '../ownership-validator'

describe('[ORD-10] Ownership Validator Middleware', () => {
  // Mock console methods to test logging without polluting test output
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Spy on console methods to verify logging behavior
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console methods after each test
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  /**
   * Test Suite 1: Authorized Access (User owns the resource)
   *
   * LEARNING: What should happen when access is ALLOWED?
   * ====================================================
   * 1. Return isOwner: true
   * 2. No error object
   * 3. Log successful access for audit trail
   * 4. Allow endpoint to proceed with returning data
   */
  describe('Authorized Access', () => {
    it('should return isOwner: true when user owns the order', () => {
      // Arrange: User ID 1 tries to access their own order
      const authenticatedUserId = 1
      const order = {
        id: 123,
        orderId: 'ORD-1234567890-A',
        user: { id: 1 }, // Same user ID - MATCH!
        total: 99.99,
      }
      const orderId = 'ORD-1234567890-A'

      // Act: Validate ownership
      const result = validateOrderOwnership(authenticatedUserId, order, orderId)

      // Assert: Access should be granted
      expect(result.isOwner).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should log authorized access for audit trail', () => {
      // Arrange: Valid ownership scenario
      const authenticatedUserId = 5
      const order = {
        user: { id: 5 },
        orderId: 'ORD-TEST-001',
      }

      // Act: Validate ownership
      validateOrderOwnership(authenticatedUserId, order, 'ORD-TEST-001')

      // Assert: Should log successful access
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY AUDIT] Authorized order access'),
        expect.objectContaining({
          event: 'authorized_access',
          userId: 5,
          orderId: 'ORD-TEST-001',
          timestamp: expect.any(String),
        })
      )
    })

    it('should not log warnings for authorized access', () => {
      // Arrange: Legitimate user accessing their order
      const authenticatedUserId = 10
      const order = { user: { id: 10 } }

      // Act
      validateOrderOwnership(authenticatedUserId, order, 'ORD-123')

      // Assert: No warnings should be logged for valid access
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })
  })

  /**
   * Test Suite 2: Unauthorized Access (User does NOT own the resource)
   *
   * LEARNING: What should happen when access is DENIED?
   * ===================================================
   * 1. Return isOwner: false
   * 2. Include error object with 403 status
   * 3. Generic error message (no information disclosure)
   * 4. Log unauthorized attempt for security monitoring
   */
  describe('Unauthorized Access', () => {
    it('should return isOwner: false when user does not own the order', () => {
      // Arrange: User ID 1 tries to access User ID 2's order
      const authenticatedUserId = 1
      const order = {
        id: 456,
        orderId: 'ORD-9876543210-B',
        user: { id: 2 }, // Different user ID - NO MATCH!
        total: 199.99,
      }
      const orderId = 'ORD-9876543210-B'

      // Act: Validate ownership
      const result = validateOrderOwnership(authenticatedUserId, order, orderId)

      // Assert: Access should be denied
      expect(result.isOwner).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return 403 status code for unauthorized access', () => {
      // Arrange: Mismatched user IDs
      const authenticatedUserId = 100
      const order = { user: { id: 200 } }

      // Act
      const result = validateOrderOwnership(authenticatedUserId, order, 'ORD-X')

      // Assert: Should return 403 Forbidden
      expect(result.error?.status).toBe(403)
    })

    it('should return generic error message without exposing order details', () => {
      // Arrange: Unauthorized access attempt
      const authenticatedUserId = 50
      const order = {
        user: { id: 99 },
        // Sensitive data that should NOT appear in error:
        customerEmail: 'victim@example.com',
        creditCard: '**** 1234',
        total: 1500.0,
      }

      // Act
      const result = validateOrderOwnership(
        authenticatedUserId,
        order,
        'ORD-SENSITIVE'
      )

      // Assert: Error message should be generic
      expect(result.error?.message).toBe(
        'You do not have permission to view this order'
      )
      // SECURITY: Verify no sensitive data in error message
      expect(result.error?.message).not.toContain('victim@example.com')
      expect(result.error?.message).not.toContain('1234')
      expect(result.error?.message).not.toContain('1500')
    })

    it('should log unauthorized access attempt with security warning', () => {
      // Arrange: Attacker (User 1) trying to access Victim's order (User 999)
      const attackerUserId = 1
      const victimOrder = {
        user: { id: 999 },
        orderId: 'ORD-VICTIM-123',
      }

      // Act: Attempt unauthorized access
      validateOrderOwnership(attackerUserId, victimOrder, 'ORD-VICTIM-123')

      // Assert: Should log security warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY AUDIT] Unauthorized order access'),
        expect.objectContaining({
          event: 'unauthorized_access',
          requestingUserId: 1,
          attemptedOrderId: 'ORD-VICTIM-123',
          actualOwnerId: 999,
          timestamp: expect.any(String),
        })
      )
    })

    it('should NOT log sensitive order data in unauthorized access warning', () => {
      // Arrange: Unauthorized access with sensitive order data
      const authenticatedUserId = 5
      const order = {
        user: { id: 10 },
        // Sensitive information:
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        shippingAddress: '123 Secret St',
        items: [{ name: 'Expensive Watch', price: 5000 }],
        total: 5000,
      }

      // Act
      validateOrderOwnership(authenticatedUserId, order, 'ORD-PRIVATE')

      // Assert: Log should only contain IDs, not sensitive data
      expect(consoleWarnSpy).toHaveBeenCalled()
      const logCall = consoleWarnSpy.mock.calls[0]
      const logData = JSON.stringify(logCall)

      // Verify sensitive data is NOT in logs
      expect(logData).not.toContain('John Doe')
      expect(logData).not.toContain('john@example.com')
      expect(logData).not.toContain('123 Secret St')
      expect(logData).not.toContain('Expensive Watch')
      expect(logData).not.toContain('5000')

      // Verify only IDs are logged
      expect(logData).toContain('requestingUserId')
      expect(logData).toContain('actualOwnerId')
      expect(logData).toContain('ORD-PRIVATE')
    })
  })

  /**
   * Test Suite 3: Edge Cases
   *
   * LEARNING: Why test edge cases in security code?
   * ===============================================
   * Edge cases are where bugs hide, and in security code,
   * bugs = vulnerabilities. We need to ensure the validator
   * handles unusual inputs safely.
   */
  describe('Edge Cases', () => {
    it('should handle userId as 0 correctly', () => {
      // Some systems might use 0 as a valid user ID
      const result = validateOrderOwnership(0, { user: { id: 0 } }, 'ORD-0')

      expect(result.isOwner).toBe(true)
    })

    it('should handle large user IDs correctly', () => {
      const largeId = 999999999
      const result = validateOrderOwnership(
        largeId,
        { user: { id: largeId } },
        'ORD-LARGE'
      )

      expect(result.isOwner).toBe(true)
    })

    it('should handle negative user IDs by rejecting access', () => {
      // Negative IDs should not match positive IDs
      const result = validateOrderOwnership(-1, { user: { id: 1 } }, 'ORD-NEG')

      expect(result.isOwner).toBe(false)
      expect(result.error?.status).toBe(403)
    })

    it('should handle extra properties in order object safely', () => {
      const authenticatedUserId = 1
      const orderWithExtraProps = {
        user: { id: 1 },
        // Extra properties should not affect validation
        extraProp1: 'value1',
        extraProp2: { nested: 'value' },
        extraProp3: [1, 2, 3],
      }

      const result = validateOrderOwnership(
        authenticatedUserId,
        orderWithExtraProps,
        'ORD-EXTRA'
      )

      expect(result.isOwner).toBe(true)
    })
  })

  /**
   * Test Suite 4: Type Guard (hasUserOwnership)
   *
   * LEARNING: Why do we need type guards?
   * =====================================
   * Type guards help ensure runtime type safety. They verify that
   * data from external sources (API, database) has the shape we expect.
   */
  describe('Type Guard: hasUserOwnership', () => {
    it('should return true for valid order object with user.id', () => {
      const validOrder = {
        user: { id: 1 },
        orderId: 'ORD-123',
      }

      expect(hasUserOwnership(validOrder)).toBe(true)
    })

    it('should return false for object without user property', () => {
      const invalidOrder = {
        orderId: 'ORD-123',
        // Missing user property
      }

      expect(hasUserOwnership(invalidOrder)).toBe(false)
    })

    it('should return false for object with user but no id', () => {
      const invalidOrder = {
        user: { name: 'John' }, // Has user but no id
      }

      expect(hasUserOwnership(invalidOrder)).toBe(false)
    })

    it('should return false for null', () => {
      expect(hasUserOwnership(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(hasUserOwnership(undefined)).toBe(false)
    })

    it('should return false for primitive values', () => {
      expect(hasUserOwnership('string')).toBe(false)
      expect(hasUserOwnership(123)).toBe(false)
      expect(hasUserOwnership(true)).toBe(false)
    })

    it('should return false for array', () => {
      expect(hasUserOwnership([{ user: { id: 1 } }])).toBe(false)
    })

    it('should return false when user.id is not a number', () => {
      const invalidOrder = {
        user: { id: '1' }, // String instead of number
      }

      expect(hasUserOwnership(invalidOrder)).toBe(false)
    })
  })

  /**
   * Test Suite 5: Validation Summary (for debugging/monitoring)
   *
   * LEARNING: Why create a "safe" summary?
   * ======================================
   * When debugging or monitoring, we want to see validation results
   * without exposing sensitive error messages that might contain
   * user information.
   */
  describe('Validation Summary', () => {
    it('should return correct summary for successful validation', () => {
      const successResult: OwnershipValidationResult = {
        isOwner: true,
      }

      const summary = getValidationSummary(successResult)

      expect(summary).toEqual({
        isOwner: true,
        hasError: false,
        errorStatus: 0,
      })
    })

    it('should return correct summary for failed validation', () => {
      const failedResult: OwnershipValidationResult = {
        isOwner: false,
        error: {
          message: 'You do not have permission to view this order',
          status: 403,
        },
      }

      const summary = getValidationSummary(failedResult)

      expect(summary).toEqual({
        isOwner: false,
        hasError: true,
        errorStatus: 403,
      })
    })

    it('should not include sensitive error message in summary', () => {
      const result: OwnershipValidationResult = {
        isOwner: false,
        error: {
          message: 'Sensitive error message with user data',
          status: 403,
        },
      }

      const summary = getValidationSummary(result)

      // Summary should NOT contain the error message
      expect(Object.keys(summary)).not.toContain('errorMessage')
      expect(Object.values(summary)).not.toContain(
        'Sensitive error message with user data'
      )
    })
  })

  /**
   * Test Suite 6: Audit Logging Format
   *
   * LEARNING: Why validate log format?
   * ==================================
   * Audit logs are used for:
   * - Security monitoring
   * - Compliance audits
   * - Incident investigation
   *
   * Consistent log format is critical for automated analysis.
   */
  describe('Audit Logging Format', () => {
    it('should include ISO timestamp in audit logs', () => {
      const authenticatedUserId = 1
      const order = { user: { id: 1 } }

      validateOrderOwnership(authenticatedUserId, order, 'ORD-TIME')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
          ),
        })
      )
    })

    it('should include all required fields in authorized access log', () => {
      const authenticatedUserId = 42
      const order = { user: { id: 42 } }

      validateOrderOwnership(authenticatedUserId, order, 'ORD-COMPLETE')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          event: 'authorized_access',
          userId: 42,
          orderId: 'ORD-COMPLETE',
          timestamp: expect.any(String),
        })
      )
    })

    it('should include all required fields in unauthorized access log', () => {
      const authenticatedUserId = 10
      const order = { user: { id: 20 } }

      validateOrderOwnership(authenticatedUserId, order, 'ORD-DENIED')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          event: 'unauthorized_access',
          requestingUserId: 10,
          attemptedOrderId: 'ORD-DENIED',
          actualOwnerId: 20,
          timestamp: expect.any(String),
        })
      )
    })
  })
})
