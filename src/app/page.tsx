'use client' // Necesario para hooks en páginas de next.js
import React from 'react'
import HeroSection from '@/app/components/HeroSection'
import CategoryGrid from '@/app/components/CategoryGrid'
import FeaturedProducts from '@/app/components/FeaturedProducts'
import TrustSection from '@/app/components/TrustSection'

export default function Home() {
  return (
    <>
      <HeroSection />
      <CategoryGrid />
      <FeaturedProducts />
      <TrustSection />
    </>
  )
}
