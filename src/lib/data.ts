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
];

export const featureProducts = [
  {
    id: '1',
    name: 'Casio G-Shock GM-2100',
    price: 199.99,
    imageUrl: '/images/products/gshok/gm2100.avif', 
    href: '/tienda/casio-g-shock-gm-2100',
  },
  {
    id: '2',
    name: 'Casio Vintage A168WEM-1EF',
    price: 59.90,
    imageUrl: '/images/products/vintage/a168.avif',
    href: '/tienda/casio-vintage-a168',
  },
  {
    id: '3',
    name: 'Casio Edifice EFS-S570DB-2AUEF',
    price: 279.00,
    imageUrl: '/images/products/edifice/efs-s570.avif',
    href: '/tienda/casio-edifice-efs-s570',
  },
  {
    id: '4',
    name: 'Casio G-Shock GA-2100 "CasiOak"',
    price: 99.00,
    imageUrl: '/images/products/gshok/ga21001a1.avif',
    href: '/tienda/casio-g-shock-ga2100',
  },
]

export default categories;