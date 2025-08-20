import { notFound } from 'next/navigation'
import ProductDetailClient from './ProductDetailClient'
import { Product, StrapiImage } from '@/types'
import { getProductBySlug } from '@/lib/api'

export default async function ProductDetailPage({
  params,
}: {
  // En Next 15 'params' puede ser asíncrono. Evitamos el warning esperando el Promise
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // 1. Obtenemos los datos crudos
  const strapiProduct = await getProductBySlug(slug)

  // 2. Manejar el caso 404
  if (!strapiProduct) {
    notFound()
  }

  // 3. Transformamos los datos (normalización robusta, igual que en la lista)
  // Normalizamos relación de media: soportar 'image' o 'images' y que sea objeto o array
  const mediaData = strapiProduct.images ?? strapiProduct.image ?? null
  const imagesArray: StrapiImage[] = Array.isArray(mediaData)
    ? mediaData
    : mediaData
      ? [mediaData]
      : []

  const images = imagesArray.map(
    img => `${process.env.NEXT_PUBLIC_STRAPI_API_URL}${img.url}`
  )

  // Normalizamos categoría (puede venir como objeto o array)
  const category = Array.isArray(strapiProduct.category)
    ? strapiProduct.category[0]?.name
    : strapiProduct.category?.name

  const product: Product = {
    id: strapiProduct.id.toString(),
    name: strapiProduct.name || 'Sin nombre',
    price: strapiProduct.price || 0,
    images: images.length > 0 ? images : ['/images/empty-cart.png'],
    href: `/tienda/${strapiProduct.slug || 'producto-sin-slug'}`,
    description: strapiProduct.description || '',
    category,
    stock: strapiProduct.stock || 0,
  }
  // 4. Pasar datos  limpios al Client Component
  return <ProductDetailClient product={product} />
}
