import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mis Pedidos | Relojes BV Beni',
  description: 'Consulta el historial de tus pedidos y seguimiento',
  robots: 'noindex, nofollow',
}

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
