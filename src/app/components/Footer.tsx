import Link from 'next/link'
import Image from 'next/image'
import { SiFacebook, SiInstagram } from 'react-icons/si'
import { Heart } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="bg-dark text-light font-sans">
      <div className="container mx-auto px-4 py-12">
        {/* === Sección superior: Logo y enlaces === */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Columna 1: Logo y descripción */}
          <div className="md:col-span-1">
            <Link href="/" className="mb-4 inline-block">
              <Image
                src="/logo-no-bg.png"
                alt="Relojes BV Beni Logo"
                width={150}
                height={40}
              />
            </Link>
            <p className="text-neutral-medium text-sm italic">
              "Hay que saber la hora para controlar el tiempo"
            </p>
          </div>

          {/* Columna 2: Navegación */}
          <div>
            <h3 className="font-semibold text-light mb-4">Navegación</h3>
            <div className="flex flex-col space-y-2">
              <Link
                href="/tienda"
                className="text-neutral-medium hover:text-primary"
              >
                Tienda
              </Link>
              <Link
                href="/novedades"
                className="text-neutral-medium hover:text-primary"
              >
                Novedades
              </Link>
              <Link
                href="/marcas"
                className="text-neutral-medium hover:text-primary"
              >
                Marcas
              </Link>
              <Link
                href="/contacto"
                className="text-neutral-medium hover:text-primary"
              >
                Contacto
              </Link>
            </div>
          </div>

          {/* Columna 3: Legal */}
          <div>
            <h3 className="font-semibold text-light mb-4">Legal</h3>
            <div className="flex flex-col space-y-2">
              <Link
                href="/terminos-y-condiciones"
                className="text-neutral-medium hover:text-primary"
              >
                Términos y Condiciones
              </Link>
              <Link
                href="/politica-de-privacidad"
                className="text-neutral-medium hover:text-primary"
              >
                Política de Privacidad
              </Link>
              <Link
                href="/politica-de-cookies"
                className="text-neutral-medium hover:text-primary"
              >
                Política de Cookies
              </Link>
            </div>
          </div>

          {/* Columna 4: Redes Sociales */}
          <div>
            <h3 className="font-semibold text-light mb-4">Síguenos</h3>
            <div className="flex space-x-4">
              <Link
                href="https://www.facebook.com/RelojesBVBeni/?locale=es_ES"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-medium hover:text-primary"
              >
                <SiFacebook size={24} />
              </Link>
              <Link
                href="https://www.instagram.com/relojes_bv_beni/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-medium hover:text-primary"
              >
                <SiInstagram size={24} />
              </Link>
            </div>
          </div>
        </div>
        {/* ... (copywright) ... */}
        <div className="border-t border-neutral-dark mt-8 pt-8 flex flex-col items-center space-y-2">
          <p className="text-sm text-neutral-medium">
            © {new Date().getFullYear()} Relojes BV Beni. Todos los derechos
            reservados.
          </p>
          <p className="text-sm text-neutral-medium flex items-center gap-1">
            Hecho con{' '}
            <span>
              <Heart size={16} color="#DC2626" />
            </span>{' '}
            por
            <Link
              href="https://github.com/AndresDev28"
              className="ml-1 hover:text-primary"
            >
              AndresDev
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
