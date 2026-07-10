'use client'

import { useState, useEffect } from 'react'
import { newTraceId } from '@/lib/trace'
import type { OrderData } from '@/lib/api/orders'

interface UseOrderByIdResult {
  order: OrderData | null
  loading: boolean
  error: string | null
}

export function useOrderById(orderId: string): UseOrderByIdResult {
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      setError('ID de pedido no proporcionado.')
      return
    }

    let cancelled = false

    async function fetchOrder() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Trace-Id': newTraceId(),
          },
          credentials: 'same-origin',
        })

        if (response.status === 403) {
          if (!cancelled) {
            setError('No tienes permiso para ver este pedido.')
            setLoading(false)
          }
          return
        }

        if (response.status === 404) {
          if (!cancelled) {
            setError('Pedido no encontrado.')
            setLoading(false)
          }
          return
        }

        if (!response.ok) {
          throw new Error('Error al cargar el pedido')
        }

        const data = await response.json()
        if (!cancelled) {
          setOrder(data.data)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError('Error al cargar el pedido. Inténtalo de nuevo.')
          setLoading(false)
        }
      }
    }

    fetchOrder()

    return () => {
      cancelled = true
    }
  }, [orderId])

  return { order, loading, error }
}
