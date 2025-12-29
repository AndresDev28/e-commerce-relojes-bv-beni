import { render } from '@react-email/components'

/**
 * Renderiza un componente de React Email a HTML string
 * @param template - Componente React del email
 * @returns HTML string listo para enviar via Resend
 * 
 * @example
 * const html = await renderEmailToHtml(<OrderStatusEmail {...props} />);
 * await resend.emails.send({ html, ... });
 */
export async function renderEmailToHtml(template: React.ReactNode): Promise<string> {
  return await render(template, {
    // Pretty print en desarrollo para debugging
    pretty: process.env.NODE_ENV !== 'development',
  })
}