'use client'
import { useState, FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'
import Input from '@/app/components/ui/Input'
import Button from '@/app/components/ui/Button'
import Spinner from '@/app/components/ui/Spinner'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react'

export default function RegisterForm() {
  // Conexión con el hook de autenticación para extraer lo necesario
  const { register, isLoading } = useAuth()

  // Estado para guardar el usuario nuevo desde el input nombre de usuario
  const [userName, setUserName] = useState('')

  // Estado para guardar el email nuevo desde el input de email
  const [email, setEmail] = useState('')

  // Estado para guardar contrasena
  const [password, setPassword] = useState('')

  // estado para mostrar contrasena
  const [showPassword, setShowPassword] = useState(false)

  // Estado para manejar los mensajes de eror
  const [error, setError] = useState('')

  // Función para manejar el envío del formulario del usuario
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Validación de campos rellenos
    if (!userName || !password || !email) {
      setError('Por favor, debe rellenar todos los campos')
      return
    }

    try {
      await register(userName, email, password)
    } catch (err) {
      setError('Mensaje genérico de error')
      console.error(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mostramos si hay errores */}
      {error && (
        <p className="text-sm text-red-500 text-center mb-4">{error}</p>
      )}
      {/* Primer campo: nombre de ususario */}
      <Input
        id="UserName"
        type="text"
        placeholder="Nombre de usuario"
        onChange={e => setUserName(e.target.value)}
        value={userName}
        required
        icon={<User size={18} className="text-neutral-medium" />}
      />
      {/* Segundo campo: email */}
      <Input
        id="Email"
        type="text"
        placeholder="Email"
        onChange={e => setEmail(e.target.value)}
        value={email}
        required
        icon={<Mail size={18} className="text-neutral-medium" />}
      />

      {/* Tercer campo: password */}
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

      {/* Botón de registro */}
      <Button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2"
        aria-busy={isLoading}
      >
        {isLoading && <Spinner size="sm" variant="white" />}
        <span>{isLoading ? 'Creando cuenta' : 'Crear cuenta'}</span>
      </Button>

      {/* Opción iniciar sesión */}
      <p className="text-sm text-center text-neutral-medium">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Inciar sesión
        </Link>
      </p>
    </form>
  )
}
