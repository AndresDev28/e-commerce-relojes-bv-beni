import Link from 'next/link';

interface Breadcrumb {
  name: string;
  href: string;
}

interface ShopLoopHeadProps {
  breadcrumbs: Breadcrumb[];
  totalResults: number;
  currentSort: string;
  onSortChange: (sortValue: string) => void;
}

const ShopLoopHead = ({ breadcrumbs, totalResults, currentSort, onSortChange }: ShopLoopHeadProps) => {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex justify-between'>
        <nav className='mb-4'>
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href}>
              <Link href={crumb.href} className='font-serif text-sm text-neutral-medium hover:text-primary transition-colors'>
                {crumb.name}
              </Link>
              {/* Agregamos la barra separadora si no es el último elemento */}
              {index < breadcrumbs.length - 1 && <span className="mx-2">/</span>}
            </span>
          ))}
        </nav>
        <div className='flex items-center gap-4'>
          <p className='font-serif text-sm text-neutral-medium'>
            Mostrando {totalResults} resultados
          </p>
          <select 
            value={currentSort}
            onChange={(e) => onSortChange(e.target.value)}
            className='border border-neutral-light rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
          >
            <option value='default'>Ordenar por</option>
            <option value='price-asc'>Precio: Ascendente</option>
            <option value='price-desc'>Precio: Descendente</option>
            <option value='name-asc'>Nombre: A-Z</option>
            <option value='name-desc'>Nombre: Z-A</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ShopLoopHead;