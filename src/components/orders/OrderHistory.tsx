/**
 * [ORD-03] OrderHistory Component
 *
 * Componente principal que muestra el historial de pedidos del usuario autenticado
 * con paginación, estados visuales y manejo de errores.
 *
 * RESPONSABILIDADES:
 * - Consumir el endpoint GET /api/orders con JWT
 * - Mostrar lista paginada de pedidos (10 por página)
 * - Manejar estados: loading, error, vacío, con datos
 * - Implementar navegación entre páginas
 * - Sincronizar página actual con URL (?page=N)
 *
 * FLUJO:
 * 1. useEffect detecta cambio en currentPage o user.jwt
 * 2. Llama a /api/orders?page=N con Authorization header
 * 3. Actualiza estados (orders, pagination, loading, error)
 * 4. Renderiza estado apropiado según resultado
 */

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import type { OrderData } from '@/lib/api/orders'
import OrderCard from './OrderCard'

/**
 * Metadata de paginación retornada por el backend
 * Viene en la respuesta como meta.pagination
 */
interface PaginationMeta {
  page: number        // Página actual (1-indexed)
  pageSize: number    // Tamaño fijo: 10 órdenes
  pageCount: number   // Total de páginas disponibles
  total: number       // Total de órdenes en la BD
}

/**
 * Estructura de respuesta del endpoint GET /api/orders
 * Sigue el formato estándar de Strapi
 */
interface OrdersResponse {
  data: OrderData[]
  meta: {
    pagination: PaginationMeta
  }
}

export default function OrderHistory() {
  // Hook para obtener usuario autenticado (necesitamos su JWT)
  const { user } = useAuth()

  // Hooks de Next.js para manejo de URL y navegación
  const searchParams = useSearchParams()  // Leer query params (?page=2)
  const router = useRouter()              // Navegar programáticamente
  const pathname = usePathname()          // URL actual sin query params

  // Estados del componente
  const [orders, setOrders] = useState<OrderData[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extraer página actual de la URL, default = 1
  const currentPage = Number(searchParams.get('page')) || 1

  /**
   * Effect principal: Cargar pedidos cuando cambia la página o el usuario
   *
   * DEPENDENCIAS:
   * - user?.jwt: Se ejecuta cuando el usuario se autentica
   * - currentPage: Se ejecuta cuando cambia la página en la URL
   *
   * EARLY RETURN:
   * Si no hay JWT, no hacemos nada (usuario no autenticado)
   */
  useEffect(() => {
    // Guard clause: No continuar si no hay usuario autenticado
    if (!user?.jwt) {
      return
    }

    /**
     * Función asíncrona para obtener pedidos del backend
     *
     * PROCESO:
     * 1. Activar loading, limpiar error previo
     * 2. Llamar GET /api/orders?page=N con JWT en header
     * 3. Si ok: actualizar orders y pagination
     * 4. Si error: mostrar mensaje al usuario
     * 5. Siempre: desactivar loading
     */
    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Construir URL con query param de página
        const url = `/api/orders?page=${currentPage}`

        // Fetch con autenticación JWT
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.jwt}`, // JWT requerido por el endpoint
          },
        })

        // Validar respuesta HTTP
        if (!response.ok) {
          throw new Error('Failed to fetch orders')
        }

        // Parsear JSON y actualizar estados
        const data: OrdersResponse = await response.json()
        setOrders(data.data)                    // Array de órdenes
        setPagination(data.meta.pagination)     // Metadata de paginación
      } catch (err) {
        console.error('Error fetching orders:', err)
        setError('Error al cargar los pedidos')
      } finally {
        // Siempre desactivar loading, incluso si hubo error
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [user?.jwt, currentPage])

  /**
   * Handler para cambiar de página
   *
   * PROCESO:
   * 1. Crear nuevo URLSearchParams con params actuales
   * 2. Actualizar parámetro 'page' con nuevo valor
   * 3. Navegar a nueva URL (esto dispara re-render y nuevo fetch)
   *
   * EJEMPLO:
   * /mi-cuenta/pedidos?page=1 → /mi-cuenta/pedidos?page=2
   */
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  /**
   * ESTADO 1: LOADING
   * Mostrar mientras se cargan los datos del backend
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-neutral-dark font-serif">Cargando pedidos...</p>
      </div>
    )
  }

  /**
   * ESTADO 2: ERROR
   * Mostrar si falló la llamada al API
   */
  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600 font-serif">{error}</p>
      </div>
    )
  }

  /**
   * ESTADO 3: VACÍO
   * Usuario autenticado pero sin pedidos realizados
   * Incluye CTA para ir a la tienda
   */
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-xl font-bold font-sans mb-4 text-neutral-dark">
          Aún no has realizado ningún pedido
        </h2>
        <p className="text-neutral-dark font-serif mb-6">
          Explora nuestros productos y realiza tu primera compra
        </p>
        <Link
          href="/tienda"
          className="px-6 py-3 bg-primary text-white font-sans rounded hover:bg-primary-dark transition-colors"
        >
          Explorar productos
        </Link>
      </div>
    )
  }

  /**
   * ESTADO 4: CON DATOS
   * Mostrar lista de pedidos con paginación opcional
   *
   * DECISIÓN: Solo mostrar controles de paginación si hay más de 1 página
   * (evita UI innecesaria con pocos pedidos)
   */
  const showPagination = pagination && pagination.pageCount > 1

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold font-sans mb-6 text-neutral-dark">
        Mis Pedidos
      </h2>

      {/* Lista de pedidos usando OrderCard */}
      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {/* Controles de paginación (solo si pageCount > 1) */}
      {showPagination && (
        <div className="flex items-center justify-center gap-4 mt-8">
          {/* Botón Anterior: deshabilitado en página 1 */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-neutral-light text-neutral-dark font-sans rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral enabled:hover:shadow-md transition-all"
          >
            Anterior
          </button>

          {/* Indicador de página actual */}
          <span className="text-neutral-dark font-serif">
            Página {currentPage} de {pagination.pageCount}
          </span>

          {/* Botón Siguiente: deshabilitado en última página */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.pageCount}
            className="px-4 py-2 bg-neutral-light text-neutral-dark font-sans rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral enabled:hover:shadow-md transition-all"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
