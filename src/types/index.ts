/**
 * Fuente única de la verdad: Si alguna vez hay que cambiar la estructura de un producto (agregar un campo brand),
 * solo hay que cambiarlo en este archivo, y TypeScript avisará en todos los demás sitios donde se use para que se hagan los cambios necesarios.
 *
 * Autocompletado y Seguridad: cada vez que trabajes con una variable de tipo Product, el editor de código sabrá exactamente qué propiedades tiene (product.name, product.price, etc).
 */

// La estructura base para un solo producto de la tienda
export interface Product {
  id: string // O number, pero string (UUID) es más robusto
  name: string
  description: string
  price: number // Corregido el typo
  stock: number
  category: number
  imageUrl: string // La URL de la imagen principal
  images?: string[] // Un array opcional para galería de imágenes
}

// Representa un producto dentro del carrito de compras
export interface CartItem extends Product {
  quantity: number // Agregamos la cantidad que el usuario ha seleccionado
}

// La estructura para un usuario registrado
export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  // Omitimos la contraseña ya que nunca se debe exponer en el frontend!
}

// La estructura para un pedido completo
export interface Order {
  id: string
  user: User
  items: CartItem[]
  total: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered'
  createdAt: Date // Corregido el nombre a createdAt
}
