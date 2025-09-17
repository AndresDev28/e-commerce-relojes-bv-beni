// AppShell controla el layout global visible (Navbar/Footer) en función de la ruta actual.
// Es un componente cliente porque depende del hook usePathname, que sólo existe en el cliente.
'use client'
import { PropsWithChildren } from 'react'
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'

export default function AppShell({ children }: PropsWithChildren) {
  // usePathname devuelve la ruta actual del lado del cliente y se actualiza en navegación.
  const pathname = usePathname()

  // Definimos qué rutas pertenecen al "contexto de autenticación".
  // En estas rutas queremos un layout sin Navbar/Footer para centrar al usuario en la tarea.
  const isAuthRoute = pathname === '/login' || pathname === '/registro'

  // En rutas de auth delegamos completamente en el contenido específico de la página
  // (y en el layout de la carpeta (auth) si lo hay), sin envolver con Navbar/Footer.
  if (isAuthRoute) {
    return <>{children}</>
  }

  // En el resto de rutas mostramos el layout de la app con Navbar y Footer.
  // Mantener <main className="flex-grow"> preserva el alto completo de la página.
  return (
    <>
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </>
  )
}
