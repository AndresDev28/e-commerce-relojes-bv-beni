import { Img, Section, Text } from "@react-email/components";
import { colors, spacing, typography } from "../utils"; // Comprobar si funciona el barrel export

interface EmailHeaderProps {
  /**
   * URL del logo (debe ser absoluta para emails)
   * Por defecto usa el logo desde /public/email-assets/
   */
  logoUrl?: string;

  /**
   * Nombre de la tienda
   * @default "Relojes BV Beni"
   */
  storeName?: string;
}

/**
* Header del email con logo y nombre de tienda
* 
* IMPORTANTE: Replica exactamente el diseño actual de ORD-20
* 
* @example
* <EmailHeader 
*   logoUrl="https://tudominio.com/logo.png"
*   storeName="Relojes BV Beni"
* />
*/

export function EmailHeader({
  logoUrl = '/email-assets/logo.png',
  storeName = 'Relojes BV Beni',
}: EmailHeaderProps) {
  return (
    <Section
      style={{
        backgroundColor: colors.white,
        padding: `${spacing.xl} ${spacing.lg}`,
        textAlign: 'center',
        borderBottom: `1px solid ${colors.gray[100]}`,
      }}
      >
        {/* Logo */}
        <Img
          src={logoUrl}
          alt={storeName}
          width="120"
          height="auto"
          style={{
            margin: '0 auto',
            display: 'block'
          }}
        />

        {/* Tagline */}
        <Text
          style={{
            margin: `${spacing.sm} 0 0 0`,
            fontSize: typography.fontSize.sm,
            color: colors.gray[600],
            fontFamily: typography.fontFamily,
            lineHeight: typography.lineHeight.normal,
          }}
        >
          Tu tienda de relojes de confianza
        </Text>
      </Section>
    )

  }