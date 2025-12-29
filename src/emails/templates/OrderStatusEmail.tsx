/** Estructura del template
 * OrderStatusEmail
├── <Html>
│   ├── <Head>
│   │   └── <title>
│   └── <Body>
│       └── <Container>
│           ├── <EmailHeader />
│           ├── <StatusBadge />
│           ├── Saludo personalizado
│           ├── Mensaje principal
│           ├── <OrderItems />
│           ├── <OrderSummary />
│           └── <EmailFooter />
 */

import { 
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { CartItem } from '@/types'
import { OrderStatus } from '@/types'
import {
  EmailFooter,
  EmailHeader,
  OrderItems,
  OrderSummary,
  StatusBadge,
} from '../components'
import { colors, container, spacing, typography } from '../utils'

/**
 * Props del template de email de estado de pedido
 */
export interface OrderStatusEmailProps {
  /**
   * ID del pedido (ej: "ORD-1735123456-A")
   */
  orderId: string;
  /**
   * Nombre del cliente (opcional)
   * Si no se proporciona, se usa "Cliente"
   */
  customerName?: string;
  /**
   * Estado actual del pedido
   */
  orderStatus: OrderStatus;
  /**
   * Datos del pedido
   */
  orderData: {
    items: CartItem[];
    subtotal: number;
    shipping: number;
    total: number;
    createdAt?: string;
  };
}

/**
 * Mensajes personalizados según el estado del pedido
 */
const STATUS_MESSAGES: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]:
    'Hemos recibido tu pedido y estamos esperando la confirmación del pago.',
  [OrderStatus.PAID]:
    '¡Tu pago ha sido confirmado! Estamos preparando tu pedido para el envío.',
  [OrderStatus.PROCESSING]:
    'Tu pedido está siendo preparado con cuidado por nuestro equipo.',
  [OrderStatus.SHIPPED]:
    '¡Tu pedido está en camino! Recibirás tu paquete en los próximos días.',
  [OrderStatus.DELIVERED]:
    '¡Tu pedido ha sido entregado! Esperamos que disfrutes tu compra.',
  [OrderStatus.CANCELLED]:
    'Tu pedido ha sido cancelado. Si tienes preguntas, no dudes en contactarnos.',
  [OrderStatus.REFUNDED]:
    'Tu reembolso ha sido procesado. El dinero debería aparecer en tu cuenta en 5-10 días hábiles.',
};

/**
 * Subjects sugeridos para cada estado
 * Para usar al enviar el email desde el API route
 */
export const EMAIL_SUBJECTS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Pedido recibido - Esperando confirmación de pago',
  [OrderStatus.PAID]: '¡Pago confirmado! - Pedido',
  [OrderStatus.PROCESSING]: 'Preparando tu pedido',
  [OrderStatus.SHIPPED]: '¡Tu pedido ha sido enviado!',
  [OrderStatus.DELIVERED]: '¡Pedido entregado!',
  [OrderStatus.CANCELLED]: 'Pedido cancelado',
  [OrderStatus.REFUNDED]: 'Reembolso procesado',
};

/**
 * Template de email para notificaciones de estado de pedido
 *
 * IMPORTANTE: Este template replica EXACTAMENTE el diseño aprobado de ORD-20
 *
 * @example
 * <OrderStatusEmail
 *   orderId="ORD-1735123456-A"
 *   customerName="Juan"
 *   orderStatus={OrderStatus.PAID}
 *   orderData={{
 *     items: [...],
 *     subtotal: 259.89,
 *     shipping: 0,
 *     total: 259.89
 *   }}
 * />
 */

export default function OrderStatusEmail({
  orderId,
  customerName,
  orderStatus,
  orderData,
}: OrderStatusEmailProps) {
  const message = STATUS_MESSAGES[orderStatus]
  const greetings = customerName || 'Cliente'

  return (
    <Html>
      <Head>
        <title>
          {EMAIL_SUBJECTS[orderStatus]} - {orderId}
        </title>
      </Head>

      {/* Preview text (aparece en inbox antes de abrir) */}
      <Preview>
        {EMAIL_SUBJECTS[orderStatus]} - {orderId}
      </Preview>

      <Body
        style={{
          backgroundColor: colors.gray[50],
          fontFamily: typography.fontFamily
        }}
      >
        <Container
          style={{
            ...container,
            marginTop: spacing.xl,
            marginBottom: spacing.xl,
          }}
        >
          {/* Header con logo */}
          <EmailHeader />

          {/* Badge de estado */}
          <StatusBadge status={orderStatus} />

          {/* Contenido principal */}
          <Section
            style={{
              padding: `${spacing.lg} ${spacing.xl}`,
            }}
          >
            {/* Saludo */}
            <Text
              style={{
                margin: `0 0 ${spacing.md} 0`,
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.gray[900],
                fontFamily: typography.fontFamily,
                lineHeight: typography.lineHeight.normal,
              }}
            >
              Hola {greetings},
            </Text>
            {/* Mensaje principal */}
            <Text
              style={{
                margin: `0 0 ${spacing.md} 0`,
                fontSize: typography.fontSize.base,
                color: colors.gray[600],
                fontFamily: typography.fontFamily,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              {message}
            </Text>
            {/* Número de pedido */}
            <Text
              style={{
                margin: `0 0 ${spacing.lg} 0`,
                fontSize: typography.fontSize.sm,
                color: colors.gray[600],
                fontFamily: typography.fontFamily,
              }}
            >
              Número de pedido: <strong>{orderId}</strong>
            </Text>
            {/* Items del pedido */}
            <OrderItems items={orderData.items} />
            {/* Resumen de totales */}
            <OrderSummary
              subtotal={orderData.subtotal}
              shipping={orderData.shipping}
              total={orderData.total}
            />
          </Section>
          
          {/* Footer */}
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

/**
 * Props por defecto para preview/testing
 * Útil para el dev server de React Email
 */
OrderStatusEmail.PreviewProps = {
  orderId: 'ORD-1735123456-A',
  customerName: 'Andrés Pérez',
  orderStatus: OrderStatus.REFUNDED,
  orderData: {
    items: [
      {
        id: '1',
        name: 'Casio G-Shock GA-2100-1A1ER',
        price: 129.99,
        quantity: 2,
        images: [],
        href: '/tienda/casio-gshock',
        description: 'Reloj deportivo resistente',
        stock: 10,
      },
    ],
    subtotal: 259.98,
    shipping: 0,
    total: 259.98,
  },
} as OrderStatusEmailProps;