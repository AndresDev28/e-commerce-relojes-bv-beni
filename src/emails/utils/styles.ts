/**
 * Estilos compartidos para emails
 * 
 * IMPORTANTE: Estos colores y estilos replican EXACTAMENTE
 * el diseño actual aprobado de ORD-20.
 * NO cambiar sin aprobación explícita.
 */
/**
 * Colores del sistema - basados en diseño actual
 */

export const colors = {
  // Primary colors
  primary: '#2563eb',    // Azul - links, CTAs, badges principales
  success: '#16a34a',    // Verde - badges de éxito (paid, delivered)

  // Escala de grises
  gray: {
    50: '#f9fafb',      // Backgrounds sutiles
    100: '#f3f4f6',     // Borders, separadores
    200: '#e5e7eb',     // Borders más marcados
    600: '#4b5563',     // Texto secundario
    900: '#111827',     // Texto principal
  },

  // Básicos
  white: '#ffffff',
  black: '#000000'
} as const

/**
 * Spacing consistente - mantiene el diseño actual
 */
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '40px',
} as const;

/**
 * Typography - fuentes y tamaños del diseño actual
 */
export const typography = {
  // Font stack optimizado para clientes de email
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

/**
 * Container principal - 600px es el estándar de la industria
 * Funciona bien en desktop y mobile email clients
 */
export const container = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: colors.white,
} as const;
/**
 * Estilos de botones reutilizables
 */
export const button = {
  primary: {
    backgroundColor: colors.primary,
    color: colors.white,
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: typography.fontWeight.semibold,
    display: 'inline-block',
  },
} as const;