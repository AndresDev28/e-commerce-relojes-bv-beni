import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import Button from '@/app/components/ui/Button';
import Link from 'next/link';
import { Construction } from 'lucide-react';

export default function CheckoutPage() {
  const breadcrumbs = [
    { name: 'Inicio', href: '/' },
    { name: 'Cesta', href: '/carrito' },
    { name: 'Finalizar Compra', href: '/checkout' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs breadcrumbs={breadcrumbs} />
      <div className="text-center py-20">
        <Construction size={48} className="mx-auto text-primary mb-6" />
        <h1 className="text-3xl font-sans font-bold text-dark mb-2">
          Página en Construcción
        </h1>
        <p className="text-neutral-medium max-w-md mx-auto mb-8">
          Estamos trabajando para traerte una experiencia de pago segura y sencilla. ¡Esta sección estará disponible muy pronto!
        </p>
        <Link href="/tienda">
          <Button variant="primary">Volver a la Tienda</Button>
        </Link>
      </div>
    </div>
  );
}

