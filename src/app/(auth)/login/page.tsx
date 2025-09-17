import LoginForm from '@/app/components/forms/LoginFrom'
import Breadcrumbs from '@/app/components/ui/Breadcrumbs'

export default function LoginPage() {
  const breadcrums = [
    { name: 'Inicio', href: '/' },
    { name: 'Login', href: '/login' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-dark text-light p-4">
      {/* Breadcrumbs */}
      <div className="container mx-auto p-4">
        <Breadcrumbs breadcrumbs={breadcrums} />
      </div>
      {/* Contenedor principal */}
      <div className="flex-grow flex items-center justify-center">
        {/* Sección te branding */}

        {/* Tarjeta de login */}
        <div className="w-full max-w-md p-8 space-y-4 bg-[#1C1C1E] rounded-lg shadow-lg">
          {/* Encabezado de la tarjeta */}
          <div>
            <h1 className="text-2xl font-bold text-center font-sans">
              Iniciar Sesión
            </h1>
            <p className="mt-2 text-center text-neutral-light font-serif">
              Bienvenido de nuevo. ¡Te echábamos de menos!
            </p>
          </div>
          {/* Componente del formulario con la lógica */}
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
