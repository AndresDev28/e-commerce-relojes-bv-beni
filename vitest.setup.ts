import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { loadEnvConfig } from '@next/env'

// Cargar variables de entorno de Next.js (.env.local, etc)
loadEnvConfig(process.cwd())

// Limpia el DOM después de cada test
afterEach(() => {
  cleanup()
})

// Mock de window.matchMedia (necesario para componentes responsive)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock de IntersectionObserver (si usas lazy loading)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any
