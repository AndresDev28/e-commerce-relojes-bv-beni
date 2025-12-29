import { Column, Row, Section, Text } from '@react-email/components';
import type { CartItem } from '@/types';
import { formatPrice } from '@/utils/formatPrice';
import { colors, spacing, typography } from '../utils';
interface OrderItemsProps {
  /**
   * Array de productos del pedido
   */
  items: CartItem[];
}
/**
 * Tabla de productos del pedido
 * 
 * Muestra: nombre, cantidad, precio unitario y subtotal por producto
 * 
 * IMPORTANTE: Usa <table> internamente para compatibilidad con
 * todos los clientes de email (Gmail, Outlook, Apple Mail, etc.)
 * 
 * @example
 * <OrderItems items={[
 *   { name: 'Reloj Casio', quantity: 2, price: 129.99 }
 * ]} />
 */
export function OrderItems({ items }: OrderItemsProps) {
  return (
    <Section
      style={{
        padding: `${spacing.lg} 0`,
      }}
    >
      {/* Título de sección */}
      <Text
        style={{
          margin: `0 0 ${spacing.md} 0`,
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.gray[900],
          fontFamily: typography.fontFamily,
          lineHeight: typography.lineHeight.tight,
        }}
      >
        Productos
      </Text>
      {/* Header de la tabla */}
      <Row
        style={{
          backgroundColor: colors.gray[50],
          padding: `${spacing.sm} ${spacing.md}`,
          borderBottom: `1px solid ${colors.gray[200]}`,
        }}
      >
        <Column style={{ width: '50%' }}>
          <Text
            style={{
              margin: '0',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.gray[600],
              fontFamily: typography.fontFamily,
            }}
          >
            Producto
          </Text>
        </Column>
        <Column style={{ width: '15%', textAlign: 'center' }}>
          <Text
            style={{
              margin: '0',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.gray[600],
              fontFamily: typography.fontFamily,
            }}
          >
            Cant.
          </Text>
        </Column>
        <Column style={{ width: '35%', textAlign: 'right' }}>
          <Text
            style={{
              margin: '0',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.gray[600],
              fontFamily: typography.fontFamily,
            }}
          >
            Precio
          </Text>
        </Column>
      </Row>
      {/* Items */}
      {items.map((item, index) => (
        <Row
          key={index}
          style={{
            padding: `${spacing.md}`,
            borderBottom: `1px solid ${colors.gray[100]}`,
          }}
        >
          <Column style={{ width: '50%' }}>
            <Text
              style={{
                margin: '0',
                fontSize: typography.fontSize.base,
                color: colors.gray[900],
                fontFamily: typography.fontFamily,
                lineHeight: typography.lineHeight.normal,
              }}
            >
              {item.name}
            </Text>
          </Column>
          <Column style={{ width: '15%', textAlign: 'center' }}>
            <Text
              style={{
                margin: '0',
                fontSize: typography.fontSize.base,
                color: colors.gray[600],
                fontFamily: typography.fontFamily,
              }}
            >
              {item.quantity}
            </Text>
          </Column>
          <Column style={{ width: '35%', textAlign: 'right' }}>
            <Text
              style={{
                margin: '0',
                fontSize: typography.fontSize.base,
                color: colors.gray[900],
                fontFamily: typography.fontFamily,
              }}
            >
              {formatPrice(item.price * item.quantity)}
            </Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
}