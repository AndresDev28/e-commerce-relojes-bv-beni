import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/context/AuthContext'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/features/cart', () => ({
  useCart: () => ({ clearCart: vi.fn() }),
}))

function AuthProbe({ onReady }: { onReady: (ctx: ReturnType<typeof useAuth>) => void }) {
  const ctx = useAuth()
  onReady(ctx)
  return null
}

describe('AuthContext', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hydrates user from /api/auth/session on mount', async () => {
    const mockUser = { id: 1, username: 'jane', email: 'jane@test.com' }
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ user: mockUser }), { status: 200 })
    )

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthProbe onReady={(ctx) => (captured = ctx)} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(captured?.user).toEqual(mockUser)
      expect(captured?.isLoading).toBe(false)
    })

    const fetchCall = vi.mocked(global.fetch).mock.calls[0]
    expect(fetchCall[0]).toBe('/api/auth/session')
    expect(fetchCall[1]?.credentials).toBe('same-origin')
    expect((fetchCall[1]?.headers as Record<string, string>)['X-Trace-Id']).toBeTruthy()
  })

  it('sets user to null when session endpoint returns no user', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ user: null }), { status: 200 })
    )

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthProbe onReady={(ctx) => (captured = ctx)} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(captured?.user).toBeNull()
      expect(captured?.isLoading).toBe(false)
    })
  })

  it('sets user to null when fetch throws (network down)', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network'))

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthProbe onReady={(ctx) => (captured = ctx)} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(captured?.user).toBeNull()
      expect(captured?.isLoading).toBe(false)
    })
  })

  it('login() calls POST /api/auth/login and sets user on success', async () => {
    const mockUser = { id: 7, username: 'joe', email: 'joe@test.com' }
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: null }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: mockUser }), { status: 200 })
      )

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthProbe onReady={(ctx) => (captured = ctx)} />
      </AuthProvider>
    )

    await waitFor(() => expect(captured?.isLoading).toBe(false))

    await act(async () => {
      await captured!.login('joe@test.com', 'secret')
    })

    const calls = vi.mocked(global.fetch).mock.calls
    const loginCall = calls.find((c) => c[0] === '/api/auth/login')
    expect(loginCall).toBeDefined()
    expect(loginCall![1]?.method).toBe('POST')
    expect(loginCall![1]?.body).toBe(
      JSON.stringify({ identifier: 'joe@test.com', password: 'secret' })
    )
    expect(captured!.user).toEqual(mockUser)
  })

  it('login() throws validation error before any fetch when fields are empty', async () => {
    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthProbe onReady={(ctx) => (captured = ctx)} />
      </AuthProvider>
    )

    await waitFor(() => expect(captured?.isLoading).toBe(false))

    await expect(captured!.login('', '')).rejects.toThrow('obligatorios')
    expect(global.fetch).not.toHaveBeenCalledWith(
      '/api/auth/login',
      expect.anything()
    )
  })

  it('login() throws with the server-provided error message on 401', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: null }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Credenciales inválidas.' }), { status: 401 })
      )

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthProbe onReady={(ctx) => (captured = ctx)} />
      </AuthProvider>
    )

    await waitFor(() => expect(captured?.isLoading).toBe(false))

    await expect(captured!.login('a@b.com', 'x')).rejects.toThrow('Credenciales inválidas.')
  })

  it('logout() POSTs to /api/auth/logout and resets user to null', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: 1, username: 'u', email: 'e' } }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthProbe onReady={(ctx) => (captured = ctx)} />
      </AuthProvider>
    )

    await waitFor(() => expect(captured?.user).not.toBeNull())

    await act(async () => {
      await captured!.logout()
    })

    const logoutCall = vi.mocked(global.fetch).mock.calls.find(
      (c) => c[0] === '/api/auth/logout'
    )
    expect(logoutCall).toBeDefined()
    expect(logoutCall![1]?.method).toBe('POST')
    expect(captured!.user).toBeNull()
  })

  it('register() posts to /api/auth/register with credentials + X-Trace-Id', async () => {
    const mockUser = { id: 9, username: 'new', email: 'new@test.com' }
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: null }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: mockUser }), { status: 200 }))

    let captured: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthProbe onReady={(ctx) => (captured = ctx)} />
      </AuthProvider>
    )

    await waitFor(() => expect(captured?.isLoading).toBe(false))

    await act(async () => {
      await captured!.register('new', 'new@test.com', 'pass123')
    })

    const registerCall = vi.mocked(global.fetch).mock.calls.find(
      (c) => c[0] === '/api/auth/register'
    )
    expect(registerCall).toBeDefined()
    expect(registerCall![1]?.method).toBe('POST')
    expect((registerCall![1]?.headers as Record<string, string>)['X-Trace-Id']).toBeTruthy()
    expect(captured!.user).toEqual(mockUser)
  })

  it('useAuth throws when used outside AuthProvider', () => {
    const renderOutside = () => render(<AuthProbe onReady={() => {}} />)
    expect(renderOutside).toThrow(/AuthProvider/)
  })
})