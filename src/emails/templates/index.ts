/**
 * Barrel export para templates de emails
 * Permite importar templates desde un solo lugar
 * 
 * @example
 * import { OrderStatusEmail, EMAIL_SUBJECTS } from '@/emails/templates'
 */
export { default as OrderStatusEmail, EMAIL_SUBJECTS } from './OrderStatusEmail';
export type { OrderStatusEmailProps } from './OrderStatusEmail';

/**
 * 💡 ¿Por qué exportar EMAIL_SUBJECTS?
- Lo necesitaremos en el API route para los subjects de los emails
- Lo exportamos aquí para tener un único punto de importación
💡 ¿Por qué export type?
- OrderStatusEmailProps es un tipo, no un valor
- TypeScript requiere export type para tipos (buena práctica)
- Evita errores en runtime (los tipos se eliminan al compilar)
 */