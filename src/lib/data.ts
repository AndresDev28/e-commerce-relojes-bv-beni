// Definimos las categorías, esto simula la futura base de datos
const categories = [
  {
    title: 'G-Shock',
    imageUrl: '/images/category-1.avif',
    href: '/tienda?categoria=g-shock',
  },
  {
    title: 'Vintage',
    imageUrl: '/images/category-2.avif',
    href: '/tienda?categoria=vintage',
  },
  {
    title: 'Edifice',
    imageUrl: '/images/category-3.avif',
    href: '/tienda?categoria=edifice',
  },
  {
    title: 'Clásicos',
    imageUrl: '/images/category-4.avif',
    href: '/tienda?categoria=clasicos',
  },
]

export const featuredProducts = [
  {
    id: 'casio-g-shock-gm-2100',
    name: 'Casio G-Shock GM-2100',
    price: 199.99,
    imageUrl: [
      '/images/products/gshock/gm2100/gm2100-1.avif',
      '/images/products/gshock/gm2100/gm2100-2.avif',
      '/images/products/gshock/gm2100/gm2100-3.avif',
      '/images/products/gshock/gm2100/gm2100-4.avif',
      '/images/products/gshock/gm2100/gm2100-5.avif',
    ],
    href: '/tienda/casio-g-shock-gm-2100',
  },
  {
    id: 'casio-vintage-A168WEM-1EF',
    name: 'Casio Vintage A168WEM-1EF',
    price: 59.9,
    imageUrl: [
      '/images/products/vintage/a168wem-1ef/a168wem.avif',
      '/images/products/vintage/a168wem-1ef/a168wem-2.avif',
      '/images/products/vintage/a168wem-1ef/a168-3.avif',
      '/images/products/vintage/a168wem-1ef/a168-4.avif',
      '/images/products/vintage/a168wem-1ef/a168-5.avif',
    ],
    href: '/tienda/casio-vintage-A168WEM-1EF',
  },
  {
    id: 'casio-edifice-EFS-S570DB-2AUEF',
    name: 'Casio Edifice EFS-S570DB-2AUEF',
    price: 279.0,
    imageUrl: [
      '/images/products/edifice/efss570/efs-s570.avif',
      '/images/products/edifice/efss570/efs-s570-2.avif',
      '/images/products/edifice/efss570/efs-s570-3.avif',
      '/images/products/edifice/efss570/efs-s570-4.avif',
      '/images/products/edifice/efss570/efs-s570-5.avif',
    ],
    href: '/tienda/casio-edifice-EFS-S570DB-2AUEF',
  },
  {
    id: 'casio-g-shock-ga-2100',
    name: 'Casio G-Shock GA-2100 "CasiOak"',
    price: 99.0,
    imageUrl: [
      '/images/products/gshock/ga2100/ga2100-1.avif',
      '/images/products/gshock/ga2100/ga2100-2.avif',
      '/images/products/gshock/ga2100/ga2100-3.avif',
      '/images/products/gshock/ga2100/ga2100-4.avif',
      '/images/products/gshock/ga2100/ga2100-5.avif',
    ],
    href: '/tienda/casio-g-shock-ga-2100',
  },
]

export default categories
