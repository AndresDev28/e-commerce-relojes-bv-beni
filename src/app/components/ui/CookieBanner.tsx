'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Check if user has already accepted cookies
        const consent = localStorage.getItem('bv-beni-cookie-consent')
        if (!consent) {
            setIsVisible(true)
        }
    }, [])

    const acceptCookies = () => {
        localStorage.setItem('bv-beni-cookie-consent', 'accepted')
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-dark text-white p-4 shadow-xl">
            <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm font-sans flex-1">
                    <p>
                        Utilizamos cookies propias y de terceros para mejorar nuestros servicios, analizar tu navegación y ofrecerte una mejor experiencia.
                        Al continuar navegando o al hacer clic en &quot;Aceptar&quot;, consientes el uso de cookies.
                        Puedes leer más en nuestra{' '}
                        <Link href="/politica-de-privacidad" className="underline text-primary hover:text-white transition-colors">
                            Política de Privacidad
                        </Link>.
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <button
                        onClick={acceptCookies}
                        className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-md font-bold transition-colors whitespace-nowrap outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-neutral-dark"
                    >
                        Aceptar Cookies
                    </button>
                </div>
            </div>
        </div>
    )
}
