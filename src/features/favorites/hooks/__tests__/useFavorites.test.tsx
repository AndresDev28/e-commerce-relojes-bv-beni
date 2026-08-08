import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { FavoritesProvider, useFavorites } from '@/features/favorites'
import type { AuthUser } from '@/context/AuthContext'

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/features/cart', () => ({
  useCart: () => ({ clearCart: vi.fn() }),
}))

function FavoritesProbe({
  onReady,
}: {
  onReady: (ctx: ReturnType<typeof useFavorites>) => void
}) {
  const ctx = useFavorites()
  onReady(ctx)
  return null
}

describe('useFavorites', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when used outside FavoritesProvider', () => {
    // suppress expected error in console
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<FavoritesProbe onReady={() => {}} />)).toThrow(
      /FavoritesProvider/,
    )

    spy.mockRestore()
  })

  it('returns context with favorites array and mutation functions when inside provider', async () => {
    const { useAuth } = await import('@/context/AuthContext')
    vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false } as any)

    let captured: ReturnType<typeof useFavorites> | null = null

    render(
      <FavoritesProvider>
        <FavoritesProbe onReady={(ctx) => (captured = ctx)} />
      </FavoritesProvider>,
    )

    await waitFor(() => expect(captured).not.toBeNull())

    expect(captured!.favorites).toEqual([])
    expect(typeof captured!.addToFavorites).toBe('function')
    expect(typeof captured!.removeFromFavorites).toBe('function')
    expect(typeof captured!.isFavorite).toBe('function')
    expect(typeof captured!.clearFavorites).toBe('function')
    expect(captured!.isLoading).toBe(false)
    expect(captured!.error).toBeNull()
  })

  it('anonymous addToFavorites returns FavoriteMutationResult with ok:false', async () => {
    const { useAuth } = await import('@/context/AuthContext')
    vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false } as any)

    let captured: ReturnType<typeof useFavorites> | null = null

    render(
      <FavoritesProvider>
        <FavoritesProbe onReady={(ctx) => (captured = ctx)} />
      </FavoritesProvider>,
    )

    await waitFor(() => expect(captured).not.toBeNull())

    const result = await captured!.addToFavorites({
      id: 'p1',
      name: 'Test',
      price: 100,
      images: ['/a.jpg'],
      href: '/t/p1',
      description: '',
      stock: 1,
    })

    expect(result).toEqual({ ok: false, reason: 'unauthenticated' })
  })
})
