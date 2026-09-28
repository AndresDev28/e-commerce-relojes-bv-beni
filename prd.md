# PRD — E-commerce Relojes BV Beni

## 1. Resumen Ejecutivo

BV Beni es una empresa de relojería con **25 años de trayectoria** (desde 1990). Esta iniciativa digitaliza el canal de ventas directo al consumidor mediante una plataforma e-commerce moderna con pagos seguros con tarjeta de crédito/débito a través de Stripe.

El producto es una **SPA + SSR construida en Next.js 15** que combina una experiencia de compra fluida con un panel administrativo (Strapi) para gestión de pedidos, envíos y devoluciones. La plataforma apunta a reemplazar el flujo de venta actual (presencial + WhatsApp + email) por un canal autoservicio 24/7.

## 2. Problema

- El proceso de venta actual es 100% manual (presencial + WhatsApp + email), limitando el alcance geográfico y horario de atención.
- No existe un canal autoservicio para clientes recurrentes que quieren comprar sin iniciar una conversación.
- La gestión de pedidos se hace en hojas de cálculo compartidas, propensa a errores y sin trazabilidad.
- No hay integración entre el cobro (terminal física) y el inventario.
- Clientes internacionales no pueden comprar sin contactar vía email y hacer transferencia internacional.

## 3. Usuarios Target

- **Cliente final (B2C)**: residentes en España, 30–65 años, buscan relojes de marca con garantía. Valoran la confianza (marca con 25 años), la facilidad de pago y el seguimiento del pedido. Idioma: español. Moneda: EUR.
- **Administrador de la tienda**: personal de BV Beni, ~3 personas. Gestionan inventario en Strapi, cambian estados de pedidos, registran envíos, procesan cancelaciones y devoluciones. Acceso vía panel Strapi (no necesitan custom UI).

## 4. Stack Técnico

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS, arquitectura Screaming/Atomic Design
- **Backend**: Strapi (Headless CMS) con endpoints REST custom + lifecycle hooks
- **Pasarela de pagos**: Stripe (Payment Intent + 3DS + webhooks)
- **Email transaccional**: Resend + React Email
- **Testing**: Vitest (unit + integration), Playwright (E2E)
- **Despliegue**: Vercel (frontend), Railway (backend), Cloudflare (DNS)
- **Desarrollo local**: ngrok (HTTPS tunnel para CORS-over-tunnel)
- **Gestión de imágenes**: Cloudinary (upload + transformaciones)

## 5. MVP — Alcance Funcional

### ✅ Funcionalidades implementadas (Sprint 1–5 cerrados)

**Catálogo y compra**:
- Catálogo de productos con paginación, filtros por marca/género, búsqueda
- Carrito persistente (localStorage + hidratación backend)
- Checkout seguro con Stripe Elements (tokenización, nunca PCI-sensitive data en backend)
- Confirmación de pedido con redirect a `/order-confirmation?orderId=...`
- Flujo de pago end-to-end con manejo robusto de errores (retry bounded, exponential backoff, mapping de errores Stripe a friendly Spanish copy)
- Validación de sesión y redirect a `/login?redirect=...` si guest

**Gestión de pedidos**:
- Historial de pedidos del cliente (`/mi-cuenta/pedidos`) con paginación
- Detalle de pedido con timeline visual de estado
- Solicitud de cancelación con validación de estado (terminal 409 si post-convergencia)
- Email transaccional de confirmación, envío, entrega, cancelación
- Admin puede cambiar estado (Pendiente → En preparación → Enviado → Entregado)

**Envíos** (EPIC 17):
- Registro de envío con tracking number, carrier, fecha estimada
- Página de tracking visible al cliente (`/mi-cuenta/pedidos/[orderId]`)
- Emails de "enviado" y "entregado"

**Seguridad y cumplimiento** (EPIC 17):
- HTTPS forzado (HSTS) en producción
- Rate limiting en login/checkout/register
- Headers de seguridad (CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff)
- Banner de cookies GDPR con persistencia de preferencia (Aceptar todas / Solo esenciales)
- Páginas legales: Política de Privacidad, Política de Cookies, Términos y Condiciones
- PII protection en logs (no se loggean emails, direcciones, números de tarjeta)

**QA** (EPIC 18):
- Suite Playwright con mocks robustos para Strapi y Stripe
- Tests E2E para happy path, mobile, post-compra, resiliencia
- Triple gate CI: vitest + tsc + build
- X-Trace-Id en todas las API calls para trazabilidad end-to-end

### Métricas de éxito (estado actual)

| Métrica | Target | Estado Actual |
|---------|--------|---------------|
| Tasa de conversión checkout | > 70% | En medición (post-lanzamiento) |
| Tiempo promedio de checkout | < 2 min | En medición |
| Tasa de error en pagos | < 5% | < 1% (Sprint 5: error mapping completo) |
| Coverage de tests | > 80% | ✅ > 80% |
| Tests pasando | 100% | ✅ **1157 / 1158 (99.91%)** — el 1 failure es S1 flake pre-existente documentado |

## 6. Fuera de Alcance (MVP)

- Carrito cross-device sync (sólo localStorage en MVP)
- Wishlist / favoritos persistentes (UI existe pero backend no persistido)
- Reseñas y ratings de productos
- Sistema de cupones y descuentos
- Integración con APIs de transportistas (tracking manual en MVP)
- Multi-idioma (sólo español en MVP)
- Multi-moneda (sólo EUR)
- Programa de fidelización / puntos
- Marketplace para terceros

## 7. Roadmap (post-MVP)

- **EPIC 19**: Dashboard de analytics (ventas, conversión, cohortes, LTV)
- **EPIC 20**: Integración con APIs de transportistas (Correos, SEUR, MRW) — tracking automático
- **EPIC 21**: Sistema de devoluciones automatizado con etiqueta de envío pre-pagada
- **EPIC 22**: Búsqueda avanzada con Elasticsearch / Algolia (full-text, facetas)
- **EPIC 23**: Notificaciones push (web push + email avanzado)
- **EPIC 24**: Programa de fidelización con puntos y descuentos por nivel

## 8. Non-Functional Requirements

- **Performance**: Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- **Seguridad**: PCI DSS compliance delegado a Stripe Elements (no almacenamos PAN), HTTPS obligatorio en producción, secrets sólo en variables de entorno (nunca en código)
- **Accesibilidad**: WCAG 2.1 AA target (roles ARIA, focus management, contraste)
- **Disponibilidad**: 99.5% uptime en producción
- **Escalabilidad**: hasta 1000 órdenes/día sin degradación
- **Observabilidad**: X-Trace-Id en cada request, logs estructurados, métricas de error rate

## 9. Constraints

- **PCI Compliance**: números de tarjeta nunca tocan el backend (tokenización via Stripe Elements)
- **Regulatorio**: RGPD + LSSI-CE (España), protección de datos personales de clientes
- **Negocio**: marca BV Beni con 25 años de reputación; la plataforma debe transmitir profesionalismo y confianza
- **Técnico**: sistema legacy de inventario en Strapi (no migrable a otro CMS en MVP)

## 10. Métricas de Validación Post-Lanzamiento

| Métrica | Target Mes 1 | Target Mes 3 | Target Mes 6 |
|---------|--------------|--------------|--------------|
| Órdenes/día | 5 | 15 | 30 |
| Tasa de conversión | 1.5% | 2.5% | 3.5% |
| Ticket promedio | 250€ | 280€ | 300€ |
| NPS clientes | > 40 | > 50 | > 60 |
| Tasa de abandono carrito | < 75% | < 65% | < 55% |
| Tiempo medio de gestión admin/pedido | < 5 min | < 3 min | < 2 min |

---

## Documentos relacionados

- **Detalle completo de historias de usuario, criterios de aceptación y tareas técnicas**: [`docs/requirements.md`](docs/requirements.md)
- **Canonical specs por capacidad (contratos técnicos exactos)**: [`openspec/specs/`](openspec/specs/)
  - `checkout-error-display/` — manejo de errores de pago (Sprint 5)
  - `checkout-confirmation-redirect/` — race condition post-Stripe (Sprint 5 F-series)
  - `catalog-bff-proxy/` — CORS-over-ngrok (Sprint 5)
- **Reglas del proyecto**: [`AGENT.md`](AGENT.md)
- **Sprints cerrados**: [`openspec/changes/archive/`](openspec/changes/archive/)

---

**Versión**: 1.0 — 2026-09-28 (post-Sprint 5 cleanup)
**Estado**: MVP técnico cerrado. Pendiente lanzamiento comercial + medición de métricas post-lanzamiento.
