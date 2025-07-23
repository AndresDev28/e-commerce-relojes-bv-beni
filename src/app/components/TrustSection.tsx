const TrustSection = () => {
  return (
    <section className="bg-radial-dark text-light py-20 md:py-32">
      <div className="countainer mx-auto px-4 text-center max-w-3xl">
        <h2 className="text-3xl md:text-4xl font bold font-sans mb-4">
          Un Legado de Confianza
        </h2>
        <p className="text-lg md:text-xl font-serif text-neutral-light leading-relaxed">
          Desde 1990, hemos compartido nuestra pasión por la relojería,
          ofreciendo no solo productos excepcionales, sino una experiencia
          basada en la confianza y el conocimiento. Cada reloj que vendemos es
          una promesa de calidad y un compromiso con tu satisfacción.
        </p>
      </div>
    </section>
  )
}

export default TrustSection

/** bg-dark text-light: Volvemos al fondo oscuro para crear un "sandwich" visual (oscuro-claro-oscuro) y hacer que esta sección se sienta especial.

    text-center: Centramos todo el contenido.

    max-w-3xl: Muy importante. Limitamos el ancho máximo del texto. Los párrafos muy anchos son difíciles de leer. Esto mejora la legibilidad enormemente.

    font-serif: Usamos la fuente serif (Lora) para el párrafo para darle un toque más personal, narrativo y elegante, diferenciándolo del resto de la web. */
