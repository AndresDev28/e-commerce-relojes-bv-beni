import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFavoriteAuthPrompt } from '@/features/favorites/hooks/useFavoriteAuthPrompt'
import type { Product } from '@/types'

const mockPush = vi.fn()
let mockPathname = '/tienda'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/features/favorites', () => ({
  useFavorites: vi.fn(),
}))

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Test Watch',
  price: 99,
  images: ['/img/a.jpg'],
  href: '/tienda/prod-1',
  description: 'A nice watch',
  stock: 5,
}

describe('useFavoriteAuthPrompt', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockPathname = '/tienda'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('anonymous user', () => {
    it('handleToggleFavorite sets showAuthPrompt to true when mutation returns ok:false', async () => {
      const { useAuth } = await import('@/context/AuthContext')
      vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false } as any)

      const { useFavorites } = await import('@/features/favorites')
      vi.mocked(useFavorites).mockReturnValue({
        addToFavorites: vi.fn().mockResolvedValue({ ok: false, reason: 'unauthenticated' }),
        removeFromFavorites: vi.fn().mockResolvedValue({ ok: false, reason: 'unauthenticated' }),
        isFavorite: () => false,
        favorites: [],
        isLoading: false,
        error: null,
        clearFavorites: vi.fn(),
      } as any)

      const { result } = renderHook(() => useFavoriteAuthPrompt())

      await act(async () => {
        await result.current.handleToggleFavorite(mockProduct)
      })

      expect(result.current.showAuthPrompt).toBe(true)
    })

    it('handleToggleFavorite only adds (does not remove) for anon user', async () => {
      const { useAuth } = await import('@/context/AuthContext')
      vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false } as any)

      const mockAddToFavorites = vi.fn().mockResolvedValue({ ok: false, reason: 'unauthenticated' as const })
      const mockRemoveFromFavorites = vi.fn()

      const { useFavorites } = await import('@/features/favorites')
      vi.mocked(useFavorites).mockReturnValue({
        addToFavorites: mockAddToFavorites,
        removeFromFavorites: mockRemoveFromFavorites,
        isFavorite: () => false,
        favorites: [],
        isLoading: false,
        error: null,
        clearFavorites: vi.fn(),
      } as any)

      const { result } = renderHook(() => useFavoriteAuthPrompt())

      await act(async () => {
        await result.current.handleToggleFavorite(mockProduct)
      })

      expect(mockAddToFavorites).toHaveBeenCalledWith(mockProduct)
      expect(mockRemoveFromFavorites).not.toHaveBeenCalled()
    })

    it('goToLogin navigates to /login?redirect= with encoded pathname', async () => {
      const { useAuth } = await import('@/context/AuthContext')
      vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false } as any)

      const { useFavorites } = await import('@/features/favorites')
      vi.mocked(useFavorites).mockReturnValue({
        addToFavorites: vi.fn(),
        removeFromFavorites: vi.fn(),
        isFavorite: () => false,
        favorites: [],
        isLoading: false,
        error: null,
        clearFavorites: vi.fn(),
      } as any)

      const { result } = renderHook(() => useFavoriteAuthPrompt())

      act(() => {
        result.current.goToLogin()
      })

      expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Ftienda')
    })

    it('goToLogin encodes detail page paths correctly', async () => {
      // Override pathname for this test (let binding updates the mock closure)
      mockPathname = '/tienda/reloj-elegante'

      const { useAuth } = await import('@/context/AuthContext')
      vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false } as any)

      const { useFavorites } = await import('@/features/favorites')
      vi.mocked(useFavorites).mockReturnValue({
        addToFavorites: vi.fn(),
        removeFromFavorites: vi.fn(),
        isFavorite: () => false,
        favorites: [],
        isLoading: false,
        error: null,
        clearFavorites: vi.fn(),
      } as any)

      const { result } = renderHook(() => useFavoriteAuthPrompt())

      act(() => {
        result.current.goToLogin()
      })

      expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Ftienda%2Freloj-elegante')
    })

    it('showAuthPrompt clears to false when user becomes non-null', async () => {
      const { useAuth } = await import('@/context/AuthContext')
      let user: any = null
      vi.mocked(useAuth).mockImplementation(() => ({ user, isLoading: false } as any))

      const { useFavorites } = await import('@/features/favorites')
      vi.mocked(useFavorites).mockReturnValue({
        addToFavorites: vi.fn().mockResolvedValue({ ok: false, reason: 'unauthenticated' }),
        removeFromFavorites: vi.fn(),
        isFavorite: () => false,
        favorites: [],
        isLoading: false,
        error: null,
        clearFavorites: vi.fn(),
      } as any)

      const { result, rerender } = renderHook(() => useFavoriteAuthPrompt())

      // Trigger the prompt
      await act(async () => {
        await result.current.handleToggleFavorite(mockProduct)
      })
      expect(result.current.showAuthPrompt).toBe(true)

      // Simulate user logging in
      user = { id: 1, username: 'jane', email: 'jane@test.com' }
      rerender()

      // After auth is available, prompt should be cleared
      expect(result.current.showAuthPrompt).toBe(false)
    })
  })

  describe('authenticated user', () => {
    it('handleToggleFavorite toggles normally without showing prompt', async () => {
      const { useAuth } = await import('@/context/AuthContext')
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 1, username: 'jane', email: 'jane@test.com' },
        isLoading: false,
      } as any)

      const mockAddToFavorites = vi.fn().mockResolvedValue({ ok: true })
      const mockRemoveFromFavorites = vi.fn().mockResolvedValue({ ok: true })

      const { useFavorites } = await import('@/features/favorites')
      vi.mocked(useFavorites).mockReturnValue({
        addToFavorites: mockAddToFavorites,
        removeFromFavorites: mockRemoveFromFavorites,
        isFavorite: () => false,
        favorites: [],
        isLoading: false,
        error: null,
        clearFavorites: vi.fn(),
      } as any)

      const { result } = renderHook(() => useFavoriteAuthPrompt())

      await act(async () => {
        await result.current.handleToggleFavorite(mockProduct)
      })

      expect(result.current.showAuthPrompt).toBe(false)
      expect(mockAddToFavorites).toHaveBeenCalledWith(mockProduct)
    })

    it('handleToggleFavorite removes when product is already favorited', async () => {
      const { useAuth } = await import('@/context/AuthContext')
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 1, username: 'jane', email: 'jane@test.com' },
        isLoading: false,
      } as any)

      const mockRemoveFromFavorites = vi.fn().mockResolvedValue({ ok: true })

      const { useFavorites } = await import('@/features/favorites')
      vi.mocked(useFavorites).mockReturnValue({
        addToFavorites: vi.fn(),
        removeFromFavorites: mockRemoveFromFavorites,
        isFavorite: () => true,
        favorites: [mockProduct],
        isLoading: false,
        error: null,
        clearFavorites: vi.fn(),
      } as any)

      const { result } = renderHook(() => useFavoriteAuthPrompt())

      await act(async () => {
        await result.current.handleToggleFavorite(mockProduct)
      })

      expect(mockRemoveFromFavorites).toHaveBeenCalledWith('prod-1')
      expect(result.current.showAuthPrompt).toBe(false)
    })
  })
})
