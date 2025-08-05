'use client'
import { createContext, useState, ReactNode, useContext } from 'react';
import { Product } from '@/types';

// Tipo para el Item del Carrito
export interface CartItem extends Product {
  quantity: number;
}

// Contrato principal del Contexto
interface CartContextType {
  cartItems: CartItem[]; // El estado: un array de nuestros items de carrito.
  addToCart: (product: Product, quantity: number) => void; 
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
  clearCart: () => void
}

// Plantilla del Contexto
export const CartContext = createContext<CartContextType | undefined>(undefined);

// Tipo de CartProvider
interface CartProviderProps {
  children: ReactNode
}

export const CartProvider = ({children}: CartProviderProps) => {
  // 1. Creamos un estado usando 'useState' para guardar la lista de 'CartItem'.
  // Lo inicializamos como un array vacío.
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  // 2. Creamos la función 'addToCart'. Esta función:
  
  const addToCart = (product: Product, quantity: number) => {
    setCartItems(prevItems => {
      //  - Revisa si el producto ya está en el carrito.
      const existingItem = prevItems.find(item => item.id === product.id);

      if(existingItem) {
        // Si existe, actualizamos su cantidad
        return prevItems.map(item =>
          item.id === product.id ? {...item, quantity: item.quantity + quantity}
          : item
        );
      } else {
        // Si no existe, lo agregamos al array
        return [...prevItems, {...product, quantity}];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => {
      return prevItems.filter(item => item.id !== productId)
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    setCartItems(prevItems => {
      // Caso 1: Si la cantidad es 0 eliminamos el producto
      if(newQuantity <= 0) {
        return prevItems.filter(item => item.id !== productId)
      }
      // Caso 2: Si la cantidad es mayor que 0, actualizamos el producto.
      // Usamos .map() para crear un nuevo array.
      return prevItems.map(item => {
        // Si es el producto que buscamos
        if(item.id === productId) {
          // Lo devolvemos con la cantidad actualizada (un nuevo Objeto)
          return { ...item, quantity: newQuantity }
        }
        // Sino lo devolvemos sin cambios
        return item;
      })
    })
  }

  const clearCart = () => {
    setCartItems([])
  }

  return (
    <CartContext.Provider value={{cartItems, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext);
  // Añadimos una comprobación. Si el contexto es 'undefined', lanzaremos un error que nos diga exactamente qué ha pasado.
  if (context === undefined) {
    throw new Error('useCart debe ser usado dentro de un CartProvider')
  }

  return context // Devolvemos el objeto { cartItems, addToCart, ... }
}

