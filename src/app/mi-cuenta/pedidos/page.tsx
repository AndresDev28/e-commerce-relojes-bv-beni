'use client'

import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { OrderHistory } from '@/features/orders'
import { buildBreadcrumbs } from '@/utils/breadcrumbs'

/**
 * @remarks
 * Route-level page component. Prop-less by design — derives all data from
 * hooks/contexts (e.g., useAuth, useCart) per the "pages own no props"
 * convention (DEBT-05 #8). Renders UI only; no business logic.
 */
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
