import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold mb-4">404 - Página no encontrada</h1>
      <Link href="/" className="text-blue-600 hover:underline">
        Volver al inicio
      </Link>
    </div>
  )
}
