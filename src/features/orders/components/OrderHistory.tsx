/**
 * [ORD-03] OrderHistory Component
 *
 * Componente principal que muestra el historial de pedidos del usuario autenticado
 * con paginación, estados visuales y manejo de errores.
 *
 * RESPONSABILIDADES:
 * - Consumir el endpoint GET /api/orders
 * - Mostrar lista paginada de pedidos
 * - Manejar estados: loading, error, vacío, con datos
 * - Implementar navegación entre páginas
 * - Sincronizar página actual con URL (?page=N)
 */

'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useOrderHistory } from '@/features/orders/hooks/useOrderHistory'
import OrderCard from './OrderCard'

export default function OrderHistory() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentPage = Number(searchParams.get('page')) || 1
  const { orders, pagination, loading, error } = useOrderHistory(currentPage)

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
  if (loading) {
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
