/**
 * [ORD-11] Order Detail Page - /mi-cuenta/pedidos/[orderId]
 *
 * Página dinámica que muestra los detalles completos de un pedido específico.
 *
 * RESPONSABILIDADES:
 * - Extraer orderId de los params de la URL
 * - Validar autenticación del usuario (redirigir a login si no autenticado)
 * - Llamar a GET /api/orders/:orderId con el JWT
 * - Manejar estados: loading, error 403 (forbidden), error 404 (not found)
 * - Mostrar breadcrumbs dinámicos con el número de pedido
 * - Meta tags SEO dinámicos
 * - Responsive design
 *
 * LEARNING: ¿Qué es una página dinámica en Next.js?
 * ==================================================
 *
 * Las páginas con [parametro] en el nombre son dinámicas.
 * Next.js las usa para crear rutas como:
 * - /mi-cuenta/pedidos/ORD-123 → params.orderId = "ORD-123"
 * - /mi-cuenta/pedidos/ORD-456 → params.orderId = "ORD-456"
 *
 * Una sola página maneja todas las variaciones del parámetro.
 *
 * FLOW DE SEGURIDAD:
 * 1. Usuario accede a /mi-cuenta/pedidos/ORD-123
 * 2. Verificamos si está autenticado (AuthContext)
 * 3. Si NO → Redirigir a /login
 * 4. Si SÍ → Llamar API con JWT
 * 5. API valida ownership (middleware de ORD-10)
 * 6. Si no es dueño → Error 403 → Redirigir a lista con mensaje
 * 7. Si es dueño → Mostrar detalles
 */

'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Head from 'next/head'
import { useAuth } from '@/context/AuthContext'
import Breadcrumbs from '@/app/components/ui/Breadcrumbs'
import OrderDetail from '@/components/orders/OrderDetail'
import type { OrderData } from '@/lib/api/orders'

/**
 * LEARNING: ¿Por qué necesitamos diferentes estados?
 * ===================================================
 *
 * En una aplicación real, las cosas toman tiempo (network requests).
 * Necesitamos mostrar feedback al usuario:
 *
 * - loading: "Cargando..." (mientras esperamos la respuesta del API)
 * - error: "No tienes permiso" o "Pedido no encontrado"
 * - success: Mostrar el componente OrderDetail con los datos
 *
 * Esto mejora la UX (User Experience) enormemente.
 */
type PageState = 'loading' | 'error' | 'forbidden' | 'not-found' | 'success'

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  // Unwrap params promise (Next.js 15 async params)
  const { orderId } = use(params)

  const router = useRouter()
  const { user, jwt } = useAuth()

  // Estado de la página
  const [pageState, setPageState] = useState<PageState>('loading')
  const [order, setOrder] = useState<OrderData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  /**
   * EFFECT: Protección de ruta y carga de datos
   *
   * LEARNING: ¿Por qué useEffect?
   * ==============================
   *
   * useEffect se ejecuta DESPUÉS del primer render.
   * Esto nos permite:
   * 1. Verificar autenticación (cliente-side)
   * 2. Hacer fetch de datos del API
   * 3. Actualizar el estado con los resultados
   *
   * Dependencies [user, jwt, orderId, router]:
   * - Si alguno cambia → volver a ejecutar
   * - Si user cambia de null a data → fetch data
   * - Si orderId cambia → fetch nuevo pedido
   */
  useEffect(() => {
    // 1. PROTECCIÓN DE RUTA: Verificar autenticación
    if (user === null) {
      // Usuario no autenticado → redirigir a login
      // LEARNING: Guardamos la URL actual para volver después del login
      router.push(`/login?redirect=/mi-cuenta/pedidos/${orderId}`)
      return
    }

    // Si aún no tenemos JWT, esperamos
    if (!jwt) {
      return
    }

    // 2. FETCH DE DATOS: Obtener detalles del pedido
    const fetchOrderDetails = async () => {
      try {
        setPageState('loading')

        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
        })

        // 3. MANEJO DE ERRORES HTTP

        if (response.status === 403) {
          // Usuario autenticado pero no es dueño del pedido
          // SECURITY: El middleware de ownership validation rechazó el acceso
          setPageState('forbidden')
          setErrorMessage('No tienes permiso para ver este pedido')

          // Redirigir a la lista después de 2 segundos
          setTimeout(() => {
            router.push('/mi-cuenta/pedidos?error=forbidden')
          }, 2000)
          return
        }

        if (response.status === 404) {
          // Pedido no existe
          setPageState('not-found')
          setErrorMessage('Pedido no encontrado')
          return
        }

        if (!response.ok) {
          // Otro error (500, etc.)
          throw new Error('Error al cargar el pedido')
        }

        // 4. ÉXITO: Parsear y guardar datos
        const data = await response.json()
        setOrder(data.data)
        setPageState('success')
      } catch (error) {
        console.error('Error fetching order:', error)
        setPageState('error')
        setErrorMessage('Error al cargar el pedido. Intenta de nuevo.')
      }
    }

    fetchOrderDetails()
  }, [user, jwt, orderId, router])

  /**
   * BREADCRUMBS DINÁMICOS
   *
   * LEARNING: ¿Por qué dinámicos?
   * ==============================
   *
   * El último breadcrumb muestra el número de pedido actual.
   * Esto ayuda al usuario a saber dónde está:
   *
   * Inicio > Mi Cuenta > Mis Pedidos > ORD-123
   *                                     ^^^^^^^^ Dinámico!
   */
  const breadcrumbs = [
    { name: 'Inicio', href: '/' },
    { name: 'Mi Cuenta', href: '/mi-cuenta' },
    { name: 'Mis Pedidos', href: '/mi-cuenta/pedidos' },
    { name: orderId, href: `/mi-cuenta/pedidos/${orderId}` },
  ]

  /**
   * RENDERIZADO CONDICIONAL
   *
   * LEARNING: ¿Por qué múltiples if con return anticipado?
   * =======================================================
   *
   * En React, cuando cada estado necesita renderizar un JSX completamente
   * diferente, usar múltiples `if` con `return` es más limpio que un `switch`:
   *
   * ✅ Ventajas:
   * - Cada estado es independiente y sale inmediatamente (early return)
   * - No necesitamos un gran bloque switch con breaks
   * - Más fácil de leer: cada if es una "página" diferente
   * - TypeScript infiere mejor los tipos
   *
   * Si solo cambiara una pequeña parte del JSX, usaríamos ternarios o switch.
   * Pero aquí, cada estado muestra una UI totalmente distinta.
   */

  // Estado: LOADING
  if (pageState === 'loading') {
    return (
      <>
        <Head>
          <title>Cargando... | Relojes BV Beni</title>
        </Head>
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs breadcrumbs={breadcrumbs} />
          <div className="mt-6 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-neutral font-serif">Cargando pedido...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Estado: FORBIDDEN (403)
  if (pageState === 'forbidden') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs breadcrumbs={breadcrumbs} />
        <div className="mt-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold font-sans text-neutral-dark mb-2">
              Acceso Denegado
            </h2>
            <p className="text-neutral font-serif mb-4">{errorMessage}</p>
            <p className="text-sm text-neutral font-serif">
              Redirigiendo a tus pedidos...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Estado: NOT FOUND (404)
  if (pageState === 'not-found') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs breadcrumbs={breadcrumbs} />
        <div className="mt-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold font-sans text-neutral-dark mb-2">
              Pedido No Encontrado
            </h2>
            <p className="text-neutral font-serif mb-4">{errorMessage}</p>
            <button
              onClick={() => router.push('/mi-cuenta/pedidos')}
              className="px-6 py-2 bg-primary text-white font-sans rounded-md hover:bg-primary-dark transition-colors"
            >
              Ver Mis Pedidos
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Estado: ERROR (genérico)
  if (pageState === 'error') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs breadcrumbs={breadcrumbs} />
        <div className="mt-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold font-sans text-neutral-dark mb-2">
              Error
            </h2>
            <p className="text-neutral font-serif mb-4">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-white font-sans rounded-md hover:bg-primary-dark transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Estado: SUCCESS
  if (pageState === 'success' && order) {
    return (
      <>
        <Head>
          <title>Pedido {orderId} | Relojes BV Beni</title>
          <meta
            name="description"
            content={`Detalles del pedido ${orderId} - Relojes BV Beni`}
          />
        </Head>
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs breadcrumbs={breadcrumbs} />

          <div className="mt-6">
            <h1 className="text-3xl font-bold font-sans text-neutral-dark mb-6">
              Detalles del Pedido
            </h1>

            <OrderDetail order={order} />

            {/* Botón para volver a la lista */}
            <div className="mt-6">
              <button
                onClick={() => router.push('/mi-cuenta/pedidos')}
                className="px-6 py-2 bg-neutral-light text-neutral-dark font-sans rounded-md hover:bg-neutral transition-colors"
              >
                ← Volver a Mis Pedidos
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Fallback (no debería llegar aquí)
  return null
}
