import React from 'react';
import Link from 'next/link';
import Button from './ui/Button';

const HeroSection = () => {
  return (
    <section className='relative h-[60vh] md:h-[80vh] w-full flex items-center justify-center text-center text-light'>
      {/* Imagen de fondo */}
      <div 
        className='absolute top-0 left-0 w-full h-full bg-cover bg-center z-0'
        style={{ backgroundImage: "url(/images/hero-gshok1.avif)"}}
        >
        {/* Overlay oscuro */}
        <div className='absolute top-0 left-0 w-full h-full bg-dark/60'></div>
      </div>
      {/* Contenido de Texto y CTA */}
      <div className='relative z-10 p-4 max-w-3xl opacity-0 animate-fade-in-up'>
        <h1 className='text-4xl md:text-5xl font-bold font-sans uppercase tracking-wider mb-4'>
          Precisión y Resistencia Legendarias
        </h1>
        <p className="text-lg md:text-xl font-serif mb-8">
          Descubre la colección que ha definido generaciones.
        </p>
        <Link href="/tienda">
          <Button variant='primary' className='text-lg py-3 px-6 hover:scale-105'>Explorar Tienda</Button>
        </Link>
      </div>
    </section>
  )
}

export default HeroSection