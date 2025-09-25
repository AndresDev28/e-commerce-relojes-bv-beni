'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Spinner from './ui/Spinner'

// Este componente recibe a sus "hijos" que es la página que queremos proteger
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Si la carga ha terminado y no hay usuario, redirigimos
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  // Mientras carga o no hay usuario, no mostramos nada, solo un loader
  if (isLoading || !user) {
    return <Spinner size="md" variant="primary" />
  }

  // Si todo está bien mostramos la página protegida
  return <>{children}</>
}
