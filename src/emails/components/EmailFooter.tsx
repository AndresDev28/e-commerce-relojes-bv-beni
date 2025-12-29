import { Hr, Link, Section, Text } from '@react-email/components';
import { colors, spacing, typography } from '../utils';
interface EmailFooterProps {
  /**
   * Email de contacto
   * @default "contacto@relojesbvbeni.com"
   */
  contactEmail?: string;
  
  /**
   * Año para el copyright
   * @default current year
   */
  year?: number;
}
/**
 * Footer del email con info de contacto y copyright
 * 
 * @example
 * <EmailFooter 
 *   contactEmail="info@tutienda.com"
 *   year={2025}
 * />
 */
export function EmailFooter({
  contactEmail = 'contacto@relojesbvbeni.com',
  year = new Date().getFullYear(),
}: EmailFooterProps) {
  return (
    <>
      {/* Separador visual */}
      <Hr
        style={{
          borderColor: colors.gray[200],
          margin: `${spacing.xl} 0`,
        }}
      />

      <Section
        style={{
          backgroundColor: colors.gray[50],
          padding: `${spacing.lg} ${spacing.md}`,
          textAlign: 'center',
        }}
      >
        {/* Información de contacto */}
        <Text
          style={{
            margin: '0 0 8px 0',
            fontSize: typography.fontSize.sm,
            color: colors.gray[600],
            fontFamily: typography.fontFamily,
            lineHeight: typography.lineHeight.normal,
          }}
        >
          ¿Necesitas ayuda? Escríbenos a{' '}
          <Link
            href={`mailto:${contactEmail}`}
            style={{
              color: colors.primary,
              textDecoration: 'none',
            }}
          >
            {contactEmail}
          </Link>
        </Text>

        {/* Copyright */}
        <Text
          style={{
            margin: '0',
            fontSize: typography.fontSize.xs,
            color: colors.gray[600],
            fontFamily: typography.fontFamily,
            lineHeight: typography.lineHeight.normal,
          }}
        >
          © {year} Relojes BV Beni. Todos los derechos reservados.
        </Text>
      </Section>
    </>
  )
}