/**
 * Fuente única de la verdad: Si alguna vez hay que cambiar la estructura de un producto (agregar un campo brand),
 * solo hay que cambiarlo en este archivo, y TypeScript avisará en todos los demás sitios donde se use para que se hagan los cambios necesarios.
 *
 * Autocompletado y Seguridad: cada vez que trabajes con una variable de tipo Product, el editor de código sabrá exactamente qué propiedades tiene (product.name, product.price, etc).
 */

// --- TIPOS DE APLICACIÓN (Los que usan los componentes) ---
// La estructura base para un solo producto de la tienda
export interface Product {
  id: string // O number, pero string (UUID) es más robusto
  name: string
  price: number // Corregido el typo
  images: string[]
  href: string // La URL de la imagen principal
  description: string
  category?: string
  stock: number
}

// Representa un producto dentro del carrito de compras
// Para usarlo en CartContext
export interface CartItem extends Product {
  quantity: number // Agregamos la cantidad que el usuario ha seleccionado
}

// --- TIPOS DE API DE STRAPI (Describen los datos "crudos") ---

// Tipo para una sola imagen
export interface StrapiImage {
  id: number
  url: string
}

// Tipo para una sola categoría
export interface StrapiCategory {
  id: number
  name: string
  slug: string
}

// El tipo final para un producto completo que viene de la API
export interface StrapiProduct {
  id: number
  name: string
  price: number
  slug: string
  description: string | null
  stock: number
  image?: StrapiImage | StrapiImage[] // Puede ser único o arreglo
  images?: StrapiImage | StrapiImage[] // Alternativa si el campo es múltiple y se llama 'images'
  category?: StrapiCategory
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
