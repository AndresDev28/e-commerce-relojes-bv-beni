import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'
import * as ordersFeature from '@/features/orders'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

vi.mock('@/features/orders', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/orders')>()
  return {
    ...actual,
    requestCancellationService: vi.fn(),
  }
})

const requestCancellationServiceMock = vi.mocked(
  ordersFeature.requestCancellationService
)

function mockRequireUserSuccess() {
  vi.mocked(global.fetch).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ id: 1, email: 'user@example.com' }),
  } as Response)
}

function createPostRequest(
  orderId: string,
  body?: unknown,
  options?: { skipCookie?: boolean; invalidJson?: boolean }
): NextRequest {
  const request = new NextRequest(
    `http://localhost:3000/api/orders/${orderId}/request-cancellation`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: options?.invalidJson
        ? 'not-valid-json{{{'
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }
  )
  if (!options?.skipCookie) {
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
  }
  return request
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/orders/[orderId]/request-cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Authentication', () => {
    it('should return 401 if no session cookie is provided', async () => {
      const request = createPostRequest('ORD-123', { reason: 'test' }, { skipCookie: true })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No tienes una sesión activa. Inicia sesión.')
      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })

    it('should return 401 if session cookie is invalid', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      const request = createPostRequest('ORD-123', { reason: 'test' })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Sesión expirada. Inicia sesión de nuevo.')
      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })
  })

  describe('Invalid body', () => {
    it('should return 400 with "Solicitud inválida." when JSON parse fails', async () => {
      mockRequireUserSuccess()
      const request = createPostRequest('ORD-123', undefined, { invalidJson: true })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Solicitud inválida.')
      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })
  })

  describe('Missing reason', () => {
    it('should return 400 with "Indícanos el motivo de la cancelación." when reason is missing', async () => {
      mockRequireUserSuccess()
      const request = createPostRequest('ORD-123', {})

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Indícanos el motivo de la cancelación.')
      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })

    it('should return 400 when reason is empty string', async () => {
      mockRequireUserSuccess()
      const request = createPostRequest('ORD-123', { reason: '' })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Indícanos el motivo de la cancelación.')
    })

    it('should return 400 when reason is only whitespace', async () => {
      mockRequireUserSuccess()
      const request = createPostRequest('ORD-123', { reason: '   ' })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Indícanos el motivo de la cancelación.')
    })

    it('should return 400 when reason is not a string (number)', async () => {
      mockRequireUserSuccess()
      const request = createPostRequest('ORD-123', { reason: 12345 })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Indícanos el motivo de la cancelación.')
    })
  })

  describe('Reason too long (NEW 500-char cap)', () => {
    const REASON_TOO_LONG_MESSAGE =
      'El motivo de la cancelación no puede superar los 500 caracteres. Reduce el texto a 500 caracteres como máximo y vuelve a intentarlo para que podamos procesar tu solicitud.'

    it('should return 400 when reason is 501 characters', async () => {
      mockRequireUserSuccess()
      const request = createPostRequest('ORD-123', { reason: 'a'.repeat(501) })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe(REASON_TOO_LONG_MESSAGE)
      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
      expect(requestCancellationServiceMock).not.toHaveBeenCalled()
    })

    it('should return 400 when reason is 1000 characters', async () => {
      mockRequireUserSuccess()
      const request = createPostRequest('ORD-123', { reason: 'x'.repeat(1000) })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe(REASON_TOO_LONG_MESSAGE)
      expect(requestCancellationServiceMock).not.toHaveBeenCalled()
    })

    it('should accept reason at exactly 500 characters (boundary)', async () => {
      mockRequireUserSuccess()
      const reason500 = 'b'.repeat(500)
      requestCancellationServiceMock.mockResolvedValueOnce({
        data: { success: true, message: 'Solicitud de cancelación enviada correctamente' },
      })

      const request = createPostRequest('ORD-123', { reason: reason500 })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })

      expect(response.status).toBe(200)
      expect(requestCancellationServiceMock).toHaveBeenCalledWith(
        expect.objectContaining({ reason: reason500 })
      )
    })
  })

  describe('Service-delegated errors', () => {
    it('should return 404 when service returns "Pedido no encontrado" (IDOR)', async () => {
      mockRequireUserSuccess()
      requestCancellationServiceMock.mockResolvedValueOnce({
        error: NextResponse.json(
          { error: 'Pedido no encontrado' },
          { status: 404, headers: { 'X-Trace-Id': 'test-trace-id' } }
        ),
      })

      const request = createPostRequest('ORD-OTHER-USER', { reason: 'Ya no lo necesito' })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-OTHER-USER' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Pedido no encontrado')
      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })

    it('should return 400 when service returns non-cancellable status', async () => {
      mockRequireUserSuccess()
      requestCancellationServiceMock.mockResolvedValueOnce({
        error: NextResponse.json(
          { error: 'No se puede cancelar un pedido en estado: shipped' },
          { status: 400, headers: { 'X-Trace-Id': 'test-trace-id' } }
        ),
      })

      const request = createPostRequest('ORD-123', { reason: 'Cambio de opinión' })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No se puede cancelar un pedido en estado: shipped')
      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })

    it('should return 400 for double-click on cancellation_requested (KEPT)', async () => {
      mockRequireUserSuccess()
      requestCancellationServiceMock.mockResolvedValueOnce({
        error: NextResponse.json(
          { error: 'No se puede cancelar un pedido en estado: cancellation_requested' },
          { status: 400, headers: { 'X-Trace-Id': 'test-trace-id' } }
        ),
      })

      const request = createPostRequest('ORD-123', { reason: 'Segundo intento' })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No se puede cancelar un pedido en estado: cancellation_requested')
    })

    it('should return 502 when service returns "No pudimos enviar la solicitud. Inténtalo de nuevo."', async () => {
      mockRequireUserSuccess()
      requestCancellationServiceMock.mockResolvedValueOnce({
        error: NextResponse.json(
          { error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' },
          { status: 502, headers: { 'X-Trace-Id': 'test-trace-id' } }
        ),
      })

      const request = createPostRequest('ORD-123', { reason: 'Motivo válido' })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toBe('No pudimos enviar la solicitud. Inténtalo de nuevo.')
      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })
  })

  describe('Success', () => {
    it('should return 200 with success message when service succeeds', async () => {
      mockRequireUserSuccess()
      requestCancellationServiceMock.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Solicitud de cancelación enviada correctamente',
        },
      })

      const request = createPostRequest('ORD-123', { reason: 'Ya no lo necesito' })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Solicitud de cancelación enviada correctamente',
      })
      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })

    it('should pass correct params to requestCancellationService', async () => {
      mockRequireUserSuccess()
      requestCancellationServiceMock.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Solicitud de cancelación enviada correctamente',
        },
      })

      const request = createPostRequest('ORD-123', { reason: 'Motivo' })

      await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })

      expect(requestCancellationServiceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'ORD-123',
          reason: 'Motivo',
          traceId: expect.any(String),
          user: expect.objectContaining({ id: 1 }),
          jwtToken: expect.any(String),
        })
      )
    })
  })

  describe('Top-level 500 catch', () => {
    it('should return 500 with "Ocurrió un error inesperado. Inténtalo de nuevo." on unexpected error', async () => {
      mockRequireUserSuccess()
      requestCancellationServiceMock.mockRejectedValueOnce(
        new Error('Unexpected internal failure')
      )

      const request = createPostRequest('ORD-123', { reason: 'Motivo válido' })

      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Ocurrió un error inesperado. Inténtalo de nuevo.')
      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })
  })

  describe('X-Trace-Id on every response', () => {
    it('should include X-Trace-Id on 200 success', async () => {
      mockRequireUserSuccess()
      requestCancellationServiceMock.mockResolvedValueOnce({
        data: { success: true, message: 'Solicitud de cancelación enviada correctamente' },
      })

      const request = createPostRequest('ORD-123', { reason: 'Test' })
      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })

      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })

    it('should include X-Trace-Id on 400 missing reason', async () => {
      mockRequireUserSuccess()
      const request = createPostRequest('ORD-123', {})
      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })

      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })

    it('should include X-Trace-Id on 400 reason-too-long', async () => {
      mockRequireUserSuccess()
      const request = createPostRequest('ORD-123', { reason: 'z'.repeat(501) })
      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })

      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })

    it('should include X-Trace-Id on 404 IDOR', async () => {
      mockRequireUserSuccess()
      requestCancellationServiceMock.mockResolvedValueOnce({
        error: NextResponse.json(
          { error: 'Pedido no encontrado' },
          { status: 404, headers: { 'X-Trace-Id': 'test-trace-id' } }
        ),
      })

      const request = createPostRequest('ORD-123', { reason: 'Test' })
      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })

      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })

    it('should include X-Trace-Id on 502', async () => {
      mockRequireUserSuccess()
      requestCancellationServiceMock.mockResolvedValueOnce({
        error: NextResponse.json(
          { error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' },
          { status: 502, headers: { 'X-Trace-Id': 'test-trace-id' } }
        ),
      })

      const request = createPostRequest('ORD-123', { reason: 'Test' })
      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })

      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })

    it('should include X-Trace-Id on 500', async () => {
      mockRequireUserSuccess()
      requestCancellationServiceMock.mockRejectedValueOnce(new Error('boom'))

      const request = createPostRequest('ORD-123', { reason: 'Test' })
      const response = await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })

      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
    })
  })

  describe('No global.fetch for service calls', () => {
    it('should NOT call global.fetch for order lookup/update (only for requireUser)', async () => {
      mockRequireUserSuccess()
      requestCancellationServiceMock.mockResolvedValueOnce({
        data: { success: true, message: 'Solicitud de cancelación enviada correctamente' },
      })

      const request = createPostRequest('ORD-123', { reason: 'Motivo' })
      await POST(request, {
        params: Promise.resolve({ orderId: 'ORD-123' }),
      })

      expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/api/users/me')
    })
  })
})
