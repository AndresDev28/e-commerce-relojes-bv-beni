'use client'
import { createContext, useState, useContext, ReactNode } from 'react'

/**
 * ===================================================
 * CONTEXTO DE AUTENTICACIÓN - RELOJES BV BENI
 * ===================================================
 *
 * Este archivo implementa un sistema de autenticación completo usando React Context API.
 * Proporciona estado global para la gestión de usuarios, tokens JWT y operaciones de auth.
 *
 * Arquitectura:
 * 1. Tipos/Interfaces: Definen la estructura de datos
 * 2. Contexto: Crea el contexto de React
 * 3. Provider: Componente que envuelve la app y maneja el estado
 * 4. Hook personalizado: Facilita el uso del contexto en componentes
 */

// ===================================================
// 1. DEFINICIÓN DE TIPOS (EL CONTRATO)
// ===================================================

/**
 * Interface que define la estructura de un usuario autenticado
 * Contiene la información básica del usuario que se almacena en el estado
 */
export interface AuthUser {
  id: number // ID único del usuario en la base de datos
  username: string // Nombre de usuario (puede ser email o username)
  email: string // Email del usuario
}

/**
 * Interface principal del contexto de autenticación
 * Define qué datos y funciones estará disponibles en toda la aplicación
 */
export interface AuthContexType {
  // Estado del usuario
  user: AuthUser | null // Usuario actual (null si no está autenticado)
  jwt: string | null // Token JWT para autenticación en API
  isLoading: boolean // Indica si hay una operación de auth en progreso

  // Funciones de autenticación
  login: (identifier: string, password: string) => Promise<void> // Iniciar sesión
  logout: () => void // Cerrar sesión
  register: (username: string, email: string, password: string) => Promise<void> // Registro
}

// ===================================================
// 2. CREACIÓN DEL CONTEXTO
// ===================================================

/**
 * Creación del contexto de React para autenticación
 * Inicializamos con 'undefined' para poder detectar si se usa fuera del Provider
 */
export const AuthContext = createContext<AuthContexType | undefined>(undefined)

// ===================================================
// 3. CREACIÓN DEL PROVIDER (EL CEREBRO)
// ===================================================

/**
 * Props del componente AuthProvider
 */
interface AuthProviderProps {
  children: ReactNode // Componentes hijos que tendrán acceso al contexto
}

/**
 * Componente Provider que envuelve toda la aplicación
 * Proporciona el estado de autenticación y las funciones a todos los componentes hijos
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  // ===================================================
  // ESTADOS DEL CONTEXTO
  // ===================================================

  /**
   * Estado del usuario autenticado
   * null = no autenticado, AuthUser = usuario logueado
   */
  const [user, setUser] = useState<AuthUser | null>(null)

  /**
   * Token JWT para autenticación en las llamadas a la API
   * Se almacena cuando el usuario inicia sesión exitosamente
   */
  const [jwt, setJwt] = useState<string | null>(null)

  /**
   * Estado de carga para operaciones asíncronas
   * true = operación en progreso, false = operación completada
   * Inicialmente false para no bloquear la UI; se activa al llamar login/register
   */
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // ===================================================
  // FUNCIONES DE AUTENTICACIÓN
  // ===================================================

  /**
   * Función para iniciar sesión de un usuario
   * @param identifier - Email o username del usuario
   * @param password - Contraseña del usuario
   */
  const login = async (identifier: string, password: string) => {
    setIsLoading(true)
    console.log('LOGIN: Intentando iniciar sesión con:', identifier)

    try {
      // TODO: Implementar llamada a la API
      // const response = await fetch('/api/auth/local', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ identifier, password })
      // })
      // const data = await response.json()
      //
      // if (response.ok) {
      //   setUser(data.user)
      //   setJwt(data.jwt)
      //   localStorage.setItem('jwt', data.jwt) // Persistir token
      // } else {
      //   throw new Error(data.error?.message || 'Error en el login')
      // }
    } catch (error) {
      console.error('Error en login:', error)
      // TODO: Manejar errores (mostrar toast, etc.)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Función para registrar un nuevo usuario
   * @param username - Nombre de usuario
   * @param email - Email del usuario
   * @param password - Contraseña del usuario
   */
  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    setIsLoading(true)
    console.log('REGISTER: Intentando registrar a:', username, email)

    try {
      // TODO: Implementar llamada a la API
      // const response = await fetch('/api/auth/local/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username, email, password })
      // })
      // const data = await response.json()
      //
      // if (response.ok) {
      //   setUser(data.user)
      //   setJwt(data.jwt)
      //   localStorage.setItem('jwt', data.jwt) // Persistir token
      // } else {
      //   throw new Error(data.error?.message || 'Error en el registro')
      // }
    } catch (error) {
      console.error('Error en registro:', error)
      // TODO: Manejar errores (mostrar toast, etc.)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Función para cerrar sesión del usuario
   * Limpia el estado local y el token almacenado
   */
  const logout = () => {
    console.log('LOGOUT: Cerrando sesión')

    // Limpiar estado local
    setUser(null)
    setJwt(null)

    // Limpiar token del localStorage
    localStorage.removeItem('jwt')

    // TODO: Opcionalmente, invalidar token en el servidor
  }

  // ===================================================
  // VALOR DEL CONTEXTO
  // ===================================================

  /**
   * Objeto que contiene todos los valores y funciones del contexto
   * Este es el valor que se proporcionará a todos los componentes hijos
   */
  const value = {
    user, // Estado del usuario
    jwt, // Token JWT
    isLoading, // Estado de carga
    login, // Función de login
    register, // Función de registro
    logout, // Función de logout
  }

  /**
   * Renderizado del Provider que envuelve toda la aplicación
   * Todos los componentes hijos tendrán acceso al contexto
   */
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ===================================================
// 4. HOOK PERSONALIZADO (EL CONECTOR)
// ===================================================

/**
 * Hook personalizado para usar el contexto de autenticación
 * Simplifica el uso del contexto en los componentes y proporciona
 * validación de que se está usando dentro del Provider
 *
 * @returns {AuthContexType} - El contexto de autenticación
 * @throws {Error} - Si se usa fuera del AuthProvider
 *
 * @example
 * ```tsx
 * function LoginComponent() {
 *   const { user, login, isLoading } = useAuth()
 *
 *   if (isLoading) return <div>Cargando...</div>
 *   if (user) return <div>Bienvenido {user.username}</div>
 *
 *   return <button onClick={() => login('user@email.com', 'password')}>
 *     Iniciar Sesión
 *   </button>
 * }
 * ```
 */
export const useAuth = () => {
  const context = useContext(AuthContext)

  // Validación de seguridad: asegurar que el hook se use dentro del Provider
  if (context === undefined) {
    throw new Error(
      'useAuth debe ser usado dentro de un AuthProvider. ' +
        'Asegúrate de envolver tu aplicación con <AuthProvider>'
    )
  }

  return context
}
