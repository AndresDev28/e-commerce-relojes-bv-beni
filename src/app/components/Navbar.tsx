import Link from "next/link";
import Image from "next/image";
import Button from "./ui/Button";
import { Heart, ShoppingCart, User } from "lucide-react";

const Navbar = () => {
  return (
    <header className="bg-dark text-white shadow-md">
      <div className="container mx-auto flex items-center justify-between p-4">
        {/* Sección izquierda: Logo */}
        <div className="flex items-center">
          <Link href="/">
            <Image 
              src="/logo.png" 
              alt="Relojes BV Beni Logo"
              width={120}
              height={32}
              priority
            />
          </Link>
        </div>
        {/* Seccion central: Enlaces Navegación */}
        <nav className="hidden md:flex space-x-6">
          <Link href="/" className="font-sans hover:text-primaryBlue transition-colors">Inicio</Link>
          <Link href="/tienda" className="font-sans hover:text-primaryBlue transition-colors">Tienda</Link>
          <Link href="/contacto" className="font-sans hover:text-primaryBlue transition-colors">Contacto</Link>
        </nav>
        {/* Seccion derecha: Acciones */}
        <div className="flex items-center space-x-4">
          <Link href="/carrito" className="relative">
            <ShoppingCart className="h-6 w-6 hover:text-primaryBlue transition-colors"/>
            {/* Badge del contador hardcodeado de momento */}
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center bg-secondary text-xs text-light rounded-full">
              3
            </span>
          </Link>
          <Link href="/favorito">
            <Heart className="h-6 w-6 hover:text-primaryBlue transition-colors"/>
          </Link>
          {/* Registro e inicio de sesión */}
          <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-light">
            <Link href="/login">
              {/* Este botón parecería texto normal que cambia de color al hacer hover */}
              <Button variant="tertiary">Iniciar Sesión</Button>
            </Link>
            <Link href="/registro">
              {/* Y este sería el botón principal para llamar más la atención */}
              <Button variant="tertiary">Registrarse</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar