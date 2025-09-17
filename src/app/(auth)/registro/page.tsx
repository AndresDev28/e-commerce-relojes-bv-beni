import RegisterForm from '@/app/components/forms/RegisterForm'
import Breadcrumbs from '@/app/components/ui/Breadcrumbs'

export default function Registerpage() {
  const breadcrums = [
    { name: 'Inicio', href: '/' },
    { name: 'Registro', href: '/registro' },
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
              Crear cuenta
            </h1>
            <p className="mt-2 text-center text-neutral-light font-serif">
              Bienvenido!
            </p>
          </div>
          {/* Componente del formulario con la lógica */}
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
