/**
 * [ORD-14] Tests for formatPaymentMethod - EPIC-15
 *
 * Unit tests for payment method formatting utility.
 *
 * COVERAGE:
 * - Different card brands (Visa, Mastercard, Amex, etc.)
 * - Different last4 values
 * - Missing/partial information
 * - Security: Never exposes full card numbers
 * - Edge cases: empty strings, invalid inputs
 */

import { describe, it, expect } from 'vitest'
import { formatPaymentMethod, PaymentMethodInput } from '../formatPaymentMethod'

describe('[ORD-14] formatPaymentMethod', () => {
  describe('Basic Formatting', () => {
    it('formats Visa card with last4', () => {
      const result = formatPaymentMethod({ brand: 'visa', last4: '4242' })
      expect(result).toBe('Visa ****4242')
    })

    it('formats Mastercard with last4', () => {
      const result = formatPaymentMethod({ brand: 'mastercard', last4: '1234' })
      expect(result).toBe('Mastercard ****1234')
    })

    it('formats American Express with last4', () => {
      const result = formatPaymentMethod({ brand: 'amex', last4: '0005' })
      expect(result).toBe('American Express ****0005')
    })

    it('formats Discover with last4', () => {
      const result = formatPaymentMethod({ brand: 'discover', last4: '9999' })
      expect(result).toBe('Discover ****9999')
    })

    it('formats Diners Club with last4', () => {
      const result = formatPaymentMethod({ brand: 'diners', last4: '1111' })
      expect(result).toBe('Diners Club ****1111')
    })

    it('formats JCB with last4', () => {
      const result = formatPaymentMethod({ brand: 'jcb', last4: '2222' })
      expect(result).toBe('JCB ****2222')
    })

    it('formats UnionPay with last4', () => {
      const result = formatPaymentMethod({ brand: 'unionpay', last4: '3333' })
      expect(result).toBe('UnionPay ****3333')
    })
  })

  describe('Unknown Brands', () => {
    it('capitalizes unknown brand names', () => {
      const result = formatPaymentMethod({ brand: 'newcard', last4: '5555' })
      expect(result).toBe('Newcard ****5555')
    })

    it('handles uppercase brand input', () => {
      const result = formatPaymentMethod({ brand: 'VISA', last4: '4242' })
      expect(result).toBe('Visa ****4242')
    })

    it('handles mixed case brand input', () => {
      const result = formatPaymentMethod({ brand: 'MasterCard', last4: '1234' })
      expect(result).toBe('Mastercard ****1234')
    })

    it('handles brand with leading/trailing spaces', () => {
      const result = formatPaymentMethod({ brand: '  visa  ', last4: '4242' })
      expect(result).toBe('Visa ****4242')
    })
  })

  describe('Partial Information', () => {
    it('returns only brand name when last4 is missing', () => {
      const result = formatPaymentMethod({ brand: 'visa' })
      expect(result).toBe('Visa')
    })

    it('returns "Tarjeta ****XXXX" when only last4 is provided', () => {
      const result = formatPaymentMethod({ last4: '4242' })
      expect(result).toBe('Tarjeta ****4242')
    })

    it('returns default when brand is empty string', () => {
      const result = formatPaymentMethod({ brand: '', last4: '4242' })
      expect(result).toBe('Tarjeta ****4242')
    })

    it('returns brand only when last4 is empty string', () => {
      const result = formatPaymentMethod({ brand: 'visa', last4: '' })
      expect(result).toBe('Visa')
    })
  })

  describe('No Information (Fallback)', () => {
    it('returns default when no info provided (undefined)', () => {
      const result = formatPaymentMethod(undefined)
      expect(result).toBe('Tarjeta de crédito')
    })

    it('returns default when empty object provided', () => {
      const result = formatPaymentMethod({})
      expect(result).toBe('Tarjeta de crédito')
    })

    it('returns default when all values are empty strings', () => {
      const result = formatPaymentMethod({ brand: '', last4: '' })
      expect(result).toBe('Tarjeta de crédito')
    })

    it('returns default when called with no arguments', () => {
      const result = formatPaymentMethod()
      expect(result).toBe('Tarjeta de crédito')
    })
  })

  describe('Security: Never Expose Full Card Numbers', () => {
    it('ignores last4 with more than 4 digits (full card number)', () => {
      const result = formatPaymentMethod({
        brand: 'visa',
        last4: '4242424242424242',
      })
      // Should NOT expose the full number, only return brand
      expect(result).toBe('Visa')
      expect(result).not.toContain('4242424242424242')
    })

    it('ignores last4 with 16 digits', () => {
      const result = formatPaymentMethod({
        brand: 'mastercard',
        last4: '5555555555554444',
      })
      expect(result).toBe('Mastercard')
    })

    it('ignores last4 with 5 digits', () => {
      const result = formatPaymentMethod({
        brand: 'visa',
        last4: '42424',
      })
      expect(result).toBe('Visa')
    })

    it('ignores last4 with 3 digits', () => {
      const result = formatPaymentMethod({
        brand: 'visa',
        last4: '424',
      })
      expect(result).toBe('Visa')
    })

    it('ignores last4 with letters', () => {
      const result = formatPaymentMethod({
        brand: 'visa',
        last4: '42ab',
      })
      expect(result).toBe('Visa')
    })

    it('ignores last4 with special characters', () => {
      const result = formatPaymentMethod({
        brand: 'visa',
        last4: '42-42',
      })
      expect(result).toBe('Visa')
    })

    it('ignores last4 with spaces', () => {
      const result = formatPaymentMethod({
        brand: 'visa',
        last4: '4 242',
      })
      expect(result).toBe('Visa')
    })

    it('output never contains more than 4 consecutive digits', () => {
      // Test various inputs to ensure output is always safe
      const testCases: PaymentMethodInput[] = [
        { brand: 'visa', last4: '4242' },
        { brand: 'visa', last4: '4242424242424242' },
        { brand: 'visa', last4: '12345' },
        { last4: '4242' },
        {},
      ]

      testCases.forEach(input => {
        const result = formatPaymentMethod(input)
        // Check that output doesn't contain more than 4 consecutive digits
        const digitSequences = result.match(/\d+/g) || []
        digitSequences.forEach(seq => {
          expect(seq.length).toBeLessThanOrEqual(4)
        })
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles null-like values gracefully', () => {
      // TypeScript would prevent null, but test runtime behavior
      const result = formatPaymentMethod(null as unknown as PaymentMethodInput)
      expect(result).toBe('Tarjeta de crédito')
    })

    it('handles last4 with leading zeros', () => {
      const result = formatPaymentMethod({ brand: 'amex', last4: '0001' })
      expect(result).toBe('American Express ****0001')
    })

    it('handles last4 as all zeros', () => {
      const result = formatPaymentMethod({ brand: 'visa', last4: '0000' })
      expect(result).toBe('Visa ****0000')
    })

    it('handles last4 as all nines', () => {
      const result = formatPaymentMethod({ brand: 'visa', last4: '9999' })
      expect(result).toBe('Visa ****9999')
    })

    it('handles method field (ignored for now, Stripe only)', () => {
      const result = formatPaymentMethod({
        brand: 'visa',
        last4: '4242',
        method: 'card',
      })
      expect(result).toBe('Visa ****4242')
    })
  })

  describe('Output Format Verification', () => {
    it('uses asterisks (****) not dots (••••)', () => {
      const result = formatPaymentMethod({ brand: 'visa', last4: '4242' })
      expect(result).toContain('****')
      expect(result).not.toContain('••••')
    })

    it('has single space between brand and masked number', () => {
      const result = formatPaymentMethod({ brand: 'visa', last4: '4242' })
      expect(result).toBe('Visa ****4242')
      expect(result.split(' ').length).toBe(2)
    })

    it('asterisks directly precede the 4 digits', () => {
      const result = formatPaymentMethod({ brand: 'visa', last4: '4242' })
      expect(result).toMatch(/\*{4}\d{4}$/)
    })
  })
})
