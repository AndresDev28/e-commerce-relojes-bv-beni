import Image from "next/image";
import Link from "next/link";
import Button from "./Button";

interface ProductCardProps {
  href: string;
  imageUrl: string;
  productName: string;
  price: number;
}

const ProductCard = ({ href, imageUrl, productName, price }: ProductCardProps) => {
  return (
    <Link href={href} className="group block border-neutral-dark/20 rounded-lg p-4 transition-shadow hover:shadow-xl">
      {/* Seccion de la imagen */}
      <div className="relative h-64 w-full mb-4">
        <Image
          src={imageUrl}
          alt={productName}
          fill
          style={{ objectFit: 'contain' }}
          className="group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Sección de Información */}
      <div className="flex flex-col">
        <h3 className="font-sans font-semibold text-lg text-dark truncate">{productName}</h3>
        <p className="font-serif text-lg text-primary mt-2">
          {new Intl.NumberFormat('es-ES', {style: 'currency', currency: 'EUR'}).format(price)}
        </p>
        <div className="mt-4">
          <Button variant="secondary" className="w-full">
            Ver Detalles
          </Button>
        </div>
      </div>
    </Link>
  )
}

export default ProductCard;