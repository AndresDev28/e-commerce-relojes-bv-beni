'use client'// Necesario para hooks en páginas de next.js
import React from "react";
import Image from "next/image";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";
import Spinner from "@/app/components/ui/Spinner";
import Modal from "@/app/components/ui/Modal";
import HeroSection from '@/app/components/HeroSection'
import CategoryGrid from '@/app/components/CategoryGrid'
// import FeatureProducts from '@/app/components/FeatureProducts'
// import TrustSection from '@/app/components/TrustSection'

export default function Home() {
  
  return (
    <>
      <HeroSection />
      <CategoryGrid />
      {/* <FeatureProducts />
      <TrustSection /> */}
    </>
  );
}