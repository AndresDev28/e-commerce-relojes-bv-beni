export const metadata = {
    title: 'Política de Privacidad | Relojes BV Beni',
    description: 'Nuestra política de privacidad y protección de datos.',
}

export default function PrivacyPolicyPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-12 font-sans text-neutral-dark">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Política de Privacidad</h1>

            <div className="prose prose-neutral max-w-none space-y-6 text-neutral">
                <p><strong>Última actualización:</strong> {new Date().toLocaleDateString('es-ES')}</p>

                <section>
                    <h2 className="text-2xl font-bold text-neutral-dark mb-4">1. Responsable del Tratamiento</h2>
                    <p>La presente política de privacidad es aplicable a los usuarios de Relojes BV Beni. Nos comprometemos a proteger su privacidad de acuerdo con la legislación vigente y aplicable referentes al comercio electrónico y RGPD.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-neutral-dark mb-4">2. Finalidad de los Datos</h2>
                    <p>Recopilamos la información personal que nos proporciona al registrar una cuenta o realizar una compra (nombre, dirección, correo electrónico), estrictamente para los siguientes fines:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Procesar, preparar y facturar sus pedidos.</li>
                        <li>Gestionar envíos físicos y actualizaciones de tracking en tiempo real.</li>
                        <li>Habilitar soporte y servicio al cliente posventa.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-neutral-dark mb-4">3. Seguridad de los Datos (Cero Persistencia de PII)</h2>
                    <p>Garantizamos la máxima seguridad en las transacciones digitales. Nuestro ecosistema de IT está reforzado para <strong>no almacenar datos altamente sensibles en nuestros servidores</strong>, tales como números de su tarjeta de crédito (PAN) o contraseñas en texto plano. Todos los pagos se tokenizan y procesan de forma descentralizada y segura a través de pasarelas certificadas.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-neutral-dark mb-4">4. Política de Cookies</h2>
                    <p>La web hace uso de cookies esenciales y de rendimiento para autenticar usuarios, calcular cestas de compra y proteger las sesiones. Al utilizar y navegar por nuestro sitio web, acepta la instalación de estas cookies requeridas para la usabilidad básica de la aplicación.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-neutral-dark mb-4">5. Sus Derechos</h2>
                    <p>De acuerdo con el Reglamento General de Protección de Datos (RGPD), nuestro software le permite el derecho natural a acceder, consultar el estado, y suprimir de forma paulatina cualquier información relacionada a su identidad. Contáctenos para solicitar su archivo integral de datos al canal de atención al cliente.</p>
                </section>
            </div>
        </div>
    )
}
