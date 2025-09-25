'use client'
import Link from 'next/link'
import Image from 'next/image'
import Button from './ui/Button'
import { Heart, ShoppingCart, User } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'

const Navbar = () => {
  const { cartItems } = useCart()
  const auth = useAuth()
  const totalItems = cartItems.reduce((acumulator, actualItem) => {
    return acumulator + actualItem.quantity
  }, 0)

  const { user } = useAuth()
  // Lógica para determinar el estado del icono User
  const userIconLink = user ? '/mi-cuenta' : '/login'

  // Las pruebas
  console.log('ESTADO DEL CARRITO:', cartItems)
  console.log('ESTADO DE AUTH:', auth)

  return (
    <header className="bg-dark text-white shadow-md">
      <div className="container mx-auto flex items-center justify-between p-4">
        {/* Sección izquierda: Logo */}
        <div className="flex items-center">
          <Link href="/">
            <Image
              src="/logo-no-bg.png"
              alt="Relojes BV Beni Logo"
              width={120}
              height={32}
              priority
            />
          </Link>
        </div>
        {/* Seccion central: Enlaces Navegación */}
        <nav className="hidden md:flex space-x-6">
          <Link
            href="/"
            className="font-sans hover:text-primary transition-colors text-xl"
          >
            Inicio
          </Link>
          <Link
            href="/tienda"
            className="font-sans hover:text-primary transition-colors text-xl"
          >
            Tienda
          </Link>
          <Link
            href="/contacto"
            className="font-sans hover:text-primary transition-colors text-xl"
          >
            Contacto
          </Link>
        </nav>
        {/* Seccion derecha: Acciones */}
        <div className="flex items-center space-x-4">
          {/* Carrito: Siempre visible */}
          <Link href="/carrito" className="relative">
            <ShoppingCart className="h-6 w-6 hover:text-primaryBlue transition-colors" />
            {/* Badge del contador, sólo se muestra cuando hay al menos un artículo en el carrito*/}
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center bg-secondary text-xs text-light rounded-full">
                {totalItems}
              </span>
            )}
          </Link>
          {/* Icono de Usuario Dinámico */}
          <Link href={userIconLink}>
            <User className="h-6 w-6 hover:text-primaryBlue transition-colors" />
          </Link>
          {/* Favorito: solo visible con usuario logado */}
          {auth.user && (
            <Link href="/favorito">
              <Heart className="h-6 w-6 hover:text-primaryBlue transition-colors" />
            </Link>
          )}
          {/* Lógica de renderizado condicional para autenticación */}
          <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-light">
            {auth.user ? ( // Si auth.user existe renderiza el primer bloque, sino el segundo
              // CASO 1: Si el usuario está logado
              <>
                <Link href="/mi-cuenta">
                  <Button variant="tertiary" className="font-sans">
                    Mi cuenta
                  </Button>
                </Link>
                {/* El logout es una acción, no un link, por eso es un botón con onClick */}
                <Button
                  onClick={auth.logout}
                  variant="secondary"
                  className="font-sans"
                >
                  Cerrar sesión
                </Button>
              </>
            ) : (
              // CASO 2: El usuario no está logado
              <>
                <Link href="/login">
                  {/* Este botón parecería texto normal que cambia de color al hacer hover */}
                  <Button variant="tertiary" className="font-sans">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/registro">
                  {/* Botón principal para llamar más la atención */}
                  <Button variant="tertiary" className="font-sans">
                    Registrarse
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
