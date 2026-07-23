'use client'

import { use, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { OrderDetail, useOrderById } from '@/features/orders'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Button from '@/components/ui/Button'
import { buildBreadcrumbs } from '@/utils/breadcrumbs'

type PageState = 'loading' | 'error' | 'forbidden' | 'not-found' | 'success'

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const { order, loading, error } = useOrderById(orderId)
  const redirected = useRef(false)

  const forbiddenDetected = error === 'No tienes permiso para ver este pedido.'

  useEffect(() => {
    if (user === null) {
      router.push(`/login?redirect=/mi-cuenta/pedidos/${orderId}`)
      return
    }
  }, [user, router, orderId])

  useEffect(() => {
    if (forbiddenDetected && !redirected.current) {
      redirected.current = true
      const timer = setTimeout(() => {
        router.push('/mi-cuenta/pedidos?error=forbidden')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [forbiddenDetected, router])

  let pageState: PageState = 'loading'
  if (!loading) {
    if (forbiddenDetected) {
      pageState = 'forbidden'
    } else if (error === 'Pedido no encontrado.') {
      pageState = 'not-found'
    } else if (error) {
      pageState = 'error'
    } else if (order) {
      pageState = 'success'
    }
  }

  const breadcrumbs = buildBreadcrumbs({ route: 'pedido-detail', orderId })

  if (pageState === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs breadcrumbs={breadcrumbs} />
        <div className="mt-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-neutral font-serif">Cargando pedido...</p>
          </div>
        </div>
      </div>
    )
  }

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
            <p className="text-neutral font-serif mb-4">
              No tienes permiso para ver este pedido.
            </p>
            <p className="text-sm text-neutral font-serif">
              Redirigiendo a tus pedidos...
            </p>
          </div>
        </div>
      </div>
    )
  }

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
            <p className="text-neutral font-serif mb-4">
              El pedido no existe o fue eliminado.
            </p>
            <Button onClick={() => router.push('/mi-cuenta/pedidos')}>
              Ver Mis Pedidos
            </Button>
          </div>
        </div>
      </div>
    )
  }

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
            <p className="text-neutral font-serif mb-4">
              Error al cargar el pedido. Inténtalo de nuevo.
            </p>
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (pageState === 'success' && order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs breadcrumbs={breadcrumbs} />

        <div className="mt-6">
          <h1 className="text-3xl font-bold font-sans text-neutral-dark mb-6">
            Detalles del Pedido
          </h1>

          <OrderDetail order={order} />

          <div className="mt-6">
            <Button
              variant="outline"
              onClick={() => router.push('/mi-cuenta/pedidos')}
            >
              ← Volver a Mis Pedidos
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
