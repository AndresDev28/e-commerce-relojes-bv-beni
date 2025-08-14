// 'use client' // Necesario para hooks en páginas de next.js
import React from 'react'
import HeroSection from '@/app/components/HeroSection'
import CategoryGrid from '@/app/components/CategoryGrid'
import FeaturedProducts from '@/app/components/FeaturedProducts'
import TrustSection from '@/app/components/TrustSection'

// 1. Agregamos async
export default async function Home() {
  // 2. Lógica para obtener los datos
  let products = [] // Valor por defecto en caso de error
  try {
    // Popula la relación images y la relación category
    // Usamos la pública si existe (coincide con FeaturedProducts) y hacemos fallback a la privada
    const baseUrl =
      process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.STRAPI_API_URL
    if (!baseUrl) {
      throw new Error(
        'No se encontró la variable de entorno NEXT_PUBLIC_STRAPI_API_URL ni STRAPI_API_URL'
      )
    }

    // Construimos la URL de forma segura evitando dobles barras y errores de query
    const url = new URL('/api/products', baseUrl)
    // Strapi v4: usar populate=* para evitar 400 por sintaxis
    url.searchParams.set('populate', '*')

    const response = await fetch(url.toString(), { cache: 'no-store' }) // Datos frescos durante desarrollo
    if (!response.ok) {
      throw new Error(
        `Failed to fetch products (${response.status} ${response.statusText}) -> ${url.toString()}`
      )
    }
    const data = await response.json()
    products = data.data // Los productos están en la propiedad 'data'
  } catch (error) {
    console.error('Error fetching products:', error)
    // Dejamos a products como un array vacío para que la página no se rompa
  }

  return (
    <>
      <HeroSection />
      <CategoryGrid />
      {/* 3. Pasamos los productos reales como prop */}
      <FeaturedProducts products={products} />
      <TrustSection />
    </>
  )
}

// *   **Añadido extra:**  `{ cache: 'no-store' }` al `fetch`. Esto es muy útil durante el desarrollo para decirle a Next.js: "No guardes en caché el resultado de esta llamada a la API. Quiero ver los datos más frescos cada vez que recargo la página".
