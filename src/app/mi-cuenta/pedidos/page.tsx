'use client'

import Breadcrumbs from '@/app/components/ui/Breadcrumbs'
import OrderHistory from '@/components/orders/OrderHistory'

export default function OrdersPage() {
  const breadcrumbs = [
    { name: 'Inicio', href: '/' },
    { name: 'Mi Cuenta', href: '/mi-cuenta' },
    { name: 'Mis Pedidos', href: '/mi-cuenta/pedidos' },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs breadcrumbs={breadcrumbs} />

      <div className="mt-6">
        <h1 className="text-3xl font-bold font-sans text-neutral-dark mb-6">
          Mis Pedidos
        </h1>

        <OrderHistory />
      </div>
    </div>
  )
}
