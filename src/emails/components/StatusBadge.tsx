import { Section, Text } from '@react-email/components';
import { OrderStatus } from '@/types';
import { spacing, typography } from '../utils';
interface StatusBadgeProps {
  /**
   * Estado del pedido
   */
  status: OrderStatus;
}
/**
 * Configuración visual de cada estado
 * Basado en el diseño actual de ORD-20
 */
const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    color: string;
    backgroundColor: string;
    icon: string;
  }
> = {
  [OrderStatus.PENDING]: {
    label: 'Pago Pendiente',
    color: '#854d0e', // yellow-900
    backgroundColor: '#fef3c7', // yellow-100
    icon: '⏳',
  },
  [OrderStatus.PAID]: {
    label: 'Pago Confirmado',
    color: '#166534', // green-800
    backgroundColor: '#dcfce7', // green-100
    icon: '✓',
  },
  [OrderStatus.PROCESSING]: {
    label: 'En Preparación',
    color: '#1e40af', // blue-800
    backgroundColor: '#dbeafe', // blue-100
    icon: '📦',
  },
  [OrderStatus.SHIPPED]: {
    label: 'Enviado',
    color: '#ea580c', // orange-600
    backgroundColor: '#ffedd5', // orange-100
    icon: '🚚',
  },
  [OrderStatus.DELIVERED]: {
    label: 'Entregado',
    color: '#166534', // green-800
    backgroundColor: '#dcfce7', // green-100
    icon: '✓',
  },
  [OrderStatus.CANCELLED]: {
    label: 'Cancelado',
    color: '#991b1b', // red-800
    backgroundColor: '#fee2e2', // red-100
    icon: '✗',
  },
  [OrderStatus.REFUNDED]: {
    label: 'Reembolsado',
    color: '#6b21a8', // purple-800
    backgroundColor: '#f3e8ff', // purple-100
    icon: '↩',
  },
  [OrderStatus.CANCELLATION_REQUESTED]: {
    label: 'Cancelación Solicitada',
    color: '#b45309', // amber-700
    backgroundColor: '#fef3c7', // amber-100
    icon: '⚠️',
  },
};
/**
 * Badge que muestra el estado del pedido con color e ícono
 * 
 * IMPORTANTE: Los colores replican EXACTAMENTE el diseño de ORD-20
 * 
 * @example
 * <StatusBadge status={OrderStatus.PAID} />
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Section
      style={{
        padding: `${spacing.lg} 0`,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: `${spacing.sm} ${spacing.md}`,
          backgroundColor: config.backgroundColor,
          borderRadius: '6px',
          border: `1px solid ${config.color}20`, // 20 = 12% opacity
        }}
      >
        <Text
          style={{
            margin: '0',
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            color: config.color,
            fontFamily: typography.fontFamily,
            lineHeight: typography.lineHeight.tight,
          }}
        >
          {config.icon} {config.label}
        </Text>
      </div>
    </Section>
  );
}