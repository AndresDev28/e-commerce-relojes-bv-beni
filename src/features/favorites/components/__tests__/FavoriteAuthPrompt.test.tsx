import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FavoriteAuthPrompt } from '@/features/favorites/components/FavoriteAuthPrompt'

describe('FavoriteAuthPrompt', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does NOT carry its own role/aria-live attributes (parent owns the live region)', () => {
    // Contract: the aria-live region must ALWAYS be in the DOM for screen readers
    // to detect content changes. The component itself is just the visible content;
    // the parent (ProductCard/ProductDetailClient) wraps it in a role="status"
    // element that stays mounted even when the prompt is hidden.
    render(<FavoriteAuthPrompt onLogin={vi.fn()} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('displays the prompt message "Iniciá sesión para guardar favoritos"', () => {
    render(<FavoriteAuthPrompt onLogin={vi.fn()} />)

    expect(screen.getByText('Iniciá sesión para guardar favoritos')).toBeInTheDocument()
  })

  it('renders a CTA button with "Iniciar sesión" text', () => {
    render(<FavoriteAuthPrompt onLogin={vi.fn()} />)

    const cta = screen.getByRole('button', { name: 'Iniciar sesión' })
    expect(cta).toBeInTheDocument()
  })

  it('calls onLogin when CTA button is clicked', async () => {
    const onLogin = vi.fn()
    render(<FavoriteAuthPrompt onLogin={onLogin} />)

    const cta = screen.getByRole('button', { name: 'Iniciar sesión' })
    await userEvent.click(cta)

    expect(onLogin).toHaveBeenCalledTimes(1)
  })
})
