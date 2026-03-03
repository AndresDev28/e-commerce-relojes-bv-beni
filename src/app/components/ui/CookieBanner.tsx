'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Check if user has already accepted or rejected cookies
        const consent = localStorage.getItem('bv-beni-cookie-consent')
        if (!consent) {
            setIsVisible(true)
        }
    }, [])

    const handleAcceptAll = () => {
        const consentData = { essential: true, analytics: true }
        localStorage.setItem('bv-beni-cookie-consent', JSON.stringify(consentData))
        setIsVisible(false)
        // Here you would trigger analytics script loading
        window.dispatchEvent(new Event('cookieConsentUpdated'))
    }

    const handleEssentialOnly = () => {
        const consentData = { essential: true, analytics: false }
        localStorage.setItem('bv-beni-cookie-consent', JSON.stringify(consentData))
        setIsVisible(false)
        // Here you would ensure analytics are disabled
        window.dispatchEvent(new Event('cookieConsentUpdated'))
    }

    if (!isVisible) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-dark text-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] animate-slide-up">
            <div className="container mx-auto max-w-7xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="text-sm font-sans flex-1 max-w-4xl">
                    <h3 className="font-bold text-base mb-2 font-oswald tracking-wide">Privacidad y Cookies</h3>
                    <p className="text-neutral-light leading-relaxed">
                        Utilizamos cookies propias y de terceros para mejorar nuestros servicios, personalizar el contenido,
                        analizar tu navegación y ofrecerte una experiencia fluida.
                        Puedes aceptar todas las cookies o limitar tu selección a las estrictamente necesarias.
                        Para más información, consulta nuestra{' '}
                        <Link href="/politica-de-cookies" className="underline text-primary hover:text-white transition-colors">
                            Política de Cookies
                        </Link>.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0 w-full lg:w-auto mt-2 lg:mt-0">
                    <button
                        onClick={handleEssentialOnly}
                        className="bg-transparent border border-neutral-light hover:border-white hover:text-white text-neutral-light px-5 py-2.5 rounded-md font-medium transition-colors whitespace-nowrap outline-none focus:ring-2 focus:ring-neutral-light"
                    >
                        Solo Esenciales
                    </button>
                    <button
                        onClick={handleAcceptAll}
                        className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-md font-bold transition-all shadow-md hover:shadow-lg whitespace-nowrap outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-neutral-dark"
                    >
                        Aceptar Todas
                    </button>
                </div>
            </div>
        </div>
    )
}
