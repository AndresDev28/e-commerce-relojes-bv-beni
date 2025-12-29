import { Column, Row, Section, Text } from '@react-email/components';
import { formatPrice } from '@/utils/formatPrice';
import { colors, spacing, typography } from '../utils';
interface OrderSummaryProps {
  /**
   * Subtotal (suma de productos sin envío)
   */
  subtotal: number;
  
  /**
   * Costo de envío
   */
  shipping: number;
  
  /**
   * Total final (subtotal + shipping)
   */
  total: number;
}
/**
 * Resumen de totales del pedido
 * 
 * Muestra: subtotal, envío y total
 * Si shipping = 0, muestra "Envío GRATIS"
 * 
 * @example
 * <OrderSummary 
 *   subtotal={259.89}
 *   shipping={0}
 *   total={259.89}
 * />
 */
export function OrderSummary({
  subtotal,
  shipping,
  total,
}: OrderSummaryProps) {
  const isFreeShipping = shipping === 0;
  return (
    <Section
      style={{
        padding: `${spacing.lg} 0`,
      }}
    >
      {/* Subtotal */}
      <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
      {/* Envío */}
      <SummaryRow
        label="Envío"
        value={isFreeShipping ? 'GRATIS' : formatPrice(shipping)}
        highlight={isFreeShipping}
      />
      {/* Separador */}
      <Row style={{ paddingTop: spacing.sm }}>
        <Column>
          <div
            style={{
              borderTop: `2px solid ${colors.gray[200]}`,
              margin: `${spacing.sm} 0`,
            }}
          />
        </Column>
      </Row>
      {/* Total */}
      <SummaryRow
        label="Total"
        value={formatPrice(total)}
        isTotal
      />
    </Section>
  );
}
/**
 * Fila individual del resumen
 * Componente interno reutilizable
 */
function SummaryRow({
  label,
  value,
  isTotal = false,
  highlight = false,
}: {
  label: string;
  value: string;
  isTotal?: boolean;
  highlight?: boolean;
}) {
  return (
    <Row
      style={{
        padding: `${spacing.sm} 0`,
      }}
    >
      <Column style={{ width: '50%' }}>
        <Text
          style={{
            margin: '0',
            fontSize: isTotal ? typography.fontSize.lg : typography.fontSize.base,
            fontWeight: isTotal
              ? typography.fontWeight.bold
              : typography.fontWeight.normal,
            color: colors.gray[900],
            fontFamily: typography.fontFamily,
          }}
        >
          {label}
        </Text>
      </Column>
      <Column style={{ width: '50%', textAlign: 'right' }}>
        <Text
          style={{
            margin: '0',
            fontSize: isTotal ? typography.fontSize.lg : typography.fontSize.base,
            fontWeight: isTotal
              ? typography.fontWeight.bold
              : typography.fontWeight.normal,
            color: highlight ? colors.success : colors.gray[900],
            fontFamily: typography.fontFamily,
          }}
        >
          {value}
        </Text>
      </Column>
    </Row>
  );
}