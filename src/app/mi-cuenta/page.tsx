'use client'
import { useAuth } from '@/context/AuthContext'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Link from 'next/link'

export default function MyAccountPage() {
  // Obtenemos el usuario e isLoading
  const { user, logout } = useAuth()

  // Si el contexto esta cargando el usuario podemos mostrar un loader
  if (!user) {
    return <Spinner />
  }

  return (
    <div style={{ padding: '40px' }}>
      <h1 className="text-2xl font-bold font-sans">Mi Cuenta</h1>
      <p className="text-neutral-dark font-serif">
        ¡Bienvenido, {user.username}!
      </p>
      <p className="text-neutral-dark font-serif">Email: {user.email}</p>

      {/* Enlace al historial de pedidos */}
      <div className="mt-6 mb-8">
        <Link href="/mi-cuenta/pedidos">
          <Button variant="primary" className="font-sans mr-4">
            Ver mis pedidos
          </Button>
        </Link>
      </div>

      <Button onClick={logout} variant="secondary" className="font-sans">
        Cerrar sesión
      </Button>
    </div>
  )
}
