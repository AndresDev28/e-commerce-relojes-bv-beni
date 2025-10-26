import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  handleStripeError,
  getErrorSuggestion,
  isRecoverableError,
  requiresDifferentCard,
} from '../errorHandler'
import type { StripeError } from '@/types'

describe('errorHandler - [PAY-09]', () => {
  describe('handleStripeError()', () => {
    describe('Errores de Stripe', () => {
      it('should handle card_declined error', () => {
        const stripeError = {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.',
        }

        const result = handleStripeError(stripeError)

        expect(result.type).toBe('card_error')
        expect(result.code).toBe('card_declined')
        expect(result.localizedMessage).toBe(
          'Tu tarjeta fue rechazada. Por favor, contacta con tu banco.'
        )
        expect(result.message).toBe('Your card was declined.')
      })

      it('should handle expired_card error', () => {
        const stripeError = {
          type: 'card_error',
          code: 'expired_card',
          message: 'Your card has expired.',
        }

        const result = handleStripeError(stripeError)

        expect(result.code).toBe('expired_card')
        expect(result.localizedMessage).toBe(
          'Tu tarjeta ha caducado. Por favor, usa otra tarjeta.'
        )
      })

      it('should handle incorrect_cvc error', () => {
        const stripeError = {
          type: 'card_error',
          code: 'incorrect_cvc',
          message: "Your card's security code is incorrect.",
        }

        const result = handleStripeError(stripeError)

        expect(result.code).toBe('incorrect_cvc')
        expect(result.localizedMessage).toBe(
          'El código de seguridad (CVV/CVC) es incorrecto.'
        )
      })

      it('should handle insufficient_funds error', () => {
        const stripeError = {
          type: 'card_error',
          code: 'insufficient_funds',
          message: 'Your card has insufficient funds.',
        }

        const result = handleStripeError(stripeError)

        expect(result.code).toBe('insufficient_funds')
        expect(result.localizedMessage).toBe(
          'Tu tarjeta no tiene fondos suficientes.'
        )
      })

      it('should handle processing_error', () => {
        const stripeError = {
          type: 'card_error',
          code: 'processing_error',
          message: 'An error occurred while processing your card.',
        }

        const result = handleStripeError(stripeError)

        expect(result.code).toBe('processing_error')
        expect(result.localizedMessage).toBe(
          'Hubo un error al procesar el pago. Intenta de nuevo.'
        )
      })

      it('should include decline_code and param when provided', () => {
        const stripeError = {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.',
          decline_code: 'generic_decline',
          param: 'card_number',
        }

        const result = handleStripeError(stripeError)

        expect(result.declineCode).toBe('generic_decline')
        expect(result.param).toBe('card_number')
      })

      it('should use default message for unknown error code', () => {
        const stripeError = {
          type: 'card_error',
          code: 'unknown_code_xyz',
          message: 'Unknown error',
        }

        const result = handleStripeError(stripeError)

        expect(result.localizedMessage).toBe(
          'Hubo un problema al procesar tu pago. Por favor, intenta de nuevo.'
        )
      })
    })

    describe('Errores de red', () => {
      it('should handle NetworkError', () => {
        const networkError = new Error('Network request failed')
        networkError.name = 'NetworkError'

        const result = handleStripeError(networkError)

        expect(result.type).toBe('network_error')
        expect(result.code).toBe('network_error')
        expect(result.localizedMessage).toBe(
          'Sin conexión. Verifica tu internet.'
        )
      })

      it('should detect network error from message', () => {
        const error = new Error('Failed to fetch: network error')

        const result = handleStripeError(error)

        expect(result.type).toBe('network_error')
        expect(result.localizedMessage).toContain('Sin conexión')
      })
    })

    describe('Errores de timeout', () => {
      it('should handle TimeoutError', () => {
        const timeoutError = new Error('Request timeout')
        timeoutError.name = 'TimeoutError'

        const result = handleStripeError(timeoutError)

        expect(result.type).toBe('api_error')
        expect(result.code).toBe('timeout')
        expect(result.localizedMessage).toBe(
          'Tiempo de espera agotado. Por favor, intenta de nuevo.'
        )
      })

      it('should detect timeout from message', () => {
        const error = new Error('Request timeout exceeded')

        const result = handleStripeError(error)

        expect(result.type).toBe('api_error')
        expect(result.localizedMessage).toContain('Tiempo de espera')
      })
    })

    describe('Errores desconocidos', () => {
      it('should handle generic Error', () => {
        const error = new Error('Generic error message')

        const result = handleStripeError(error)

        expect(result.type).toBe('unknown_error')
        expect(result.message).toBe('Generic error message')
        expect(result.localizedMessage).toBe(
          'Hubo un problema al procesar tu pago. Por favor, intenta de nuevo.'
        )
      })

      it('should handle non-Error objects', () => {
        const error = 'String error'

        const result = handleStripeError(error)

        expect(result.type).toBe('unknown_error')
        expect(result.message).toBe('String error')
      })

      it('should handle null/undefined', () => {
        const result1 = handleStripeError(null)
        const result2 = handleStripeError(undefined)

        expect(result1.type).toBe('unknown_error')
        expect(result2.type).toBe('unknown_error')
      })
    })
  })

  describe('getErrorSuggestion()', () => {
    it('should return suggestion for card_declined', () => {
      const suggestion = getErrorSuggestion('card_declined')

      expect(suggestion).toBe(
        'Contacta con tu banco o intenta con otra tarjeta.'
      )
    })

    it('should return suggestion for incorrect_cvc', () => {
      const suggestion = getErrorSuggestion('incorrect_cvc')

      expect(suggestion).toBe(
        'Verifica el código de 3 o 4 dígitos en el reverso de tu tarjeta.'
      )
    })

    it('should return undefined for unknown code', () => {
      const suggestion = getErrorSuggestion('unknown_code')

      expect(suggestion).toBeUndefined()
    })

    it('should return undefined when no code provided', () => {
      const suggestion = getErrorSuggestion()

      expect(suggestion).toBeUndefined()
    })
  })

  describe('isRecoverableError()', () => {
    it('should return true for incorrect_cvc', () => {
      const error: StripeError = {
        type: 'card_error',
        code: 'incorrect_cvc',
        message: 'Incorrect CVC',
        localizedMessage: 'CVC incorrecto',
      }

      expect(isRecoverableError(error)).toBe(true)
    })

    it('should return true for network_error', () => {
      const error: StripeError = {
        type: 'network_error',
        code: 'network_error',
        message: 'Network error',
        localizedMessage: 'Error de red',
      }

      expect(isRecoverableError(error)).toBe(true)
    })

    it('should return false for card_declined', () => {
      const error: StripeError = {
        type: 'card_error',
        code: 'card_declined',
        message: 'Card declined',
        localizedMessage: 'Tarjeta rechazada',
      }

      expect(isRecoverableError(error)).toBe(false)
    })

    it('should return false when no code', () => {
      const error: StripeError = {
        type: 'unknown_error',
        message: 'Unknown',
        localizedMessage: 'Desconocido',
      }

      expect(isRecoverableError(error)).toBe(false)
    })
  })

  describe('requiresDifferentCard()', () => {
    it('should return true for expired_card', () => {
      const error: StripeError = {
        type: 'card_error',
        code: 'expired_card',
        message: 'Expired',
        localizedMessage: 'Caducada',
      }

      expect(requiresDifferentCard(error)).toBe(true)
    })

    it('should return true for insufficient_funds', () => {
      const error: StripeError = {
        type: 'card_error',
        code: 'insufficient_funds',
        message: 'Insufficient funds',
        localizedMessage: 'Fondos insuficientes',
      }

      expect(requiresDifferentCard(error)).toBe(true)
    })

    it('should return false for incorrect_cvc', () => {
      const error: StripeError = {
        type: 'card_error',
        code: 'incorrect_cvc',
        message: 'Incorrect CVC',
        localizedMessage: 'CVC incorrecto',
      }

      expect(requiresDifferentCard(error)).toBe(false)
    })

    it('should return false when no code', () => {
      const error: StripeError = {
        type: 'unknown_error',
        message: 'Unknown',
        localizedMessage: 'Desconocido',
      }

      expect(requiresDifferentCard(error)).toBe(false)
    })
  })

  // describe('Logging en desarrollo', () => {
  //   const originalEnv = process.env.NODE_ENV

  //   beforeEach(() => {
  //     vi.spyOn(console, 'group').mockImplementation(() => {})
  //     vi.spyOn(console, 'log').mockImplementation(() => {})
  //     vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
  //   })

  //   afterEach(() => {
  //     vi.restoreAllMocks()
  //     process.env.NODE_ENV = originalEnv
  //   })

  //   it('should log errors in development', () => {
  //     process.env.NODE_ENV = 'development'

  //     const stripeError = {
  //       type: 'card_error',
  //       code: 'card_declined',
  //       message: 'Card declined',
  //     }

  //     handleStripeError(stripeError)

  //     expect(console.group).toHaveBeenCalledWith('🔴 Stripe Error')
  //     expect(console.log).toHaveBeenCalled()
  //     expect(console.groupEnd).toHaveBeenCalled()
  //   })

  //   it('should not log in production', () => {
  //     process.env.NODE_ENV = 'production'

  //     const stripeError = {
  //       type: 'card_error',
  //       code: 'card_declined',
  //       message: 'Card declined',
  //     }

  //     handleStripeError(stripeError)

  //     expect(console.group).not.toHaveBeenCalled()
  //   })
  // })
})
