'use client'
import { createContext, useState, ReactNode, useContext, useEffect, useMemo, useRef } from 'react';
import { Product } from '@/types';
import { useAuth } from '@/context/AuthContext';

// Tipo para el Item del Carrito
export interface CartItem extends Product {
  quantity: number;
}

// Contrato principal del Contexto
interface CartContextType {
  cartItems: CartItem[]; // El estado: un array de nuestros items de carrito.
  isHydrated: boolean; // Flag para saber si se ha cargado localStorage
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
  clearCart: () => void;
}

// Plantilla del Contexto
export const CartContext = createContext<CartContextType | undefined>(undefined);

// Tipo de CartProvider
interface CartProviderProps {
  children: ReactNode;
}

// [BUG-CART-PERSISTENCE] Legacy global key — one-shot migration target.
const LEGACY_CART_STORAGE_KEY = 'bv-beni-cart';

// [BUG-CART-PERSISTENCE] Per-user key. Explicit String() coercion handles
// AuthUser.id (number) vs Product.id (string) type interaction.
function cartStorageKey(userId: number | null | undefined): string {
  return `bv-beni-cart-${String(userId ?? 'guest')}`;
}

// [BUG-CART-PERSISTENCE] Pure helper: per-product max-quantity, dedupe by id,
// sorted output for stable diffs. Tested in isolation.
export function mergeGuestCartInto(
  userCart: CartItem[],
  guestCart: CartItem[]
): CartItem[] {
  if (guestCart.length === 0) return userCart

  const byId = new Map<string, CartItem>()
  for (const item of userCart) {
    byId.set(item.id, item)
  }
  for (const guestItem of guestCart) {
    const existing = byId.get(guestItem.id)
    if (existing) {
      byId.set(guestItem.id, {
        ...existing,
        quantity: Math.max(existing.quantity, guestItem.quantity),
      })
    } else {
      byId.set(guestItem.id, guestItem)
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id))
}

// [BUG-CART-PERSISTENCE] One-shot legacy → per-user migration. Idempotent.
export function migrateLegacyKey(targetKey: string): void {
  if (typeof window === 'undefined') return

  const raw = localStorage.getItem(LEGACY_CART_STORAGE_KEY)
  if (raw === null || raw === '') return

  let legacyItems: CartItem[]
  try {
    const parsed = JSON.parse(raw)
    legacyItems = Array.isArray(parsed) ? (parsed as CartItem[]) : []
  } catch {
    localStorage.removeItem(LEGACY_CART_STORAGE_KEY)
    return
  }

  if (legacyItems.length === 0) {
    localStorage.removeItem(LEGACY_CART_STORAGE_KEY)
    return
  }

  let existing: CartItem[] = []
  const existingRaw = localStorage.getItem(targetKey)
  if (existingRaw) {
    try {
      const parsed = JSON.parse(existingRaw)
      existing = Array.isArray(parsed) ? (parsed as CartItem[]) : []
    } catch {
      existing = []
    }
  }

  const merged = mergeGuestCartInto(existing, legacyItems)
  localStorage.setItem(targetKey, JSON.stringify(merged))
  localStorage.removeItem(LEGACY_CART_STORAGE_KEY)
}

export const CartProvider = ({ children }: CartProviderProps) => {
  const { user } = useAuth()

  // [BUG-CART-PERSISTENCE] Per-user key — re-keyed on user.id change.
  const storageKey = useMemo(
    () => cartStorageKey(user?.id),
    [user?.id]
  )

  // [BUG-CART-PERSISTENCE] Tracks previous user id for guest→user merge detection.
  const previousUserIdRef = useRef<number | null | undefined>(undefined)

  // 1. Creamos un estado usando 'useState' para guardar la lista de 'CartItem'.
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  // [BUG-CART-PERSISTENCE] isHydrated cycles on user.id change for SSR safety.
  const [isHydrated, setIsHydrated] = useState(false);

  // [BUG-CART-PERSISTENCE] Re-hydrate on auth transitions + legacy migration + merge.
  useEffect(() => {
    if (typeof window === 'undefined') return

    migrateLegacyKey(storageKey)

    const previousUserId = previousUserIdRef.current
    const currentUserId = user?.id ?? null

    // Guest → authenticated transition: max-quantity merge, then clear guest.
    if (
      (previousUserId === null || previousUserId === undefined) &&
      currentUserId !== null
    ) {
      const guestKey = cartStorageKey(null)
      let guestItems: CartItem[] = []
      const guestRaw = localStorage.getItem(guestKey)
      if (guestRaw) {
        try {
          const parsed = JSON.parse(guestRaw)
          guestItems = Array.isArray(parsed) ? (parsed as CartItem[]) : []
        } catch {
          guestItems = []
        }
      }

      let userItems: CartItem[] = []
      const userRaw = localStorage.getItem(storageKey)
      if (userRaw) {
        try {
          const parsed = JSON.parse(userRaw)
          userItems = Array.isArray(parsed) ? (parsed as CartItem[]) : []
        } catch {
          userItems = []
        }
      }

      const merged = mergeGuestCartInto(userItems, guestItems)
      if (merged.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(merged))
      } else {
        localStorage.removeItem(storageKey)
      }
      localStorage.removeItem(guestKey)

      setCartItems(merged)
      previousUserIdRef.current = currentUserId
      setIsHydrated(true)
      return
    }

    // Standard re-hydration path
    const storedCart = localStorage.getItem(storageKey)
    if (storedCart) {
      try {
        const parsed = JSON.parse(storedCart)
        setCartItems(Array.isArray(parsed) ? (parsed as CartItem[]) : [])
      } catch (error) {
        console.error("Failed to parse cart from localStorage", error)
        setCartItems([])
      }
    } else {
      setCartItems([])
    }
    previousUserIdRef.current = currentUserId
    setIsHydrated(true)
  }, [storageKey, user?.id])

  // [BUG-CART-PERSISTENCE] Empty cart removes the key to keep storage tidy.
  useEffect(() => {
    if (!isHydrated) return
    if (cartItems.length === 0) {
      localStorage.removeItem(storageKey)
    } else {
      localStorage.setItem(storageKey, JSON.stringify(cartItems))
    }
  }, [cartItems, isHydrated, storageKey]);

  const addToCart = (product: Product, quantity: number) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);

      if (existingItem) {
        // [AND-99] Validar contra el stock disponible
        const newTotalQuantity = existingItem.quantity + quantity;
        const finalQuantity = Math.min(newTotalQuantity, product.stock);

        if (newTotalQuantity > product.stock) {
          console.warn(`[AND-99] No hay suficiente stock para ${product.name}. Limitando a ${product.stock}.`);
        }

        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: finalQuantity }
            : item
        );
      } else {
        // [AND-99] Asegurar que no agregamos más del stock inicial (aunque el botón lo bloquee)
        const finalQuantity = Math.min(quantity, product.stock);
        return [...prevItems, { ...product, quantity: finalQuantity }];
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
      if (newQuantity <= 0) {
        return prevItems.filter(item => item.id !== productId)
      }

      // Caso 2: Si la cantidad es mayor que 0, actualizamos el producto.
      return prevItems.map(item => {
        if (item.id === productId) {
          // [AND-99] Validar contra el stock del producto guardado en el item
          const finalQuantity = Math.min(newQuantity, item.stock);

          if (newQuantity > item.stock) {
            console.warn(`[AND-99] Cantidad solicitada supera stock (${item.stock}) para ${item.name}`);
          }

          return { ...item, quantity: finalQuantity }
        }
        return item;
      })
    })
  }

  const clearCart = () => {
    setCartItems([])
  }

  return (
    <CartContext.Provider value={{ cartItems, isHydrated, addToCart, removeFromCart, updateQuantity, clearCart }}>
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
