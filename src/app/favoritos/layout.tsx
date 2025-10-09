import ProtectedRoute from '../components/ProtectedRoute'

export default function FavoritesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Protegemos toda la sección de favoritos
  return <ProtectedRoute>{children}</ProtectedRoute>
}
