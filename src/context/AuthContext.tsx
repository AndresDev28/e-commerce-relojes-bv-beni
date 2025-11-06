'use client'
import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  API_URL,
  AUTH_LOGIN_ENDPOINT,
  AUTH_REGISTER_ENDPOINT,
} from '@/lib/constants'
import { useCart } from './CartContext'

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

  /**
   * Hook de navegación del App Router de Next.js
   *
   * Se utiliza para redirigir al usuario tras acciones de autenticación
   * (por ejemplo, después de un login exitoso o un logout), y para
   * navegar a páginas protegidas o públicas según corresponda.
   *
   * Nota: Este hook solo funciona en componentes del cliente, por eso
   * este contexto está marcado como 'use client'.
   */
  const router = useRouter()

  /**
   * Hook del contexto del carrito
   * Usado para limpiar el carrito cuando el usuario cierra sesión
   */
  const { clearCart } = useCart()

  // ===================================================
  // INICIALIZACIÓN DEL ESTADO DESDE LOCALSTORAGE
  // ===================================================

  /**
   * Efecto para inicializar el estado desde localStorage cuando el componente se monte
   * Solo se ejecuta en el cliente (navegador)
   */
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      // Iniciamos el proceso avisando que estamos cargando
      setIsLoading(true)
      const jwt = localStorage.getItem('jwt')

      // Si no hay token la decisión es instantánea para esperar mas tiempo del necesario
      if (!jwt) {
        setUser(null)
        setIsLoading(false) // Se resuleve el estado de carga
        return
      }

      // Si hay token, validamos con el servidor
      try {
        const response = await fetch(`${API_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        })

        if (response.ok) {
          const user = await response.json()
          setUser(user) // <-- ¡Hidratamos el estado con los datos del usuario!
          setJwt(jwt) // <-- Opcional: sincroniza el estado del JWT también
        } else {
          // El token es inválido, limpiamos todo
          setUser(null)
          setJwt(null)
          localStorage.removeItem('jwt')
        }
      } catch (error) {
        console.error('Error al validar sesión', error)
        // Si hay un error de red, asumimos que no hay sesión
        setUser(null)
        setJwt(null)
        localStorage.removeItem('jwt')
      } finally {
        // en cualquiera de los casos se resuelve el estado de carga
        setIsLoading(false)
      }
    }

    checkUserLoggedIn()
  }, []) // Solo se ejecuta una vez

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

    // URl absoluta
    const loginURl = `${API_URL}${AUTH_LOGIN_ENDPOINT}`

    try {
      // TODO: Implementar llamada a la API
      const response = await fetch(loginURl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const data = await response.json()

      if (response.ok) {
        console.log('Login exitoso:', data)
        router.push('/mi-cuenta') // Redirigimos a cuenta de usuario
        setUser(data.user)
        setJwt(data.jwt)
        localStorage.setItem('jwt', data.jwt) // Persistir token
      } else {
        throw new Error(data.error?.message || 'Error en el login')
      }
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
    console.log('REGISTER: Intentando registrar a:', username, email, password)

    // URL absoluta
    const registerUrl = `${API_URL}${AUTH_REGISTER_ENDPOINT}`

    try {
      // TODO: Implementar llamada a la API
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
      const data = await response.json()

      if (response.ok) {
        console.log(`Registro exitoso. Bienvenido ${username}!`, data)
        router.push('/mi-cuenta') // Redirigimos a cuenta de usuario
        setUser(data.user)
        setJwt(data.jwt)
        // Persistir token solo en el navegador
        if (typeof window !== 'undefined') {
          localStorage.setItem('jwt', data.jwt)
        }
      } else {
        throw new Error(data.error?.message || 'Error en el registro')
      }
    } catch (error) {
      console.error('Error en registro:', error)
      // TODO: Manejar errores (mostrar toast, etc.)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Función para cerrar sesión del usuario
   * Limpia el estado local, el token almacenado y el carrito
   */
  const logout = () => {
    // Limpiar el carrito antes de cerrar sesión
    clearCart()

    // Redirigimos al usuario a la página de inicio
    router.push('/')

    // Limpiar estado local
    setUser(null)
    setJwt(null)

    // Limpiar token del localStorage (solo en el navegador)
    if (typeof window !== 'undefined') {
      console.log('Logout exitoso de')
      localStorage.removeItem('jwt')
    }
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
