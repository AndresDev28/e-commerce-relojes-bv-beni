export const metadata = {
    title: 'Términos y Condiciones | Relojes BV Beni',
    description: 'Términos y condiciones legales de uso y venta en Relojes BV Beni.',
}

export default function TermsAndConditionsPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-12 font-sans text-neutral-dark">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Términos y Condiciones</h1>

            <div className="prose prose-neutral max-w-none space-y-6 text-neutral">
                <p><strong>Última actualización:</strong> {new Date().toLocaleDateString('es-ES')}</p>

                <section>
                    <h2 className="text-2xl font-bold text-neutral-dark mb-4">1. Introducción general</h2>
                    <p>Al acceder, navegar y utilizar la aplicación de e-commerce de Relojes BV Beni, propiedad intelectual operada en los canales vigentes, usted acepta plena y sin reservas todos los presentes Términos y Condiciones. Si usted se opone a cualquier cláusula o documento enlazado o directriz de nuestra marca, le rogamos detenga de inmediato el registro o actividad de compra en los servicios.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-neutral-dark mb-4">2. Compras, Disponibilidad y Envíos (Hardening)</h2>
                    <p>Nuestros procesos de compra son validados automáticamente frente a nuestro control de inventario (`stock`) a nivel base de datos, en caso de fallo técnico se reservará el producto un máximo de X minutos. Los pedidos efectuados validamente están previstos para su notificación en el apartado &quot;Enviado&quot;. Le prooveremos, a los clientes, un Número de Seguimiento (Tracking ID) tan pronto se asigne e integre con la empresa transportista.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-neutral-dark mb-4">3. Devoluciones y Garantías Limitadas</h2>
                    <p>Avalamos la autenticidad y condición estructural de cada unidad bajo las directrices de importador autorizado o relojero local certificado. Ante algún imprevisto que justifique el reintegro financiero, Relojes BV Beni se acopla a las normativas de transacciones y reversos exigidas por la ley de Protección al Consumidor en su territorio base.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-neutral-dark mb-4">4. Restricciones y Uso Adecuado</h2>
                    <p>Está estrictamente prohibido aplicar ingeniería inversa a nuestros servicios API, utilizar metodologías no pactadas, u otros procesos masivos automatizados (bots). Las reservas masivas están sometidas a cuotas controladas (Rate Limits).</p>
                </section>
            </div>
        </div>
    )
}
