import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

afterEach(() => {
  cleanup()
})

/**
 * jsdom@27 exposes `window.localStorage` as a truthy empty stub `{}` with no
 * methods, so a truthy-guard polyfill would silently copy the broken stub and
 * break both `localStorage.*` and `window.localStorage.*` calls. Provide a real
 * in-memory WHATWG `Storage` instance shared by both globals instead.
 */
function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    key(i: number) {
      return Array.from(store.keys())[i] ?? null
    },
    getItem(k: string) {
      return store.get(String(k)) ?? null
    },
    setItem(k: string, v: string) {
      store.set(String(k), String(v))
    },
    removeItem(k: string) {
      store.delete(String(k))
    },
    clear() {
      store.clear()
    },
  } as Storage
}

const memoryStorage = createMemoryStorage()
Object.defineProperty(globalThis, 'localStorage', {
  value: memoryStorage,
  writable: true,
  configurable: true,
})
Object.defineProperty(window, 'localStorage', {
  value: memoryStorage,
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any