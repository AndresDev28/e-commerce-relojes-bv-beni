import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Heart } from 'lucide-react'
import ProductActionIcon from '../ProductActionIcon'

describe('ProductActionIcon', () => {
  it('renders the label text', () => {
    render(<ProductActionIcon icon={Heart} label="Favoritos" onClick={vi.fn()} />)
    expect(screen.getByText('Favoritos')).toBeInTheDocument()
  })

  it('renders outline icon by default (no fill-current class)', () => {
    render(<ProductActionIcon icon={Heart} label="Favoritos" onClick={vi.fn()} />)
    const button = screen.getByRole('button')
    const svg = button.querySelector('svg')
    expect(svg).not.toHaveClass('fill-current')
  })

  it('uses neutral text color when not filled', () => {
    render(<ProductActionIcon icon={Heart} label="Favoritos" onClick={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('text-neutral-medium')
  })

  it('renders filled icon when filled prop is true (TC-03 fix)', () => {
    render(
      <ProductActionIcon
        icon={Heart}
        label="Quitar"
        onClick={vi.fn()}
        filled
      />
    )
    const button = screen.getByRole('button')
    const svg = button.querySelector('svg')
    expect(svg).toHaveClass('fill-current')
  })

  it('uses primary text color when filled (so active state is visually distinct)', () => {
    render(
      <ProductActionIcon
        icon={Heart}
        label="Quitar"
        onClick={vi.fn()}
        filled
      />
    )
    const button = screen.getByRole('button')
    expect(button.className).toContain('text-primary')
    expect(button.className).not.toContain('text-neutral-medium')
  })

  it('still respects disabled state when filled', () => {
    render(
      <ProductActionIcon
        icon={Heart}
        label="Quitar"
        onClick={vi.fn()}
        filled
        disabled
      />
    )
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.className).toContain('opacity-30')
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<ProductActionIcon icon={Heart} label="Favoritos" onClick={onClick} />)
    await (await import('@testing-library/user-event')).default.click(
      screen.getByRole('button')
    )
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(
      <ProductActionIcon
        icon={Heart}
        label="Favoritos"
        onClick={onClick}
        disabled
      />
    )
    await (await import('@testing-library/user-event')).default.click(
      screen.getByRole('button')
    )
    expect(onClick).not.toHaveBeenCalled()
  })
})
