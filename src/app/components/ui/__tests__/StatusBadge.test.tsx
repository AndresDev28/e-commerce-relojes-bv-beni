/**
 * [ORD-18] StatusBadge Component - Unit Tests (REFACTORED)
 *
 * Tests para el componente StatusBadge refactorizado que ahora usa
 * OrderStatus enum y ORDER_STATUS_CONFIG centralizado.
 *
 * COBERTURA:
 * ✓ Renderizado de todos los estados válidos con labels del config
 * ✓ Colores correctos según ORDER_STATUS_CONFIG
 * ✓ Íconos opcionales (showIcon prop)
 * ✓ Variantes de tamaño (sm, md, lg)
 * ✓ Tooltip con descripción
 * ✓ Accesibilidad (WCAG AA)
 */

import { render, screen } from '@testing-library/react'
import StatusBadge from '../StatusBadge'
import { OrderStatus } from '@/types'
import { describe, it, expect } from 'vitest'

describe('[ORD-18] StatusBadge Component - Refactored', () => {
  /**
   * TEST 1: Renderizado básico con labels del ORDER_STATUS_CONFIG
   */
  describe('Renderizado básico', () => {
    it('should render the badge with correct text for PENDING status', () => {
      render(<StatusBadge status={OrderStatus.PENDING} />)
      const badge = screen.getByText('Pago Pendiente')
      expect(badge).toBeInTheDocument()
    })

    it('should render the badge with correct text for PAID status', () => {
      render(<StatusBadge status={OrderStatus.PAID} />)
      const badge = screen.getByText('Pago Confirmado')
      expect(badge).toBeInTheDocument()
    })

    it('should render the badge with correct text for PROCESSING status', () => {
      render(<StatusBadge status={OrderStatus.PROCESSING} />)
      const badge = screen.getByText('En Preparación')
      expect(badge).toBeInTheDocument()
    })

    it('should render the badge with correct text for SHIPPED status', () => {
      render(<StatusBadge status={OrderStatus.SHIPPED} />)
      const badge = screen.getByText('Enviado')
      expect(badge).toBeInTheDocument()
    })

    it('should render the badge with correct text for DELIVERED status', () => {
      render(<StatusBadge status={OrderStatus.DELIVERED} />)
      const badge = screen.getByText('Entregado')
      expect(badge).toBeInTheDocument()
    })

    it('should render the badge with correct text for CANCELLED status', () => {
      render(<StatusBadge status={OrderStatus.CANCELLED} />)
      const badge = screen.getByText('Cancelado')
      expect(badge).toBeInTheDocument()
    })

    it('should render the badge with correct text for REFUNDED status', () => {
      render(<StatusBadge status={OrderStatus.REFUNDED} />)
      const badge = screen.getByText('Reembolsado')
      expect(badge).toBeInTheDocument()
    })
  })

  /**
   * TEST 2: Colores correctos según ORDER_STATUS_CONFIG
   */
  describe('Colores según estado', () => {
    it('should apply gray background for PENDING status', () => {
      render(<StatusBadge status={OrderStatus.PENDING} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('bg-gray-500')
    })

    it('should apply blue background for PAID status', () => {
      render(<StatusBadge status={OrderStatus.PAID} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('bg-blue-500')
    })

    it('should apply yellow-700 background for PROCESSING status (WCAG AA compliant)', () => {
      render(<StatusBadge status={OrderStatus.PROCESSING} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('bg-yellow-700')
    })

    it('should apply orange-600 background for SHIPPED status (WCAG AA compliant)', () => {
      render(<StatusBadge status={OrderStatus.SHIPPED} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('bg-orange-600')
    })

    it('should apply green-600 background for DELIVERED status (WCAG AA compliant)', () => {
      render(<StatusBadge status={OrderStatus.DELIVERED} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('bg-green-600')
    })

    it('should apply red-600 background for CANCELLED status (WCAG AA compliant)', () => {
      render(<StatusBadge status={OrderStatus.CANCELLED} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('bg-red-600')
    })

    it('should apply purple background for REFUNDED status', () => {
      render(<StatusBadge status={OrderStatus.REFUNDED} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('bg-purple-500')
    })
  })

  /**
   * TEST 3: Íconos opcionales (NEW en ORD-18)
   */
  describe('Íconos opcionales', () => {
    it('should NOT show icon by default (showIcon=false)', () => {
      const { container } = render(<StatusBadge status={OrderStatus.PAID} />)
      const badge = screen.getByText('Pago Confirmado')

      // El badge debe tener solo el texto, sin ícono
      expect(badge.textContent).toBe('Pago Confirmado')

      // No debe haber span adicional con aria-hidden
      const iconSpan = container.querySelector('span[aria-hidden="true"]')
      expect(iconSpan).not.toBeInTheDocument()
    })

    it('should show icon when showIcon=true', () => {
      const { container } = render(
        <StatusBadge status={OrderStatus.PAID} showIcon />
      )

      // Debe haber un span con aria-hidden que contiene el ícono
      const iconSpan = container.querySelector('span[aria-hidden="true"]')
      expect(iconSpan).toBeInTheDocument()
      expect(iconSpan?.textContent).toBe('✓') // Ícono de PAID según ORDER_STATUS_CONFIG
    })

    it('should show correct icon for each status', () => {
      const testCases = [
        { status: OrderStatus.PENDING, icon: '⏳' },
        { status: OrderStatus.PAID, icon: '✓' },
        { status: OrderStatus.PROCESSING, icon: '📦' },
        { status: OrderStatus.SHIPPED, icon: '🚚' },
        { status: OrderStatus.DELIVERED, icon: '✓' },
        { status: OrderStatus.CANCELLED, icon: '✕' },
        { status: OrderStatus.REFUNDED, icon: '↩' },
      ]

      testCases.forEach(({ status, icon }) => {
        const { container, unmount } = render(
          <StatusBadge status={status} showIcon />
        )
        const iconSpan = container.querySelector('span[aria-hidden="true"]')
        expect(iconSpan?.textContent).toBe(icon)
        unmount()
      })
    })
  })

  /**
   * TEST 4: Variantes de tamaño (NEW en ORD-18)
   */
  describe('Variantes de tamaño', () => {
    it('should render with medium size by default', () => {
      render(<StatusBadge status={OrderStatus.PAID} />)
      const badge = screen.getByRole('status')

      expect(badge).toHaveClass('px-4')
      expect(badge).toHaveClass('py-2')
      expect(badge).toHaveClass('text-sm')
    })

    it('should render with small size when size="sm"', () => {
      render(<StatusBadge status={OrderStatus.PAID} size="sm" />)
      const badge = screen.getByRole('status')

      expect(badge).toHaveClass('px-2')
      expect(badge).toHaveClass('py-1')
      expect(badge).toHaveClass('text-xs')
    })

    it('should render with large size when size="lg"', () => {
      render(<StatusBadge status={OrderStatus.PAID} size="lg" />)
      const badge = screen.getByRole('status')

      expect(badge).toHaveClass('px-6')
      expect(badge).toHaveClass('py-3')
      expect(badge).toHaveClass('text-base')
    })

    it('should support all size variants', () => {
      const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg']

      sizes.forEach((size) => {
        const { unmount } = render(
          <StatusBadge status={OrderStatus.DELIVERED} size={size} />
        )
        const badge = screen.getByText('Entregado')
        expect(badge).toBeInTheDocument()
        unmount()
      })
    })
  })

  /**
   * TEST 5: Tooltip con descripción (NEW en ORD-18)
   */
  describe('Tooltip con descripción', () => {
    it('should have title attribute with description from ORDER_STATUS_CONFIG', () => {
      render(<StatusBadge status={OrderStatus.PAID} />)
      const badge = screen.getByRole('status')

      expect(badge).toHaveAttribute('title', 'Pago procesado correctamente')
    })

    it('should show different tooltip for each status', () => {
      const testCases = [
        { status: OrderStatus.PENDING, description: 'Esperando confirmación de pago' },
        { status: OrderStatus.PAID, description: 'Pago procesado correctamente' },
        { status: OrderStatus.PROCESSING, description: 'Preparando tu pedido para envío' },
        { status: OrderStatus.SHIPPED, description: 'Tu pedido está en camino' },
        { status: OrderStatus.DELIVERED, description: 'Pedido recibido exitosamente' },
        { status: OrderStatus.CANCELLED, description: 'Pedido cancelado' },
        { status: OrderStatus.REFUNDED, description: 'Dinero devuelto' },
      ]

      testCases.forEach(({ status, description }) => {
        const { unmount } = render(<StatusBadge status={status} />)
        const badge = screen.getByRole('status')
        expect(badge).toHaveAttribute('title', description)
        unmount()
      })
    })

    it('should have cursor-help class for tooltip indicator', () => {
      render(<StatusBadge status={OrderStatus.PAID} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('cursor-help')
    })
  })

  /**
   * TEST 6: Estructura y estilos
   */
  describe('Estructura y estilos', () => {
    it('should have correct base CSS classes', () => {
      render(<StatusBadge status={OrderStatus.PENDING} />)
      const badge = screen.getByRole('status')

      // Clases base que debe tener todo badge
      expect(badge).toHaveClass('inline-flex') // Cambió de inline-block a inline-flex
      expect(badge).toHaveClass('items-center')
      expect(badge).toHaveClass('rounded-full')
      expect(badge).toHaveClass('text-white')
      expect(badge).toHaveClass('font-sans')
      expect(badge).toHaveClass('font-medium')
    })

    it('should render as a span element', () => {
      render(<StatusBadge status={OrderStatus.PENDING} />)
      const badge = screen.getByRole('status')
      expect(badge.tagName).toBe('SPAN')
    })

    it('should have hover:scale-105 for interactive feedback', () => {
      render(<StatusBadge status={OrderStatus.PAID} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('hover:scale-105')
    })

    it('should have transition-transform for smooth animations', () => {
      render(<StatusBadge status={OrderStatus.PAID} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('transition-transform')
    })
  })

  it('should render as a span element', () => {
    render(<StatusBadge status={OrderStatus.PENDING} />)
    const badge = screen.getByText('Pago Pendiente')
    expect(badge.tagName).toBe('SPAN')
  })

  it('should have hover:scale-105 for interactive feedback', () => {
    render(<StatusBadge status={OrderStatus.PAID} />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('hover:scale-105')
  })

  it('should have transition-transform for smooth animations', () => {
    render(<StatusBadge status={OrderStatus.PAID} />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('transition-transform')
  })
})

/**
 * TEST 7: Accesibilidad
 */
describe('Accesibilidad', () => {
  it('should have white text color for all status badges (WCAG AA)', () => {
    const statuses = Object.values(OrderStatus)

    statuses.forEach((status) => {
      const { unmount } = render(<StatusBadge status={status} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('text-white')
      unmount()
    })
  })

  it('should have role="status" for screen readers', () => {
    render(<StatusBadge status={OrderStatus.DELIVERED} />)
    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
  })

  it('should hide icon from screen readers with aria-hidden', () => {
    const { container } = render(
      <StatusBadge status={OrderStatus.PAID} showIcon />
    )
    const iconSpan = container.querySelector('span[aria-hidden="true"]')
    expect(iconSpan).toHaveAttribute('aria-hidden', 'true')
  })
})

/**
 * TEST 8: Integración con ORDER_STATUS_CONFIG
 */
describe('Integración con ORDER_STATUS_CONFIG', () => {
  it('should use label from ORDER_STATUS_CONFIG', () => {
    render(<StatusBadge status={OrderStatus.PAID} />)
    // Label del config, no hardcodeado
    expect(screen.getByText('Pago Confirmado')).toBeInTheDocument()
  })

  it('should use color from ORDER_STATUS_CONFIG', () => {
    render(<StatusBadge status={OrderStatus.PAID} />)
    const badge = screen.getByRole('status')
    // Color mapeado desde config.color = 'blue' → 'bg-blue-500'
    expect(badge).toHaveClass('bg-blue-500')
  })

  it('should use description from ORDER_STATUS_CONFIG for tooltip', () => {
    render(<StatusBadge status={OrderStatus.PAID} />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveAttribute('title', 'Pago procesado correctamente')
  })

  it('should use icon from ORDER_STATUS_CONFIG when showIcon=true', () => {
    const { container } = render(
      <StatusBadge status={OrderStatus.SHIPPED} showIcon />
    )
    const iconSpan = container.querySelector('span[aria-hidden="true"]')
    expect(iconSpan?.textContent).toBe('🚚')
  })
})

/**
 * TEST 9: Combinaciones de props
 */
describe('Combinaciones de props', () => {
  it('should support all props together: status + showIcon + size', () => {
    const { container } = render(
      <StatusBadge
        status={OrderStatus.DELIVERED}
        showIcon
        size="lg"
      />
    )

    const badge = screen.getByRole('status')
    const iconSpan = container.querySelector('span[aria-hidden="true"]')

    // Verifica que todas las props funcionen juntas
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-green-600') // Color correcto
    expect(badge).toHaveClass('px-6') // Tamaño lg
    expect(iconSpan).toBeInTheDocument() // Ícono presente
    expect(iconSpan?.textContent).toBe('✓') // Ícono correcto
  })

  it('should work with minimal props (only status)', () => {
    render(<StatusBadge status={OrderStatus.PENDING} />)

    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-gray-500')
    expect(badge).toHaveClass('px-4') // Default size md
  })
})
