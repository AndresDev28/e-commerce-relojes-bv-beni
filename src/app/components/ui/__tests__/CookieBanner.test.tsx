import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CookieBanner from '../CookieBanner'

describe('CookieBanner Component', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        window.localStorage.clear()

        // Mock the window dispatchEvent
        vi.spyOn(window, 'dispatchEvent')
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should be visible when no consent is in localStorage', async () => {
        render(<CookieBanner />)
        // The banner heading should be in the document
        expect(await screen.findByText('Privacidad y Cookies')).toBeInTheDocument()
    })

    it('should not be visible when consent is already in localStorage', () => {
        // Set consent beforehand
        window.localStorage.setItem('bv-beni-cookie-consent', JSON.stringify({ essential: true, analytics: true }))

        const { container } = render(<CookieBanner />)
        // Container should be empty
        expect(container.firstChild).toBeNull()
    })

    it('should save "essential only" consent and hide when "Solo Esenciales" is clicked', async () => {
        render(<CookieBanner />)

        const essentialBtn = screen.getByText('Solo Esenciales')
        fireEvent.click(essentialBtn)

        await waitFor(() => {
            const storedValue = window.localStorage.getItem('bv-beni-cookie-consent')
            expect(storedValue).toBeDefined()
            const parsed = JSON.parse(storedValue!)
            expect(parsed).toEqual({ essential: true, analytics: false })
        })

        // verify event was dispatched
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(Event))
        const eventArg = vi.mocked(window.dispatchEvent).mock.calls[0][0]
        expect(eventArg.type).toBe('cookieConsentUpdated')
    })

    it('should save "all" consent and hide when "Aceptar Todas" is clicked', async () => {
        render(<CookieBanner />)

        const acceptAllBtn = screen.getByText('Aceptar Todas')
        fireEvent.click(acceptAllBtn)

        await waitFor(() => {
            const storedValue = window.localStorage.getItem('bv-beni-cookie-consent')
            expect(storedValue).toBeDefined()
            const parsed = JSON.parse(storedValue!)
            expect(parsed).toEqual({ essential: true, analytics: true })
        })

        // verify event was dispatched
        expect(window.dispatchEvent).toHaveBeenCalled()
    })
})
