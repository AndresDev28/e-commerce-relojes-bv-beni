// en app/mi-cuenta/layout.tsx

import ProtectedRoute from '../components/ProtectedRoute'

export default function MyAccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Simplemente envolvemos los hijos de este layout con nuestro guardián
  return <ProtectedRoute>{children}</ProtectedRoute>
}
