import Link from 'next/link'
import Image from 'next/image'

// Definimos las props que acetará el componente
interface CategoryCardProps {
  href: string;
  imageUrl: string;
  title: string;
}

const CategoryCard = ({ href, imageUrl, title }: CategoryCardProps) => {
  return (
    <Link href={href} className='group block overflow-hidden rounded-lg shadow-lg'>
      <div className='relative h-64'>
        {/* Usamos el componente Image de Next.js para la optimización */}
        <Image 
          src={imageUrl}
          alt={`Coleccion de ${title}`}
          fill // Hace que la imagen ocupe todo el espacio del contenedor padre
          style={{ objectFit: 'cover'}} // Asegura que la imagen cubra el espacio sin desformarse
          className='transition-transform duration-500 group-hover:scale-110 cursor-pointer' // Efecto zoom al hacer hover
        /> 
        {/* Agregamos Overlay para oscurecer un poco y que el texto resalte */}
        <div className='absolute inset-0 bg-dark/30 group-hover:bg-dark/50 transition-colors'></div>

        {/* Título de la categoría */}
        <div className='absolute inset-0 flex items-center justify-center'>
          <h3 className='text-2xl font-bold font-sans text-light uppercase tracking-wider'>
            {title}
          </h3>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
