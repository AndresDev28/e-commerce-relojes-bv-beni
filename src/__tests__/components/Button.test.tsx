import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '@/app/components/ui/Button'

describe('Button Component', () => {
  it('renders with text correctly', () => {
    // ARRANGE
    render(<Button>Click me</Button>)

    // ACT & ASSERT
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies primary variant styles', () => {
    // ARRANGE
    render(<Button variant="primary">Primary Button</Button>)

    // ACT
    const button = screen.getByText('Primary Button')

    // ASSERT
    expect(button).toHaveClass('bg-primary')
  })

  it('applies secondary variant styles', () => {
    // ARRANGE
    render(<Button variant="secondary">Secondary Button</Button>)

    // ACT
    const button = screen.getByText('Secondary Button')

    // ASSERT
    expect(button).toHaveClass('bg-secondary')
  })

  it('applies outline variant styles', () => {
    // ARRANGE
    render(<Button variant="outline">Outline Button</Button>)

    // ACT
    const button = screen.getByText('Outline Button')

    // ASSERT
    expect(button).toHaveClass('border-primary')
  })

  it('calls onClick handler when clicked', async () => {
    // ARRANGE
    const handleClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={handleClick}>Click me</Button>)

    // ACT
    const button = screen.getByText('Click me')
    await user.click(button)

    // ASSERT
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    // ARRANGE
    render(<Button disabled>Disabled Button</Button>)

    // ACT
    const button = screen.getByText('Disabled Button')

    // ASSERT
    expect(button).toBeDisabled()
  })

  it('does not call onClick when disabled', async () => {
    // ARRANGE
    const handleClick = vi.fn()
    const user = userEvent.setup()
    render(
      <Button onClick={handleClick} disabled>
        Disabled Button
      </Button>
    )

    // ACT
    const button = screen.getByText('Disabled Button')
    await user.click(button)

    // ASSERT
    expect(handleClick).not.toHaveBeenCalled()
  })
})
