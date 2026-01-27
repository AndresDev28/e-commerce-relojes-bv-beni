/**
 * Test Server Helper
 *
 * Utilidad para crear un servidor Next.js de prueba para integration tests.
 * Este servidor es real pero aislado, perfecto para testear API routes.
 */

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'

/**
 * TestServer encapsula una instancia de Next.js para testing
 */
export class TestServer {
  private server: any
  private port: number
  private app: any

  constructor(port: number = 3001) {
    this.port = port
  }

  /**
   * Inicia el servidor Next.js
   *
   * @returns Promise que resuelve cuando el servidor está listo
   */
  async start(): Promise<void> {
    console.log(`\n🚀 [Test Server] Starting Next.js on port ${this.port}...`)

    // Crear app Next.js en modo dev (para soportar API routes dinámicas)
    const dev = true
    const app = next({ dev, port: this.port })
    this.app = app

    // Preparar la app
    await app.prepare()

    // Crear servidor HTTP
    const handle = app.getRequestHandler()

    this.server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true)
        await handle(req, res, parsedUrl)
      } catch (err: any) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })

    // Escuchar en el puerto especificado
    await new Promise<void>((resolve, reject) => {
      this.server.once('error', reject)
      this.server.listen(this.port, () => {
        console.log(`  ✅ Test server ready at http://localhost:${this.port}`)
        resolve()
      })
    })
  }

  /**
   * Detiene el servidor Next.js
   */
  async stop(): Promise<void> {
    console.log(`\n🛑 [Test Server] Stopping server...`)

    if (this.server) {
      await new Promise<void>(resolve => {
        this.server.close(() => {
          console.log('  ✅ Test server stopped')
          resolve()
        })
      })
    }

    if (this.app) {
      await this.app.close()
    }
  }

  /**
   * Obtiene la URL base del servidor
   */
  getUrl(): string {
    return `http://localhost:${this.port}`
  }
}

/**
 * Crea e inicia un servidor de test
 *
 * @param port - Puerto donde correr (default: 3001)
 * @returns Instancia de TestServer
 *
 * @example
 * ```typescript
 * const server = await createTestServer(3001)
 * try {
 *   // Hacer requests al servidor...
 *   const response = await fetch(`${server.getUrl()}/api/send-order-email`)
 * } finally {
 *   await server.stop()
 * }
 * ```
 */
export async function createTestServer(port: number = 3001): Promise<TestServer> {
  const server = new TestServer(port)
  await server.start()
  return server
}
