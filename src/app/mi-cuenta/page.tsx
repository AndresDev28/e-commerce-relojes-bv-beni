'use client'
import { useAuth } from '@/context/AuthContext'
import Button from '../components/ui/Button'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MyAccountPage() {
  // Obtenemos el usuario e isLoading
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()

  // Guardian de la ruta
  useEffect(() => {
    // Actúa solo si la carga inicial ha terminado
    if (!isLoading) {
      if (!user) {
        // Si no hay usuario redirigimos a login
        router.push('/login')
      }
    }
  }, [user, isLoading, router]) // El hook se ejecuta si una de estas dependencias cambian

  // Si el contexto esta cargando el usuario podemos mostrar un loader
  if (!user) {
    return <div>Cargando...</div>
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
