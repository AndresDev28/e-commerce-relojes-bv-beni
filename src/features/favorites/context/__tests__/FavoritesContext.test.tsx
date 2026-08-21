import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import { FavoritesProvider, useFavorites } from '@/features/favorites'
import type { AuthUser } from '@/context/AuthContext'
import type { Product } from '@/types'
import type { FavoriteMutationResult } from '@/features/favorites/types'

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Test Watch',
  price: 99,
  images: ['/img/a.jpg'],
  href: '/tienda/prod-1',
  description: 'A nice watch',
  stock: 5,
}

const mockProduct2: Product = {
  id: 'prod-2',
  name: 'Test Watch 2',
  price: 199,
  images: ['/img/b.jpg'],
  href: '/tienda/prod-2',
  description: 'Another watch',
  stock: 3,
}

const authedUser: AuthUser = { id: 1, username: 'jane', email: 'jane@test.com' }

function AuthProbe({
  onReady,
}: {
  onReady: (ctx: ReturnType<typeof useFavorites>) => void
}) {
  const ctx = useFavorites()
  onReady(ctx)
  return null
}

function makeAuthMock(user: AuthUser | null) {
  // Return a dynamic mock that provides the desired user
  return {
    useAuth: () => ({ user, isLoading: false }),
    AuthContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
  }
}

// We mock the auth context to control user state
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/features/cart', () => ({
  useCart: () => ({ clearCart: vi.fn() }),
}))

describe('FavoritesContext', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── Anonymous path ──────────────────────────────────────────────

  describe('anonymous user', () => {
    beforeEach(async () => {
      const { useAuth } = await import('@/context/AuthContext')
      vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false } as any)
    })

    it('addToFavorites returns { ok: false, reason: "unauthenticated" } and does NOT call fetch', async () => {
      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => expect(captured).not.toBeNull())

      // Reset fetch mock after provider mount (which may call /api/auth/session)
      vi.mocked(global.fetch).mockClear()

      const result: FavoriteMutationResult =
        await captured!.addToFavorites(mockProduct)

      expect(result).toEqual({ ok: false, reason: 'unauthenticated' })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('removeFromFavorites returns { ok: false, reason: "unauthenticated" } and does NOT call fetch', async () => {
      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => expect(captured).not.toBeNull())
      vi.mocked(global.fetch).mockClear()

      const result: FavoriteMutationResult =
        await captured!.removeFromFavorites('prod-1')

      expect(result).toEqual({ ok: false, reason: 'unauthenticated' })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('clearFavorites returns { ok: false, reason: "unauthenticated" } and does NOT call fetch', async () => {
      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => expect(captured).not.toBeNull())
      vi.mocked(global.fetch).mockClear()

      const result: FavoriteMutationResult =
        await captured!.clearFavorites()

      expect(result).toEqual({ ok: false, reason: 'unauthenticated' })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('isFavorite returns false for any product ID', async () => {
      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => expect(captured).not.toBeNull())

      expect(captured!.isFavorite('prod-1')).toBe(false)
      expect(captured!.isFavorite('nonexistent')).toBe(false)
    })

    it('favorites list is empty', async () => {
      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => expect(captured).not.toBeNull())

      expect(captured!.favorites).toEqual([])
    })
  })

  // ─── Authenticated path ──────────────────────────────────────────

  describe('authenticated user', () => {
    beforeEach(async () => {
      const { useAuth } = await import('@/context/AuthContext')
      vi.mocked(useAuth).mockReturnValue({ user: authedUser, isLoading: false } as any)

      // Fetch favorites on mount → return empty list
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ favorites: [] }), { status: 200 }),
      )
    })

    it('addToFavorites adds a product and returns { ok: true }', async () => {
      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => {
        expect(captured).not.toBeNull()
        expect(captured!.isLoading).toBe(false)
      })

      // Mock the PUT response for add
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ favorites: ['prod-1'] }), { status: 200 }),
      )

      const result: FavoriteMutationResult =
        await captured!.addToFavorites(mockProduct)

      expect(result).toEqual({ ok: true })

      await waitFor(() => {
        expect(captured!.isFavorite('prod-1')).toBe(true)
        expect(captured!.favorites).toContainEqual(mockProduct)
      })

      // Verify PUT was called
      const putCall = vi.mocked(global.fetch).mock.calls.find(
        (c) => c[0] === '/api/favorites' && (c[1] as any)?.method === 'PUT',
      )
      expect(putCall).toBeDefined()
    })

    it('removeFromFavorites removes a product and returns { ok: true }', async () => {
      // Mount with a favorited product
      vi.mocked(global.fetch).mockReset()
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ favorites: [mockProduct] }), { status: 200 }),
      )

      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => {
        expect(captured).not.toBeNull()
        expect(captured!.isLoading).toBe(false)
        expect(captured!.isFavorite('prod-1')).toBe(true)
      })

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ favorites: [] }), { status: 200 }),
      )

      const result: FavoriteMutationResult =
        await captured!.removeFromFavorites('prod-1')

      expect(result).toEqual({ ok: true })

      await waitFor(() => {
        expect(captured!.isFavorite('prod-1')).toBe(false)
      })
    })

    it('addToFavorites is a no-op for an already favorited product and returns { ok: true }', async () => {
      vi.mocked(global.fetch).mockReset()
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ favorites: [mockProduct] }), { status: 200 }),
      )

      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => {
        expect(captured).not.toBeNull()
        expect(captured!.isLoading).toBe(false)
        expect(captured!.isFavorite('prod-1')).toBe(true)
      })

      // Clear mocks so we can detect if a PUT is made
      vi.mocked(global.fetch).mockClear()

      const result: FavoriteMutationResult =
        await captured!.addToFavorites(mockProduct)

      expect(result).toEqual({ ok: true })
      // No PUT should be made for a no-op add
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('removeFromFavorites is a no-op for a non-favorited product and returns { ok: true }', async () => {
      vi.mocked(global.fetch).mockReset()
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ favorites: [] }), { status: 200 }),
      )

      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => {
        expect(captured).not.toBeNull()
        expect(captured!.isLoading).toBe(false)
      })

      vi.mocked(global.fetch).mockClear()

      const result: FavoriteMutationResult =
        await captured!.removeFromFavorites('nonexistent')

      expect(result).toEqual({ ok: true })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('clearFavorites empties the list and returns { ok: true }', async () => {
      vi.mocked(global.fetch).mockReset()
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ favorites: [mockProduct, mockProduct2] }), {
          status: 200,
        }),
      )

      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => {
        expect(captured).not.toBeNull()
        expect(captured!.isLoading).toBe(false)
        expect(captured!.favorites).toHaveLength(2)
      })

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ favorites: [] }), { status: 200 }),
      )

      const result: FavoriteMutationResult = await captured!.clearFavorites()

      expect(result).toEqual({ ok: true })

      await waitFor(() => {
        expect(captured!.favorites).toEqual([])
      })
    })

    it('isFavorite matches a favorite persisted with a numeric source id, and addToFavorites for the catalog string id is a no-op', async () => {
      // Server-side favorite arrives as a raw Strapi object with numeric id.
      // After ingestion + normalization, isFavorite('42') must return true.
      vi.mocked(global.fetch).mockReset()
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            favorites: [
              {
                id: 42,
                documentId: 'p-42',
                name: 'Casio LA670WEA-1EF',
                price: 3990,
                stock: 5,
              },
            ],
          }),
          { status: 200 },
        ),
      )

      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => {
        expect(captured).not.toBeNull()
        expect(captured!.isLoading).toBe(false)
        expect(captured!.isFavorite('42')).toBe(true)
      })

      // Catalog exposes the same product as a string id — addToFavorites
      // must short-circuit because the favorite is already in state.
      vi.mocked(global.fetch).mockClear()

      const catalogProduct: Product = {
        id: '42',
        name: 'Casio LA670WEA-1EF',
        price: 3990,
        images: ['/img/casio.jpg'],
        href: '/tienda/casio-la670wea-1ef',
        description: 'Reloj Casio vintage',
        stock: 5,
      }

      const result: FavoriteMutationResult =
        await captured!.addToFavorites(catalogProduct)

      expect(result).toEqual({ ok: true })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('PUT body for an add on top of a numeric-source favorite contains only string ids', async () => {
      // Start with one favorite ingested from a numeric source id.
      vi.mocked(global.fetch).mockReset()
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            favorites: [
              {
                id: 42,
                documentId: 'p-42',
                name: 'Casio LA670WEA-1EF',
                price: 3990,
                stock: 5,
              },
            ],
          }),
          { status: 200 },
        ),
      )

      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => {
        expect(captured).not.toBeNull()
        expect(captured!.isLoading).toBe(false)
        expect(captured!.isFavorite('42')).toBe(true)
      })

      // Mock the PUT response for the upcoming add.
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ favorites: ['18', '42'] }), { status: 200 }),
      )

      const catalogProduct: Product = {
        id: '18',
        name: 'Casio LA670WEA-8AEF',
        price: 4590,
        images: ['/img/casio2.jpg'],
        href: '/tienda/casio-la670wea-8aef',
        description: 'Reloj Casio',
        stock: 3,
      }

      await captured!.addToFavorites(catalogProduct)

      // Capture the PUT body.
      const putCall = vi.mocked(global.fetch).mock.calls.find(
        (c) => c[0] === '/api/favorites' && (c[1] as any)?.method === 'PUT',
      )
      expect(putCall).toBeDefined()

      const body = JSON.parse((putCall![1] as any).body)
      expect(Array.isArray(body)).toBe(true)
      // CRITICAL: every entry must be a string (UXW-01 contract + 400 fix)
      expect(body.every((id: unknown) => typeof id === 'string')).toBe(true)
      expect(body).toContain('18')
      expect(body).toContain('42')
    })

    it('removeFromFavorites matches a numeric-source favorite by string id and PUTs the remainder', async () => {
      // Two favorites ingested from numeric source ids.
      vi.mocked(global.fetch).mockReset()
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            favorites: [
              {
                id: 42,
                documentId: 'p-42',
                name: 'Casio LA670WEA-1EF',
                price: 3990,
                stock: 5,
              },
              {
                id: 18,
                documentId: 'p-18',
                name: 'Casio LA670WEA-8AEF',
                price: 4590,
                stock: 3,
              },
            ],
          }),
          { status: 200 },
        ),
      )

      let captured: ReturnType<typeof useFavorites> | null = null

      render(
        <FavoritesProvider>
          <AuthProbe onReady={(ctx) => (captured = ctx)} />
        </FavoritesProvider>,
      )

      await waitFor(() => {
        expect(captured).not.toBeNull()
        expect(captured!.isLoading).toBe(false)
        expect(captured!.isFavorite('42')).toBe(true)
        expect(captured!.isFavorite('18')).toBe(true)
      })

      // Mock the PUT response for the upcoming remove.
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ favorites: ['18'] }), { status: 200 }),
      )

      const result: FavoriteMutationResult =
        await captured!.removeFromFavorites('42')

      expect(result).toEqual({ ok: true })

      // Capture the PUT body.
      const putCall = vi.mocked(global.fetch).mock.calls.find(
        (c) => c[0] === '/api/favorites' && (c[1] as any)?.method === 'PUT',
      )
      expect(putCall).toBeDefined()

      const body = JSON.parse((putCall![1] as any).body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.every((id: unknown) => typeof id === 'string')).toBe(true)
      expect(body).not.toContain('42')
      expect(body).toContain('18')
    })
  })
})
