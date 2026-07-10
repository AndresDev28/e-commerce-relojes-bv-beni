'use client'
import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/features/cart'
import { newTraceId } from '@/lib/trace'

export interface AuthUser {
  id: number
  username: string
  email: string
}

export interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (identifier: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const router = useRouter()
  const { clearCart } = useCart()

  useEffect(() => {
    const hydrateSession = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'same-origin',
          headers: { 'X-Trace-Id': newTraceId() },
        })
        if (response.ok) {
          const data = await response.json()
          setUser(data.user ?? null)
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    hydrateSession()
  }, [])

  const login = async (identifier: string, password: string) => {
    setIsLoading(true)
    try {
      if (!identifier.trim() || !password) {
        throw new Error('Usuario y contraseña son obligatorios.')
      }
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': newTraceId(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ identifier, password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? 'No pudimos iniciar sesión. Inténtalo de nuevo.')
      }

      const data = await response.json()
      setUser(data.user)
      router.push('/mi-cuenta')
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    setIsLoading(true)
    try {
      if (!username.trim() || !email.trim() || !password) {
        throw new Error('Usuario, email y contraseña son obligatorios.')
      }
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': newTraceId(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ username, email, password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? 'No pudimos crear la cuenta. Inténtalo de nuevo.')
      }

      const data = await response.json()
      setUser(data.user)
      router.push('/mi-cuenta')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-Trace-Id': newTraceId() },
      })
    } catch {
    } finally {
      clearCart()
      setUser(null)
      setIsLoading(false)
      router.push('/')
    }
  }

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error(
      'useAuth debe ser usado dentro de un AuthProvider. ' +
      'Asegúrate de envolver tu aplicación con <AuthProvider>'
    )
  }

  return context
}