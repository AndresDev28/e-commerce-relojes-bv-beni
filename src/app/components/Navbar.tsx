import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex justify-end gap-4 p-4 bg-gray-100">
      <Link href="/" className="text-blue-600 hover:underline">Inicio</Link>
      <Link href="/products" className="text-blue-600 hover:underline">Productos</Link>
      <Link href="/shopCart" className="text-blue-600 hover:underline">Carrito</Link>
    </nav>
  )
}