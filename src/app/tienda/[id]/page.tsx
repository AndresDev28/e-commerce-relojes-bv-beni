import { notFound } from 'next/navigation'
import { featuredProducts } from '@/lib/data'
import ProductDetailClient from './ProductDetailClient'




export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Esperar que se resuelva la promesa
  const { id } = await params

  // 1. Encontrar el producto usando el 'id' de los params
  const product = featuredProducts.find(p => p.id === id)
  
  // 2. Si no se encuentra el producto, mostrar la página 404
  if (!product) {
    notFound();
  }

  // 3. Pasar datos al Client Component
  return (
    <ProductDetailClient product={product} />
  );
}
