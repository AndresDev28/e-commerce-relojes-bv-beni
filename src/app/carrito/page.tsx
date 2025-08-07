'use client'
import { useCart } from '@/context/CartContext'
import Breadcrumbs from '@/app/components/ui/Breadcrumbs'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/app/components/ui/Button'
import CartItemRow from '@/app/components/ui/CartItemRow'


export default function CartPage() {
  // Extraemos de useCart lo que vamos a necesitar
  const { cartItems, clearCart} = useCart();
  const breadcrumbs = [
    { name: 'Inicio', href: '/' },
    { name: 'Carrito', href: '/carrito'}
  ]

  console.log('Items en el carrito:', cartItems);
  // --- Vista de Carrito Vacío ---
  if(cartItems.length === 0) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <Breadcrumbs breadcrumbs={breadcrumbs}/>

        <div className='text-center py-20'>
          <Image 
            src='/images/empty-cart.png'
            alt="Carrito de compra vacío"
            width={300}
            height={300}
            className='mx-auto mb-8'
          />
          <h1 className='text-3xl font-sans font-bold text-dark mb-2'>
            Tu cesta está vacía
          </h1>
          <p className="text-neutral-medium mb-8">
            Parece que aún no has añadido ningún reloj. <br/>
            Descubre nuestra colección de piezas únicas.
          </p>
          <Link href="/tienda">
            <Button variant="primary">Continuar Comprando</Button>
          </Link>
        </div>
      </div>
    )
  }

  // --- Vista de Carrito con Productos ---
  
  //  Cálculo del subtotal
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  return (
    <div className='bg-neutral-light'>
      <div className='container mx-auto px-4 py-8'>
        <Breadcrumbs breadcrumbs={breadcrumbs} />
        <h1 className='text-4xl font-sans font-bold text-dark my-8'>
          Cesta de la Compra
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
          
          {/* Columna Izquierda: Lista de items */}
          <div className='lg:col-span-2 bg-white p-6 rounded-lg shadow-md'>
            <div className='flex justify-between items-center border-b pb-4 mb-4'>
              <h2 className='text-xl font-semibold'>Tus Productos</h2>
              <button onClick={clearCart} className='text-sm text-neutral-medium hover:text-secondary transition-colors'>
                Vaciar Cesta
              </button>
            </div>

            <div>
              {cartItems.map(item => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Columna Derecha: Resumen del Pedido */}
          <div className='mt-8 lg:col-span-1 lg:mt-0'>
            <div className='bg-white p-6 rounded-lg shadow-md'>
              <h2 className='text-xl font-semibold border-b pb-4 mb-4'>Resumen del Pedido</h2>
              <div className='space-y-4'>
                <div className='flex justify-between'>
                  <span>Subtotal</span>
                  <span>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span>Gratis</span>
                </div>
                <div className="border-t pt-4 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(subtotal)}</span>
                </div>
              </div>
              
              <Button variant="secondary" className="w-full mt-6 py-3">
                Finalizar Compra
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
