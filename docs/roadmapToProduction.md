# 🚀 Roadmap to Production - E-commerce Relojes BV Beni

**Última actualización:** 13 Marzo 2026  
**Estado actual:** EPIC 17 + 17b + 18 completados ✅  
**Objetivo:** Lanzamiento 14 Abril 2026

---

## 📊 Estado Actual

### ✅ Completado hasta ahora:

**EPIC 15: Sistema de Gestión de Pedidos**
- ✅ UI completa de historial de pedidos
- ✅ Backend Strapi con modelos y relaciones
- ✅ Sistema de estados (pending, paid, processing, shipped, delivered, cancelled)
- ✅ Lifecycle hooks automáticos
- ✅ Notificaciones por email (Resend + React Email)
- ✅ Panel admin básico

**EPIC 16: Sistema de Cancelaciones y Reembolsos**
- ✅ Modelo de cancelación en Strapi
- ✅ Workflow de aprobación admin
- ✅ Validación 24 horas para cancelar
- ✅ Integración Stripe para reembolsos automáticos
- ✅ Emails de notificación (solicitado, aprobado, rechazado)
- ✅ UI cliente y admin

**EPIC 17: Sistema de Envíos y Tracking**
- ✅ Content-type Shipment en Strapi con relación a Order
- ✅ Lifecycle hooks: auto-crear Shipment al pasar Order a "shipped"
- ✅ Transición automática Order→delivered / Order→processing (failed)
- ✅ Emails de envío: "pedido enviado", "pedido entregado", "fallo en envío"
- ✅ Tests de integración para lifecycles y modelo Shipment
- ✅ Campo `shipmentStatus` (renombrado por conflicto con campo reservado Strapi v5)

**EPIC 17b: Hardening y Seguridad**
- ✅ Rate limiting en APIs críticas (middleware Edge Runtime)
- ✅ Headers de seguridad (CSP, HSTS, X-Frame-Options, X-XSS-Protection)
- ✅ Banner de consentimiento de cookies (granular: esenciales vs analytics)
- ✅ Páginas legales: Política de privacidad, Política de cookies
- ✅ Auditoría de secrets y `.env` en `.gitignore`
- ✅ Enmascaramiento de PII en logs (`maskPII.ts`)
- ✅ Tests: rate limiting, headers y compliance GDPR

**EPIC 18: Testing y Integración E2E (QA)**
- ✅ Suite Playwright configurada para Chromium y Firefox
- ✅ Happy path completo: registro → carrito → checkout → success
- ✅ Mobile Testing: checkout verificado en viewport de iPhone 13
- ✅ Verificación de estados vacíos (cesta y pedidos)
- ✅ Manejo de errores de API y fallos de pago
- ✅ Seguimiento y cancelación de pedidos verificado
- ✅ Cobertura de flujos críticos al 100% en navegadores compatibles

**Progreso general:** ~200h invertidas de ~240h estimadas (83%)

---

## 🗺️ Priorización para Lanzamiento

> [!IMPORTANT]
> Se prioriza estabilidad y funcionalidad core sobre features adicionales.
> EPIC 18 (Analytics) y features no esenciales se mueven a v2.0.

| Prioridad | Qué | Por qué |
|---|---|---|
| 🔴 Must | EPIC 17: Envíos (simplificado) | No puedes vender sin enviar |
| 🔴 Must | EPIC 17b: Hardening y Seguridad | Obligatorio para producción en España (GDPR) |
| 🔴 Must | Testing + QA | Estabilidad y confianza |
| 🔴 Must | Setup Producción + DNS | Infraestructura base |
| 🟡 Should | Contenidos + SEO | Crítico para tráfico orgánico |
| 🟡 Should | Soft Launch (7-14 días) | Reduce riesgo |
| 🟢 v2.0 | EPIC 19: Analytics Dashboard | Stripe Dashboard cubre MVP |
| 🟢 v2.0 | API transportistas automática | Manual funciona para MVP |

---

## ✅ EPIC 17: Sistema de Envíos y Tracking (Simplificado MVP) — COMPLETADO

**Objetivo:** Permitir que el admin registre envíos y que los clientes vean el tracking.

> [!NOTE]
> Para MVP: todo es manual. El admin introduce tracking number y cambia estados.
> La integración automática con transportistas queda para v2.0.

### 1. Backend - Modelo de Envío (Strapi)

**Crear estructura:**
- Content-type `Shipment` con relación a `Order`
- Campos: tracking_number, carrier, status, shipped_at, estimated_delivery, actual_delivery
- Estados simplificados: shipped, in_transit, delivered, failed
- Permissions para usuarios autenticados

**Validaciones:**
- Solo pedidos en estado "processing" pueden tener envío
- Tracking number único por pedido

### 2. Lógica de Transiciones

**Lifecycle hooks:**
- Cuando pedido pasa a "shipped" → crear Shipment automáticamente
- Actualizar estado de Order cuando Shipment cambia
- Emails automáticos: "enviado" y "entregado"

**Reglas de negocio:**
- Delivered → Order pasa a "delivered" automáticamente
- Failed delivery → Order vuelve a "processing"
- Tracking updates manuales (admin)

### 3. Frontend - UI de Tracking

**Para Cliente:**
- Sección de tracking dentro de `/mi-cuenta/pedidos/[orderId]`
- Timeline visual simplificado del estado del envío
- Información de transportista + tracking number (con enlace externo)
- Fecha estimada de entrega

**Para Admin (Strapi):**
- Formulario para agregar tracking number y carrier
- Actualización manual de estados desde el panel de Strapi

### 4. Emails de Envío (Esenciales)

**Plantillas MVP:**
- "Tu pedido ha sido enviado" (con tracking number y enlace)
- "Tu pedido ha sido entregado" (confirmación)

### 5. Testing del Sistema de Envíos

**Verificar:**
- Flujo completo: Order → Shipment → Delivered
- Transiciones de estado correctas
- Emails se envían correctamente
- UI muestra información correcta

**Resultado esperado:** Sistema de tracking manual funcional.  
**Estado:** ✅ Completado — 7 Marzo 2026

---

## ✅ EPIC 17b: Hardening y Seguridad — COMPLETADO

**Objetivo:** Asegurar que la aplicación cumple estándares de seguridad para producción.

> [!CAUTION]
> Esta sección es obligatoria antes del lanzamiento. España requiere cumplimiento GDPR/RGPD.

### 1. Rate Limiting

**APIs críticas:**
- Login/Register: máx 5 intentos/minuto
- Checkout/Payment: máx 10 req/minuto
- API general: máx 100 req/minuto por IP

### 2. Validación de Inputs

**Frontend + Backend:**
- Sanitización de inputs en formularios
- Validación de tipos de datos
- Protección contra XSS
- Protección contra SQL injection (Strapi maneja por defecto, verificar custom queries)

### 3. Cookies y GDPR

**Obligatorio en España:**
- Banner de consentimiento de cookies
- Política de privacidad (enlace visible)
- Política de cookies detallada
- Opción de rechazo de cookies no esenciales
- Registro de consentimiento

### 4. Headers de Seguridad

**Configurar:**
- HTTPS forzado everywhere
- CORS restrictivo (solo dominios propios)
- Content-Security-Policy
- X-Frame-Options
- Strict-Transport-Security (HSTS)

### 5. Auditoría de Secrets

**Verificar:**
- Ningún secret en repositorio (`.env` en `.gitignore`)
- Variables de entorno separadas: dev vs production
- API keys con permisos mínimos necesarios
- Stripe keys modo live aisladas

### 6. Protección de Datos Personales

**Cumplimiento RGPD:**
- Datos personales no en logs de debug (Global Rule #2)
- Cifrado en tránsito (SSL/TLS)
- Derecho de acceso y eliminación de datos (básico)
- Enmascaramiento de PII en respuestas API donde sea posible

**Resultado esperado:** Aplicación segura y conforme con regulaciones españolas.  
**Estado:** ✅ Completado — 9 Marzo 2026

---

## ✅ 🧪 Testing y QA — COMPLETADO

**Objetivo:** Asegurar que todo funciona correctamente antes de producción.

### 1. Testing Funcional

**Flujos principales:**
- Registro e inicio de sesión
- Navegación y búsqueda de productos
- Agregar al carrito
- Proceso de checkout completo
- Pago con Stripe
- Confirmación de pedido
- Ver historial de pedidos
- Solicitar cancelación
- Tracking de envío

**Estados y transiciones:**
- Todos los estados de pedido
- Todos los estados de cancelación
- Emails en cada transición

### 2. Testing de Integración

**Verificar:**
- Stripe payments (test mode → live mode)
- Emails (Resend en producción)
- Strapi ↔ Next.js comunicación
- Base de datos (PostgreSQL)

### 3. Testing de Performance

**Lighthouse audits:**
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >90

**Load testing básico:**
- 50 usuarios concurrentes
- Tiempo de respuesta < 2s

### 4. Testing Cross-Browser

**Navegadores:**
- Chrome (desktop/mobile)
- Safari (desktop/mobile)
- Firefox (desktop)
- Edge (desktop)

**Dispositivos:**
- Desktop 1920x1080
- Laptop 1366x768
- Tablet 768x1024
- Mobile 375x667

### 5. Testing de Seguridad

**Verificar:**
- Autenticación funciona correctamente
- Protección de rutas privadas
- Validación de inputs (frontend + backend)
- Rate limiting en APIs críticas
- HTTPS everywhere
- Secrets no expuestos
- CORS configurado correctamente

### 6. Testing E2E

**Playwright tests:**
- Happy path completo (registro → compra → tracking)
- Edge cases
- Error handling
- Recovery flows

**Resultado esperado:** Cobertura >80% en flujos críticos, 100% tests passing en Chromium/Firefox.
**Estado:** ✅ Completado — 13 Marzo 2026

---

## 📦 Preparación de Contenidos

**Objetivo:** Migrar contenido de la web actual a la nueva.

### 1. Productos

**Migrar desde web vieja:**
- Información completa de productos
- Imágenes optimizadas (WebP)
- Precios actualizados
- Stock (si aplica)
- Descripciones SEO-friendly

**Verificar:**
- URLs amigables
- Metadata correcta
- Imágenes responsive

### 2. Páginas Institucionales

**Crear/actualizar:**
- Sobre nosotros
- Política de privacidad (obligatorio GDPR)
- Términos y condiciones
- Política de envíos
- Política de devoluciones
- FAQ
- Contacto

### 3. SEO

**Configurar:**
- Redirects 301 de URLs viejas
- Sitemap.xml actualizado
- robots.txt configurado
- Google Search Console
- Google Analytics
- Schema markup (productos)

**Resultado esperado:** Todo el contenido migrado y optimizado.

---

## 🏗️ Setup de Producción

**Objetivo:** Preparar infraestructura para el lanzamiento.

> [!TIP]
> Configurar DNS 3-4 días antes del soft launch para que la propagación esté lista.

### 1. Backend - Railway

**Deploy Strapi:**
- Crear proyecto en Railway
- Configurar PostgreSQL database
- Variables de entorno de producción
- Cloudinary para media
- Configurar dominio: api.relojesbvbeni.com
- SSL automático

**Testing:**
- Verificar todas las APIs funcionan
- Comprobar uploads de imágenes
- Verificar emails se envían
- Testing de performance

### 2. Frontend - Vercel

**Deploy Next.js:**
- Proyecto ya está en Vercel
- Variables de entorno de producción
- Configurar dominio: relojesbvbeni.com
- SSL automático
- Edge functions configuradas

**Optimizaciones:**
- Image optimization habilitado
- Caching estratégico
- Preview deployments configurados

### 3. Base de Datos

**PostgreSQL en Railway:**
- Backups automáticos configurados
- Conexión segura (SSL)
- Monitoring activo
- Plan adecuado para tráfico esperado

### 4. DNS y Dominios

**Configurar en Abansys (3-4 días antes del soft launch):**
- A record para relojesbvbeni.com → Vercel
- CNAME para api.relojesbvbeni.com → Railway
- CNAME para www.relojesbvbeni.com → Vercel
- MX records para email (Zoho - después del lanzamiento)

**Verificar:**
- Propagación DNS completa (24-48h)
- SSL válido en ambos dominios
- Redirecciones www → non-www

### 5. Email - Zoho Mail

**Configuración básica:**
- Crear cuenta en Zoho
- Configurar dominio
- Crear buzón: info@relojesbvbeni.com
- Configurar en Resend como "from" email

**Testing:**
- Enviar email de prueba
- Recibir email de prueba
- Verificar no va a spam

### 6. Servicios Externos

**Stripe:**
- Activar modo Live
- Configurar Webhooks de producción
- Testing con tarjeta real (modo test → live)
- Configurar taxes (si aplica)

**Resend:**
- Verificar dominio en producción
- Configurar "from" con dominio propio
- Testing de emails en producción

**Cloudinary:**
- Verificar plan suficiente
- Configurar límites
- Backups habilitados

### 7. Monitoring y Logs

**Configurar:**
- Vercel Analytics
- Railway logs
- Sentry para errores (opcional)
- Uptime monitoring (UptimeRobot o similar)

**Alerts:**
- Downtime alerts
- Error rate alerts
- Performance degradation

**Resultado esperado:** Infraestructura completa y funcional en producción.

---

## 🎬 Soft Launch

**Objetivo:** Lanzamiento controlado para detectar issues antes del lanzamiento público.

### 1. Preparación

**Checklist pre-soft launch:**
- [ ] Todos los tests passing
- [ ] Infraestructura de producción verificada
- [ ] Backups configurados
- [ ] Monitoring activo
- [ ] Stripe en modo live (testeado)
- [ ] Emails funcionando desde dominio propio
- [ ] GDPR/Cookies compliance verificado

### 2. Grupo Beta

**Invitar a 10-20 personas:**
- Círculo cercano (amigos, familia)
- Usuarios clave (clientes recurrentes de la web vieja)
- Beta testers voluntarios

**Comunicación:**
- Email de invitación
- Explicar que es beta
- Pedir feedback específico
- Ofrecer descuento/incentivo

### 3. Monitoreo Intensivo

**Durante soft launch (7-14 días):**
- Revisar logs diariamente
- Monitorear errores en tiempo real
- Observar métricas de uso
- Recopilar feedback activamente

### 4. Iteración Rápida

**Fixes prioritarios:**
- Bugs críticos → Fix inmediato
- Issues de UX → Ajustar rápido
- Problemas de performance → Optimizar
- Feedback de features → Evaluar para v2.0

### 5. Comunicación con Beta Testers

**Updates regulares:**
- Agradecer feedback
- Comunicar fixes implementados
- Pedir re-testing de issues resueltos
- Mantener canal abierto (email, WhatsApp group)

**Resultado esperado:** App estable, bugs críticos resueltos, feedback incorporado.

---

## 🚀 Lanzamiento Oficial

**Objetivo:** Hacer la web pública y comenzar operación normal.

### 1. Pre-Lanzamiento (1 semana antes)

**Comunicación:**
- Email a base de clientes existentes
- Posts en redes sociales (teaser)
- Actualizar web vieja con anuncio
- Preparar materiales de marketing

**Verificaciones finales:**
- Testing completo de nuevo
- Backups recientes
- Plan de rollback preparado
- Equipo (Diego) informado

### 2. Día del Lanzamiento

**Secuencia:**
- Verificar DNS y SSL al 100%
- Anuncio en redes sociales
- Email de lanzamiento a clientes
- Press release (si aplica)
- Monitoring 24/7 primeras 48h

**Disponibilidad:**
- Estar disponible para hotfixes
- Monitorear constantemente
- Responder feedback rápido

### 3. Post-Lanzamiento Inmediato (Primera semana)

**Monitoreo:**
- Logs cada 2-4 horas
- Métricas de uso diarias (Vercel Analytics + Stripe Dashboard)
- Performance checks
- Feedback de usuarios

**Comunicación:**
- Agradecer early adopters
- Responder comentarios/reviews
- Compartir hitos (primeras ventas, usuarios)

**Fixes:**
- Issues menores → Schedule para próxima semana
- Issues críticos → Fix inmediato
- Mejoras UX → Backlog priorizado

### 4. Celebración 🎉

**Reconocer el logro:**
- Tomar un respiro
- Celebrar con Diego y círculo cercano
- Documentar el proceso
- Agradecer a quienes ayudaron

**Resultado esperado:** Lanzamiento exitoso, operación estable.

---

## 📈 Post-Lanzamiento (Primeras 4 semanas)

**Objetivo:** Estabilización y optimización inicial.

### 1. Optimización Continua

**Análisis de métricas (Vercel Analytics + Stripe Dashboard):**
- Tráfico y conversión
- Páginas más visitadas
- Puntos de abandono (funnel)
- Productos más vistos/vendidos
- Performance real

**Iteraciones:**
- Optimizar páginas con alto abandono
- Mejorar descripciones de productos con pocas ventas
- Ajustar precios si es necesario
- Mejorar imágenes poco atractivas

### 2. Recopilar Feedback

**Canales:**
- Email post-compra
- Encuestas de satisfacción
- Reviews de productos
- Comentarios en redes sociales
- Contacto directo

**Priorizar:**
- Issues recurrentes
- Quick wins (mejoras fáciles con alto impacto)
- Features más solicitadas → v2.0

### 3. Marketing y Crecimiento

**SEO:**
- Monitorear posicionamiento
- Crear contenido relevante (blog)
- Link building básico
- Optimizar según analytics

**Social Media:**
- Posts regulares
- Engagement con audiencia
- User-generated content
- Promociones/descuentos

**Email Marketing:**
- Newsletter mensual
- Promociones especiales

### 4. Migración Final de Email

**Después de 2-4 semanas:**
- Migrar completamente a Zoho
- Cancelar hosting viejo (Hostytec)
- Activar ahorro de 61€/año
- Documentar nuevo setup

### 5. Mantenimiento Regular

**Rutinas establecidas:**

**Semanal:**
- Review de métricas
- Responder feedback usuarios
- Pequeñas mejoras UX

**Mensual:**
- Análisis profundo de ventas
- Optimización de productos
- Review de seguridad
- Updates de dependencias

**Trimestral:**
- Planning de nuevas features
- Review de infraestructura
- Optimización de costos
- Audit de performance y SEO

### 6. Documentación

**Crear/actualizar:**
- Manual de operaciones para Diego
- Guía de troubleshooting común
- Documentación técnica
- Lessons learned

**Resultado esperado:** Sistema estable, optimización continua, negocio saludable.

---

## 🔮 v2.0 — Post-Lanzamiento

> [!NOTE]
> Estas features se implementarán después del lanzamiento, priorizadas por impacto en ventas y feedback de usuarios reales.

### EPIC 19: Analytics Dashboard Admin

**Objetivo:** Dar visibilidad completa del negocio al admin (más allá de Stripe Dashboard).

**Métricas:**
- Total de ventas (día/semana/mes/año)
- Número de pedidos y ticket promedio
- Estado de pedidos (overview)
- Top 10 productos vendidos
- Nuevos clientes por período
- Clientes recurrentes

**Visualizaciones:**
- Gráficos de ventas (Recharts o Chart.js)
- Comparativas por período
- Tendencias

**Exports:**
- CSV de pedidos y ventas
- Filtros por fecha
- Reportes mensuales automáticos

---

### Integración Automática con Transportistas

**Objetivo:** Automatizar el tracking sin intervención manual del admin.

**Implementar:**
- API de transportista principal (Correos, SEUR, etc.)
- Actualización automática de estados vía webhook
- Fallback a manual si API falla
- Emails intermedios: "en camino", "llega hoy"

---

### Email Marketing Avanzado

**Implementar:**
- Recuperación de carritos abandonados
- Re-engagement de usuarios inactivos
- Segmentación de audiencia
- Automatizaciones basadas en comportamiento

---

### Features de Producto

**Backlog priorizado por impacto:**
- Wishlist de productos
- Reviews de clientes
- Comparador de productos
- Recomendaciones personalizadas
- Programa de fidelización
- Notificaciones push
- Chat de soporte

**Priorización:**
- Por impacto en ventas
- Por facilidad de implementación
- Por feedback de usuarios reales

---

## 🎯 Checklist Ejecutivo

### Pre-Producción (Must Have)

- [x] EPIC 17: Sistema de envíos simplificado (manual)
- [x] EPIC 17b: Hardening y seguridad (GDPR, rate limiting, headers)
- [x] EPIC 18: Testing e Integración E2E (QA)
- [ ] Contenidos migrados y optimizados
- [ ] SEO configurado (redirects, sitemap, analytics)

### Infraestructura

- [ ] Backend en Railway funcionando
- [ ] Frontend en Vercel optimizado
- [ ] DNS configurado correctamente (3-4 días antes del soft launch)
- [ ] SSL válido en ambos dominios
- [ ] Backups automáticos configurados
- [ ] Monitoring activo

### Servicios

- [ ] Stripe en modo live y testeado
- [ ] Emails desde dominio propio (Zoho + Resend)
- [ ] Cloudinary configurado
- [ ] Todos los webhooks funcionando

### Lanzamiento

- [ ] Soft launch completado (7-14 días)
- [ ] Feedback incorporado
- [ ] GDPR compliance verificado
- [ ] Comunicación preparada
- [ ] Lanzamiento oficial ejecutado
- [ ] Primeras 48h monitoreadas intensivamente

### Post-Lanzamiento

- [ ] Optimización continua primeras 4 semanas
- [ ] Email migrado completamente a Zoho
- [ ] Hosting viejo cancelado
- [ ] Documentación completa
- [ ] Roadmap v2.0 priorizado con datos reales

---

## 📝 Notas Finales

**Principios para las últimas semanas:**

1. **Priorizar estabilidad sobre features**: Mejor lanzar con menos features pero todo funcional.

2. **Testing no es opcional**: Invertir tiempo en testing ahora evita problemas después.

3. **Documentar todo**: Tu yo del futuro (y Diego) te lo agradecerán.

4. **Backups, backups, backups**: Antes de cualquier cambio en producción.

5. **Comunicación clara**: Con Diego, con usuarios beta, con clientes.

6. **Celebrar pequeños wins**: Cada EPIC completado, cada milestone alcanzado.

7. **Pedir ayuda cuando sea necesario**: Community, mentores, documentación.

8. **Iterar después del lanzamiento**: No todo tiene que ser perfecto el día 1. Para eso existe v2.0.

**El lanzamiento no es el final, es el comienzo.** 🚀

---

**Última actualización:** 9 Marzo 2026  
**Próxima revisión:** Al completar Testing + QA y Setup de Producción  
**Contacto:** Andrés | andresjpadev@gmail.com