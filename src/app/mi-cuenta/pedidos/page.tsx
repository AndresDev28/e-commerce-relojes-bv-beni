'use client'

import Breadcrumbs from '@/components/ui/Breadcrumbs'
import OrderHistory from '@/features/orders/components/OrderHistory'
import { buildBreadcrumbs } from '@/utils/breadcrumbs'

export default function OrdersPage() {
  const breadcrumbs = buildBreadcrumbs({ route: 'pedidos' })

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
