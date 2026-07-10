'use client'

import { useState, useEffect, useCallback } from 'react'
import { newTraceId } from '@/lib/trace'
import type { OrderData } from '@/lib/api/orders'
import type { PaginationMeta } from '@/types'

interface UseOrderHistoryResult {
  orders: OrderData[]
  pagination: PaginationMeta | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface OrdersResponse {
  data: OrderData[]
  meta: {
    pagination: PaginationMeta
  }
}

export function useOrderHistory(page: number = 1): UseOrderHistoryResult {
  const [orders, setOrders] = useState<OrderData[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/orders?page=${page}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': newTraceId(),
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('Error al cargar los pedidos.')
      }

      const data: OrdersResponse = await response.json()
      setOrders(data.data)
      setPagination(data.meta.pagination)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar los pedidos.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return { orders, pagination, loading, error, refetch: fetchOrders }
}
