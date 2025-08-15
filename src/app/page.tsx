// 'use client' // Necesario para hooks en páginas de next.js
import React from 'react'
import HeroSection from '@/app/components/HeroSection'
import CategoryGrid from '@/app/components/CategoryGrid'
import FeaturedProducts from '@/app/components/FeaturedProducts'
import TrustSection from '@/app/components/TrustSection'
import { getProducts } from '@/lib/api'

// 1. Agregamos async
export default async function Home() {
  const products = await getProducts()

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
