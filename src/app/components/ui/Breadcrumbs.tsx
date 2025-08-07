import Link from 'next/link';

// Definición del "contrato" de los datos que espera
interface Breadcrumb {
  name: string;
  href: string;
}

interface BreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
}

const Breadcrumbs = ({ breadcrumbs }: BreadcrumbsProps) => {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-2">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.href}>
            <div className="flex items-center text-sm">
              {index > 0 && (
                <span className="mx-2 text-neutral-medium">/</span>
              )}
              <Link
                href={crumb.href}
                className="font-serif text-neutral-medium hover:text-primary transition-colors"
              >
                {crumb.name}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;