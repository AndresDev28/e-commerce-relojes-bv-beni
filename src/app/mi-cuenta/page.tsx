'use client'
import { useAuth } from '@/context/AuthContext'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

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

      {/* Aqui incluiremos historial de pedidos, etc */}

      <Button onClick={logout} variant="secondary" className="font-sans">
        Cerrar sesión
      </Button>
    </div>
  )
}
