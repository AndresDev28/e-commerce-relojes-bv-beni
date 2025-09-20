// 'use client' // Necesario para hooks en páginas de next.js
export const dynamic = 'force-dynamic'
import React from 'react'
import HeroSection from '@/app/components/HeroSection'
import FeaturedProducts from '@/app/components/FeaturedProducts'
import TrustSection from '@/app/components/TrustSection'
import { getProducts, getCategories } from '@/lib/api'
import CategoryGrid from '@/app/components/CategoryGrid'

// 1. Agregamos async
export default async function Home() {
  const products = await getProducts()
  const categories = await getCategories()

  return (
    <>
      <HeroSection />
      <CategoryGrid categories={categories} />
      {/* 3. Pasamos los productos reales como prop */}
      <FeaturedProducts products={products} />
      <TrustSection />
    </>
  )
}

// *   **Añadido extra:**  `{ cache: 'no-store' }` al `fetch`. Esto es muy útil durante el desarrollo para decirle a Next.js: "No guardes en caché el resultado de esta llamada a la API. Quiero ver los datos más frescos cada vez que recargo la página".
