'use client'
import { useState, FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'
import Input from '@/app/components/ui/Input'
import Button from '@/app/components/ui/Button'
import Spinner from '@/app/components/ui/Spinner'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
  // Conexión con el hook de autenticación y extraemos lo necesario
  const { login, isLoading } = useAuth()

  // Estado para guardar el input del usuario para email/usuario (Se inicia como string vacío)
  const [identifier, setIdentifier] = useState('')

  // Estado para guardar contrasena
  const [password, setPassword] = useState('')

  // estado para mostrar contrasena
  const [showPassword, setShowPassword] = useState(false)

  // Estado para manejar los mensajes de eror
  const [error, setError] = useState('')

  // Función para manejar el envío del formulario del usuario
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    // Limpia cualquier error anterior
    setError('')

    // Validación básica para comprobar si los campos están vacíos
    if (!identifier || !password) {
      setError('Por favor, rellene los campos.')
      return // Detiene la ejecución de la función
    }

    try {
      // Llama a la función login del contexto, pasándole los valores de los estados
      await login(identifier, password)
      // Si el login es exitoso, en el futuro aquí redirigiremos al usuario a "Mi Cuenta".
      // Por ahora, el 'AuthContext' se encargará de actualizar el estado.
    } catch (err) {
      setError('Las credenciales son incorrectas, inténtelo de nuevo')
      console.error(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mostramos si hay error en el estado con texto rojo */}
      {error && (
        <p className="text-sm text-red-500 text-center mb-4">{error}</p>
      )}
      {/* Div para primer campo (email/usuario) */}
      <div>
        {/* Agregamos componente Input */}
        <Input
          id="Identifier"
          type="text"
          placeholder="Correo electrónico"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          required
          icon={<Mail size={18} className="text-neutral-medium" />}
          autoComplete="username"
        />
      </div>
      {/* Div para campo de contraseña */}
      <div className="relative">
        <div>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            placeholder="Contraseña"
            onChange={e => setPassword(e.target.value)}
            required
            icon={<Lock size={18} className="text-neutral-medium" />}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-medium hover:text-light"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="text-right text-sm">
        <Link
          href="/recuperar-contrasena"
          className="font-medium text-primary hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {/* Componente Button para submit
      - type="submit" activa el 'onSubmit' del formulario.
      - disabled usa 'isLoading' para evitar múltiples envíos.
      - El texto cambia según el estado para dar feedback al usuario. */}
      <Button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2"
        aria-busy={isLoading}
      >
        {isLoading && <Spinner size="sm" variant="white" />}
        <span>{isLoading ? 'Iniciando sesión' : 'Iniciar sesión'}</span>
      </Button>

      {/* Opción crear cuenta */}
      <p className="text-sm text-center text-neutral-medium">
        ¿No tienes una cuenta?{' '}
        <Link
          href="/registro"
          className="font-medium text-primary hover:underline"
        >
          Regístrate
        </Link>
      </p>
    </form>
  )
}
