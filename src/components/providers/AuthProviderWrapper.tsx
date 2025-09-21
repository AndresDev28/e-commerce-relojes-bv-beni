'use client'

import { AuthProvider } from '@/context/AuthContext'
import { ReactNode } from 'react'

interface AuthProviderWrapperProps {
  children: ReactNode
}

/**
 * Wrapper para AuthProvider que maneja la hidratación del lado del cliente
 * Evita problemas de hidratación con localStorage y otros APIs del navegador
 */
export default function AuthProviderWrapper({
  children,
}: AuthProviderWrapperProps) {
  return <AuthProvider>{children}</AuthProvider>
}
