/**
 * Tests para CartContext
 *
 * Este archivo testea la lógica de negocio del carrito de compras.
 * Aprendemos a:
 * - Testear React Contexts
 * - Testear hooks personalizados
 * - Usar renderHook y act()
 * - Manejar estado global
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, render, waitFor } from '@testing-library/react'
import { CartProvider, useCart } from '@/features/cart/context/CartContext'
import { Product } from '@/types'
import { AuthContext } from '@/context/AuthContext'
import type { AuthUser, AuthContextType } from '@/context/AuthContext'

// [BUG-CART-PERSISTENCE] Per-user persistence helpers — provide a real
// AuthContext value so user transitions are observable end-to-end.
const noopAsync = async () => {}
const authValue = (user: AuthUser | null): AuthContextType => ({
  user, isLoading: false, login: noopAsync, logout: noopAsync, register: noopAsync,
})
const WithAuth = ({ user, children }: { user: AuthUser | null; children: React.ReactNode }) => (
  <AuthContext.Provider value={authValue(user)}>{children}</AuthContext.Provider>
)
type CapturedCart = ReturnType<typeof useCart>
function CartProbe({ sink }: { sink: { current: CapturedCart | null } }) {
  sink.current = useCart()
  return null
}
function renderWithUser(user: AuthUser | null) {
  const sink: { current: CapturedCart | null } = { current: null }
  const utils = render(
    <WithAuth user={user}>
      <CartProvider><CartProbe sink={sink} /></CartProvider>
    </WithAuth>
  )
  return { sink, ...utils }
}
const authedUserA: AuthUser = { id: 1, username: 'alice', email: 'alice@test.com' }
const authedUserB: AuthUser = { id: 2, username: 'bob', email: 'bob@test.com' }

// ============================================
// MOCKS: Datos de prueba
// ============================================
// Creamos productos falsos para no depender de la API real
// Esto hace los tests más rápidos y predecibles

const mockProduct: Product = {
  id: '1',
  name: 'Casio G-Shock',
  price: 199.99,
  images: ['/image1.jpg'],
  href: '/tienda/1',
  description: 'Un reloj resistente',
  category: 'deportivo',
  stock: 10,
}

const mockProduct2: Product = {
  id: '2',
  name: 'Casio Vintage',
  price: 59.9,
  images: ['/image2.jpg'],
  href: '/tienda/2',
  description: 'Un reloj clásico',
  category: 'vintage',
  stock: 5,
}

const mockProduct3: Product = {
  id: '3',
  name: 'Casio Edifice',
  price: 279.9,
  images: ['/image3.jpg'],
  href: '/tienda/3',
  description: 'Un reloj fantástico',
  category: 'edifice',
  stock: 8,
}

// ============================================
// SUITE PRINCIPAL DE TESTS
// ============================================
describe('CartContext', () => {
  /**
   * Wrapper: Componente que envuelve nuestro hook con el Provider
   *
   * ¿Por qué necesitamos esto?
   * - useCart() solo funciona dentro de un CartProvider
   * - renderHook necesita saber cómo envolver el hook
   * - Este wrapper simula el Provider real de la app
   */
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WithAuth user={null}>
      <CartProvider>{children}</CartProvider>
    </WithAuth>
  )

  /**
   * beforeEach: Limpia localStorage antes de cada test
   *
   * CONCEPTO: Aislamiento de tests
   * Cada test debe ser independiente del anterior.
   * localStorage persiste entre renderizaciones, por lo que
   * debemos limpiarlo para evitar que el estado de un test
   * contamine al siguiente.
   */
  beforeEach(() => {
    localStorage.clear()
  })

  // ============================================
  // GRUPO 1: Estado Inicial
  // ============================================
  describe('Initial State', () => {
    /**
     * Test: El carrito debe empezar vacío
     *
     * Concepto: Estado inicial
     * Aprendes: Cómo verificar el estado por defecto de un context
     */
    it('should start with an empty cart', () => {
      // ARRANGE: Renderizamos el hook
      // renderHook devuelve un objeto con 'result' que contiene el valor del hook
      const { result } = renderHook(() => useCart(), { wrapper })

      // ASSERT: Verificamos que el array está vacío
      // toEqual([]) verifica que sea un array vacío
      expect(result.current.cartItems).toEqual([])
    })
  })

  // ============================================
  // GRUPO 2: Agregar al carrito
  // ============================================
  describe('addToCart', () => {
    /**
     * Test: Agregar un producto nuevo
     *
     * Concepto: Crear items en el estado
     * Aprendes: Cómo act() envuelve cambios de estado
     */
    it('should add a new product to the cart', () => {
      // ARRANGE: Preparamos el hook
      const { result } = renderHook(() => useCart(), { wrapper })

      // ACT: Ejecutamos la acción
      // act() es CRÍTICO: le dice a React "espera a que termine esta actualización"
      // Sin act(), el test fallaría porque React no terminaría de actualizar
      act(() => {
        result.current.addToCart(mockProduct, 1)
      })

      // ASSERT: Verificamos los resultados
      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0]).toEqual({
        ...mockProduct,
        quantity: 1,
      })
    })

    /**
     * Test: Sumar cantidad a producto existente
     *
     * Concepto: Lógica de negocio - no duplicar productos
     * Aprendes: Testear comportamiento complejo (if exists, update)
     */
    it('should add quantity to existing product in cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      // ACT: Agregamos el MISMO producto DOS veces
      // Primera vez: cantidad 2
      act(() => {
        result.current.addToCart(mockProduct, 2)
      })
      // Segunda vez: cantidad 3
      act(() => {
        result.current.addToCart(mockProduct, 3)
      })

      // ASSERT: Debería haber UN SOLO item con cantidad SUMADA (2 + 3 = 5)
      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0].quantity).toBe(5)
    })

    /**
     * Test: Agregar múltiples productos diferentes
     *
     * Concepto: Manejar múltiples items en el estado
     * Aprendes: Verificar arrays con múltiples elementos
     */
    it('should add multiple different products', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      // ACT: Agregamos DOS productos DIFERENTES
      act(() => {
        result.current.addToCart(mockProduct, 1)
        result.current.addToCart(mockProduct2, 2)
      })

      // ASSERT: Deberían ser DOS items separados
      expect(result.current.cartItems).toHaveLength(2)
      expect(result.current.cartItems[0].id).toBe('1')
      expect(result.current.cartItems[1].id).toBe('2')
      expect(result.current.cartItems[1].quantity).toBe(2)
    })
  })

  // ============================================
  // GRUPO 3: Remover del carrito
  // ============================================
  describe('removeFromCart', () => {
    /**
     * Test: Eliminar un producto
     *
     * Concepto: Eliminar items del estado
     * Aprendes: Operaciones de filtrado en arrays
     */
    it('should remove a product from the cart', () => {
      // ARRANGE: Primero agregamos un producto
      const { result } = renderHook(() => useCart(), { wrapper })
      act(() => {
        result.current.addToCart(mockProduct, 1)
      })

      // ACT: Luego lo removemos
      act(() => {
        result.current.removeFromCart('1')
      })

      // ASSERT: El carrito debería estar vacío
      expect(result.current.cartItems).toHaveLength(0)
    })

    /**
     * Test: Remover solo el producto especificado
     *
     * Concepto: Operaciones selectivas
     * Aprendes: Verificar que otros items no se afectan
     */
    it('should only remove the specified product', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      act(() => {
        result.current.addToCart(mockProduct, 1)
        result.current.addToCart(mockProduct2, 1)
      })

      // ACT: Removemos SOLO el primero
      act(() => {
        result.current.removeFromCart('1')
      })

      // ASSERT: Solo debe quedar el segundo
      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0].id).toBe('2')
    })

    /**
     * Test: Intentar remover producto inexistente
     *
     * Concepto: Manejo de casos edge
     * Aprendes: El código debe ser robusto ante entradas inválidas
     */
    it('should do nothing if product does not exist', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      act(() => {
        result.current.addToCart(mockProduct, 1)
      })

      // ACT: Intentamos remover un ID que NO existe
      act(() => {
        result.current.removeFromCart('999')
      })

      // ASSERT: El carrito NO debería cambiar
      expect(result.current.cartItems).toHaveLength(1)
    })
  })

  // ============================================
  // GRUPO 4: Actualizar cantidad
  // ============================================
  describe('updateQuantity', () => {
    /**
     * beforeEach: Se ejecuta ANTES de cada test en este bloque
     *
     * Concepto: Setup común para múltiples tests
     * Útil cuando varios tests necesitan el mismo estado inicial
     * (Aquí está vacío pero puedes agregar setup común)
     */
    beforeEach(() => {
      // Aquí podrías inicializar estado común
    })

    /**
     * Test: Actualizar cantidad de un producto
     *
     * Concepto: Modificar valores en el estado
     * Aprendes: Operaciones de update en arrays
     */
    it('should update the quantity of a product', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      act(() => {
        result.current.addToCart(mockProduct, 1)
      })

      // ACT: Cambiamos la cantidad de 1 a 5
      act(() => {
        result.current.updateQuantity('1', 5)
      })

      // ASSERT: La cantidad debería ser 5
      expect(result.current.cartItems[0].quantity).toBe(5)
    })

    /**
     * Test: Cantidad 0 elimina el producto
     *
     * Concepto: Lógica de negocio - 0 items = remover
     * Aprendes: Testear reglas de negocio específicas
     */
    it('should remove product when quantity is 0', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      act(() => {
        result.current.addToCart(mockProduct, 3)
      })

      // ACT: Actualizamos cantidad a 0
      act(() => {
        result.current.updateQuantity('1', 0)
      })

      // ASSERT: El producto debería ELIMINARSE del carrito
      expect(result.current.cartItems).toHaveLength(0)
    })

    /**
     * Test: Cantidad negativa elimina el producto
     *
     * Concepto: Validación de entrada
     * Aprendes: Manejar valores inválidos
     */
    it('should remove product when quantity is negative', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      act(() => {
        result.current.addToCart(mockProduct, 3)
      })

      // ACT: Actualizamos a cantidad negativa (inválido)
      act(() => {
        result.current.updateQuantity('1', -5)
      })

      // ASSERT: Debería eliminarse
      expect(result.current.cartItems).toHaveLength(0)
    })

    /**
     * Test: Update no afecta otros productos
     *
     * Concepto: Inmutabilidad y aislamiento
     * Aprendes: Operaciones sobre UN item no deben afectar otros
     */
    it('should not affect other products when updating quantity', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      act(() => {
        result.current.addToCart(mockProduct, 2)
        result.current.addToCart(mockProduct2, 3)
      })

      // ACT: Actualizamos SOLO el primero
      act(() => {
        result.current.updateQuantity('1', 10)
      })

      // ASSERT: El primero cambió, el segundo NO
      expect(result.current.cartItems[0].quantity).toBe(10)
      expect(result.current.cartItems[1].quantity).toBe(3) // NO cambió
    })

    it('should not crash when updating non-existent product', () => {
      // ARRANGE: Agregamos 2 productos
      const { result } = renderHook(() => useCart(), { wrapper })
      act(() => {
        result.current.addToCart(mockProduct, 2)
        result.current.addToCart(mockProduct2, 4)
      })

      // ACT: Intentamos actualizar un producto que NO existe
      act(() => {
        result.current.updateQuantity('987', 7) // ID inexistente
      })

      // ASSERT:
      // 1. No debe lanzar error (si llegamos aquí, no crasheó ✅)
      // 2. El carrito debe mantener sus 2 items originales
      expect(result.current.cartItems).toHaveLength(2)
      // 3. Las cantidades originales no deben cambiar
      expect(result.current.cartItems[0].quantity).toBe(2)
      expect(result.current.cartItems[1].quantity).toBe(4)
      // 4. Los IDs deben seguir siendo los correctos (no se agregó el "987")
      expect(result.current.cartItems[0].id).toBe('1')
      expect(result.current.cartItems[1].id).toBe('2')
    })
  })

  // ============================================
  // GRUPO 5: Limpiar carrito
  // ============================================
  describe('clearCart', () => {
    /**
     * Test: Limpiar todos los items
     *
     * Concepto: Reset de estado
     * Aprendes: Operación destructiva sobre todo el estado
     */
    it('should clear all items from the cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      act(() => {
        result.current.addToCart(mockProduct, 2)
        result.current.addToCart(mockProduct2, 3)
      })

      // ACT: Limpiamos TODO
      act(() => {
        result.current.clearCart()
      })

      // ASSERT: Debe estar completamente vacío
      expect(result.current.cartItems).toHaveLength(0)
      expect(result.current.cartItems).toEqual([])
    })

    /**
     * Test: Clear en carrito ya vacío
     *
     * Concepto: Operación idempotente
     * Aprendes: La función debe funcionar aunque no haya nada que limpiar
     */
    it('should work on an already empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      // ACT: Limpiamos un carrito que YA está vacío
      act(() => {
        result.current.clearCart()
      })

      // ASSERT: Sigue vacío (no debe dar error)
      expect(result.current.cartItems).toEqual([])
    })
  })

  // ============================================
  // GRUPO 6: Casos Edge
  // ============================================
  describe('Edge Cases', () => {
    /**
     * Test: Agregar producto con cantidad 0
     *
     * Concepto: Entrada inválida
     * Aprendes: ¿Cómo debe comportarse el código con inputs extraños?
     */
    it('should handle adding product with quantity 0', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      // ACT: Agregamos con cantidad 0
      act(() => {
        result.current.addToCart(mockProduct, 0)
      })

      // ASSERT: Dependiendo de tu lógica de negocio:
      // - Podría NO agregarse (length 0)
      // - Podría agregarse con quantity 0
      // Ajusta según tu implementación
      expect(result.current.cartItems[0]?.quantity).toBe(0)
    })

    /**
     * Test: Múltiples operaciones encadenadas
     *
     * Concepto: Flujo complejo de usuario
     * Aprendes: El estado debe ser consistente tras múltiples cambios
     */
    it('should maintain cart state across multiple operations', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      // ACT: Serie compleja de operaciones
      act(() => {
        result.current.addToCart(mockProduct, 5) // Agregar producto 1
        result.current.addToCart(mockProduct2, 3) // Agregar producto 2
        result.current.updateQuantity('1', 10) // Actualizar producto 1
        result.current.removeFromCart('2') // Remover producto 2
      })

      // ASSERT: Solo debe quedar el producto 1 con cantidad 10
      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0].id).toBe('1')
      expect(result.current.cartItems[0].quantity).toBe(10)
    })
  })

  // ============================================
  // GRUPO 7: Valores Calculados
  // ============================================
  describe('Calculated Values', () => {
    /**
     * Test: Calcular total de items en el carrito
     *
     * Concepto: Valor derivado del estado
     * Aprendes: A veces necesitas calcular valores desde el estado
     */
    it('should calculate total items correctly', () => {
      // ARRANGE
      const { result } = renderHook(() => useCart(), { wrapper })

      // ACT: Agregamos 3 productos con diferentes cantidades
      act(() => {
        result.current.addToCart(mockProduct, 1) // 1 item
        result.current.addToCart(mockProduct2, 2) // 2 items
        result.current.addToCart(mockProduct3, 3) // 3 items
      })

      // ASSERT: Calcular el total de items (1 + 2 + 3 = 6)
      const totalItems = result.current.cartItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      )

      expect(result.current.cartItems).toHaveLength(3) // 3 productos diferentes
      expect(totalItems).toBe(6) // 6 items en total
    })
  })
})

/**
 * Per-user persistence test infrastructure for BUG-CART-PERSISTENCE.
 * Key convention: `bv-beni-cart-${String(userId ?? 'guest')}`.
 */

describe('CartContext — Per-User Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // Task 1.1 — RED: cart survives user null → 1 → null → 1 roundtrip
  it('persists cart across user null → 1 → null → 1 transitions', async () => {
    // Guest session — add an item
    const guest = renderWithUser(null)
    await waitFor(() => expect(guest.sink.current?.isHydrated).toBe(true))
    act(() => guest.sink.current!.addToCart(mockProduct, 2))

    // Per-user (guest) key holds the item — RED on current code (global key)
    const guestKey = `bv-beni-cart-guest`
    expect(localStorage.getItem(guestKey)).not.toBeNull()
    const guestStored = JSON.parse(localStorage.getItem(guestKey)!)
    expect(guestStored).toHaveLength(1)
    expect(guestStored[0].id).toBe('1')
    expect(guestStored[0].quantity).toBe(2)

    // "Login" as user 1 — guest→login merge happens (max-quantity dedupe by id).
    const user = renderWithUser(authedUserA)
    await waitFor(() => expect(user.sink.current?.isHydrated).toBe(true))
    expect(user.sink.current!.cartItems).toHaveLength(1)
    expect(user.sink.current!.cartItems[0].id).toBe('1')
    expect(user.sink.current!.cartItems[0].quantity).toBe(2)
    expect(localStorage.getItem(guestKey)).toBeNull()

    // User 1 adds a different item
    act(() => user.sink.current!.addToCart(mockProduct2, 1))

    // Per-user key for user 1 holds both items
    const userKey = `bv-beni-cart-${String(authedUserA.id)}`
    expect(localStorage.getItem(userKey)).not.toBeNull()
    const userStored = JSON.parse(localStorage.getItem(userKey)!)
    expect(userStored).toHaveLength(2)

    // "Logout" — render again as guest (user=null)
    const guestAgain = renderWithUser(null)
    await waitFor(() => expect(guestAgain.sink.current?.isHydrated).toBe(true))

    // User 1's per-user key STILL has the items — RED on current code (clearCart wipes)
    expect(localStorage.getItem(userKey)).not.toBeNull()
    expect(JSON.parse(localStorage.getItem(userKey)!)).toHaveLength(2)

    // "Re-login" as user 1 — items restored from per-user key
    const userAgain = renderWithUser(authedUserA)
    await waitFor(() => expect(userAgain.sink.current?.isHydrated).toBe(true))
    expect(userAgain.sink.current!.cartItems).toHaveLength(2)
    const ids = userAgain.sink.current!.cartItems.map((i) => i.id).sort()
    expect(ids).toEqual(['1', '2'])
  })

  // Task 1.2 — RED: no cross-user leak — User A items invisible to User B
  it('isolates carts between authenticated users on the same browser', async () => {
    // User A adds an item
    const userA = renderWithUser(authedUserA)
    await waitFor(() => expect(userA.sink.current?.isHydrated).toBe(true))
    act(() => userA.sink.current!.addToCart(mockProduct, 3))

    const keyA = `bv-beni-cart-${String(authedUserA.id)}`
    expect(JSON.parse(localStorage.getItem(keyA) ?? '[]')).toHaveLength(1)

    // "Login" as User B (different user on same browser)
    const userB = renderWithUser(authedUserB)
    await waitFor(() => expect(userB.sink.current?.isHydrated).toBe(true))

    // User B sees an EMPTY cart — RED on current code (sees User A's items via global key)
    expect(userB.sink.current!.cartItems).toEqual([])

    const keyB = `bv-beni-cart-${String(authedUserB.id)}`
    expect(keyA).not.toBe(keyB)
  })

  // Task 1.3 — RED: guest→login merge — max-quantity, dedupe by id, guest cleared
  it('merges guest cart into user cart on login with max-quantity per product id', async () => {
    // Pre-populate: guest has 1× mockProduct, user 1 has 3× mockProduct
    localStorage.setItem(
      `bv-beni-cart-guest`,
      JSON.stringify([{ ...mockProduct, quantity: 1 }])
    )
    localStorage.setItem(
      `bv-beni-cart-${String(authedUserA.id)}`,
      JSON.stringify([{ ...mockProduct, quantity: 3 }])
    )

    const user = renderWithUser(authedUserA)
    await waitFor(() => expect(user.sink.current?.isHydrated).toBe(true))

    // Merged cart has max(1, 3) = 3 of mockProduct
    expect(user.sink.current!.cartItems).toHaveLength(1)
    expect(user.sink.current!.cartItems[0].id).toBe('1')
    expect(user.sink.current!.cartItems[0].quantity).toBe(3)
    expect(localStorage.getItem(`bv-beni-cart-guest`)).toBeNull()

    // Different product present only in guest cart → merged in
    localStorage.setItem(
      `bv-beni-cart-guest`,
      JSON.stringify([{ ...mockProduct3, quantity: 2 }])
    )
    localStorage.setItem(
      `bv-beni-cart-${String(authedUserA.id)}`,
      JSON.stringify([{ ...mockProduct, quantity: 3 }])
    )
    const user2 = renderWithUser(authedUserA)
    await waitFor(() => expect(user2.sink.current?.isHydrated).toBe(true))
    expect(user2.sink.current!.cartItems).toHaveLength(2)
    const ids = user2.sink.current!.cartItems.map((i) => i.id).sort()
    expect(ids).toEqual(['1', '3'])
    expect(localStorage.getItem(`bv-beni-cart-guest`)).toBeNull()
  })

  // Task 1.4 — RED: legacy key `bv-beni-cart` migrated on first login; legacy removed
  it('migrates legacy key `bv-beni-cart` to per-user key on first login', async () => {
    localStorage.setItem(
      `bv-beni-cart`,
      JSON.stringify([
        { ...mockProduct, quantity: 2 },
        { ...mockProduct2, quantity: 1 },
        { ...mockProduct3, quantity: 4 },
      ])
    )

    const user = renderWithUser(authedUserA)
    await waitFor(() => expect(user.sink.current?.isHydrated).toBe(true))

    const userKey = `bv-beni-cart-${String(authedUserA.id)}`
    const migrated = JSON.parse(localStorage.getItem(userKey) ?? '[]')
    expect(migrated).toHaveLength(3)
    expect(migrated.map((i: { id: string }) => i.id).sort()).toEqual(['1', '2', '3'])
    // Legacy key is removed from storage — RED on current code (legacy untouched)
    expect(localStorage.getItem(`bv-beni-cart`)).toBeNull()
  })

  // Task 1.5 — GREEN-on-current-code (regression guard)
  it('does not throw and leaves per-user key unchanged when legacy key is absent', async () => {
    const user = renderWithUser(authedUserA)
    await waitFor(() => expect(user.sink.current?.isHydrated).toBe(true))

    const userKey = `bv-beni-cart-${String(authedUserA.id)}`
    expect(localStorage.getItem(userKey)).toBeNull()

    // Empty-string legacy value is also a defensive no-op
    localStorage.setItem(`bv-beni-cart`, '')
    const user2 = renderWithUser(authedUserA)
    await waitFor(() => expect(user2.sink.current?.isHydrated).toBe(true))
    expect(localStorage.getItem(userKey)).toBeNull()
  })

  // Task 1.6 — RED: hydration re-runs on user.id change; isHydrated cycles
  it('re-hydrates the cart when the authenticated user id changes', async () => {
    localStorage.setItem(
      `bv-beni-cart-${String(authedUserA.id)}`,
      JSON.stringify([{ ...mockProduct, quantity: 5 }])
    )

    const user = renderWithUser(authedUserA)
    await waitFor(() => expect(user.sink.current?.isHydrated).toBe(true))
    expect(user.sink.current!.cartItems).toHaveLength(1)
    expect(user.sink.current!.cartItems[0].quantity).toBe(5)

    // Switch to user 2 — re-hydrate from a different key
    const userB = renderWithUser(authedUserB)
    await waitFor(() => expect(userB.sink.current?.isHydrated).toBe(true))
    expect(userB.sink.current!.cartItems).toEqual([])
    expect(userB.sink.current!.isHydrated).toBe(true)

    // Switch back to user 1 — re-hydrate restores items
    const userAgain = renderWithUser(authedUserA)
    await waitFor(() => expect(userAgain.sink.current?.isHydrated).toBe(true))
    expect(userAgain.sink.current!.cartItems).toHaveLength(1)
    expect(userAgain.sink.current!.cartItems[0].quantity).toBe(5)
  })

  // Task 1.7 — GREEN-on-current-code (regression guard for useCreateOrder.ts:69)
  it('clears the cart when clearCart() is invoked (payment-success regression guard)', async () => {
    const user = renderWithUser(authedUserA)
    await waitFor(() => expect(user.sink.current?.isHydrated).toBe(true))

    act(() => user.sink.current!.addToCart(mockProduct, 2))
    act(() => user.sink.current!.addToCart(mockProduct2, 1))
    expect(user.sink.current!.cartItems).toHaveLength(2)

    // Simulate the useCreateOrder.ts:69 payment-success clearCart() call
    act(() => user.sink.current!.clearCart())

    expect(user.sink.current!.cartItems).toEqual([])
    const userKey = `bv-beni-cart-${String(authedUserA.id)}`
    const stored = JSON.parse(localStorage.getItem(userKey) ?? '[]')
    expect(stored).toEqual([])
  })
})
