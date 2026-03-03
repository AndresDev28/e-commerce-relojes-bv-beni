import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Política de Cookies | Relojes BV Beni',
    description: 'Política y configuración de cookies de Relojes BV Beni.',
}

export default function CookiesPolicyPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
            <h1 className="text-3xl md:text-5xl font-bold font-oswald text-neutral-dark mb-8 uppercase tracking-wide">
                Política de Cookies
            </h1>

            <div className="prose prose-neutral max-w-none font-serif text-neutral-800 space-y-6">
                <p className="text-lg">
                    Última actualización: Noviembre 2025
                </p>

                <section className="bg-neutral-50 p-6 rounded-lg border border-neutral-200 my-8">
                    <h2 className="text-xl font-bold font-sans text-neutral-dark mb-4">
                        Ajustes de Privacidad
                    </h2>
                    <p className="text-sm mb-4">
                        Puedes cambiar tus preferencias de cookies en cualquier momento borrando los datos de tu navegador
                        para que el aviso de cookies vuelva a aparecer y puedas seleccionar tus opciones nuevamente.
                    </p>
                    {/* Un control para forzar la re-aparición del banner podría agregarse aquí con un Client Component, pero para el MVP este texto basta */}
                </section>

                <h2>1. ¿Qué son las cookies?</h2>
                <p>
                    Las cookies son pequeños archivos de texto que los sitios web que visitas colocan en tu ordenador,
                    teléfono móvil u otro dispositivo. Se utilizan ampliamente para hacer que los sitios web funcionen, o
                    funcionen de manera más eficiente, así como para proporcionar información a los propietarios del sitio.
                </p>

                <h2>2. Tipos de cookies que utilizamos</h2>
                <p>
                    En <strong>Relojes BV Beni</strong> utilizamos los siguientes tipos de cookies:
                </p>

                <h3>Cookies estrictamente necesarias (Técnicas)</h3>
                <p>
                    Estas cookies son esenciales para el funcionamiento del sitio web y no pueden desactivarse en nuestros sistemas.
                    Por lo general, solo se configuran en respuesta a acciones realizadas por ti que equivalen a una solicitud de
                    servicios, como establecer tus preferencias de privacidad, iniciar sesión, agregar artículos al carrito
                    o completar formularios.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>bv-beni-cart</strong>: Mantiene el estado de tu carrito de compras mientras navegas.</li>
                    <li><strong>bv-beni-auth-token</strong>: Mantiene tu sesión segura iniciada.</li>
                    <li><strong>bv-beni-cookie-consent</strong>: Recuerda tus preferencias sobre el uso de cookies.</li>
                </ul>

                <h3>Cookies analíticas y de rendimiento</h3>
                <p>
                    Estas cookies nos permiten contar las visitas y las fuentes de tráfico para poder evaluar y mejorar el
                    rendimiento de nuestro sitio. Nos ayudan a saber qué páginas son las más y menos populares, y a ver cómo
                    los visitantes se mueven por el sitio. Toda la información que recogen estas cookies es agregada y, por lo tanto, anónima.
                </p>
                <p>
                    <em>Nota: Estas cookies solo se instalan si haces clic en "Aceptar Todas" en nuestro banner de cookies.</em>
                </p>

                <h2>3. Cómo controlar las cookies</h2>
                <p>
                    Además de nuestro banner de configuración de cookies, puedes administrar las cookies desde la configuración
                    de tu navegador web. La mayoría de los navegadores te permiten rechazar la configuración de todas o algunas
                    cookies, y eliminar las cookies que ya han sido configuradas.
                </p>
                <p>
                    Por favor ten en cuenta que restringir las cookies, especialmente las estrictamente necesarias, puede
                    afectar la funcionalidad de nuestro sitio y la experiencia de usuario (por ejemplo, no podrás mantener
                    productos en tu carrito).
                </p>

                <h2>4. Actualizaciones a esta política</h2>
                <p>
                    Podemos actualizar esta Política de Cookies de vez en cuando para reflejar, por ejemplo, cambios en
                    las cookies que utilizamos o por otros motivos operativos, legales o reglamentarios. Te recomendamos
                    visitar esta página regularmente para mantenerte informado sobre nuestro uso de cookies.
                </p>

                <h2>5. Dónde encontrar más información</h2>
                <p>
                    Para obtener más información sobre las cookies y cómo gestionarlas, puedes visitar sitios web como
                    <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mx-1">
                        allaboutcookies.org
                    </a>
                    o consultar la guía de la Agencia Española de Protección de Datos (AEPD).
                </p>

                <div className="mt-12 pt-8 border-t border-neutral-light">
                    <p>
                        Si tienes alguna pregunta sobre el uso que hacemos de las cookies o sobre tu privacidad en general,
                        consulta nuestra{' '}
                        <Link href="/politica-de-privacidad" className="text-primary hover:underline font-bold">
                            Política de Privacidad
                        </Link>
                        {' '}o envíanos un correo a info@relojesbvbeni.com.
                    </p>
                </div>
            </div>
        </div>
    )
}
