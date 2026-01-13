# [ORD-22] Implementación de Lifecycle Hooks en Strapi

**Epic:** EPIC-15 - Order Management System
**Branch:** `EPIC-15/ORD-22`
**Fecha de planificación:** 2026-01-10
**Estado:** 📋 Planning

---

## 🎯 Objetivo

Implementar lifecycle hooks en Strapi para enviar notificaciones automáticas por email cuando el estado de una orden cambia, completando el flujo de comunicación con el cliente.

---

## 📊 Contexto

### Estado Actual

**✅ Completado:**
- [ORD-19] Lógica de fechas estimadas de entrega
- [ORD-20] Sistema de notificaciones con Resend configurado
- [ORD-21] React Email templates implementados

**🔗 Arquitectura existente:**
```
Frontend (Next.js) → API Route /api/send-order-email → Resend → Cliente
```

**❌ Faltante:**
```
Strapi Order Model → Lifecycle Hook → Next.js API Route
```

### Flujo Completo Objetivo

```
┌─────────────────────┐
│   Admin/Sistema     │
│   actualiza estado  │
│   de orden          │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Strapi Order       │
│  afterUpdate hook   │ ← [ORD-22] IMPLEMENTAR AQUÍ
│                     │
│  1. Detecta cambio  │
│  2. Valida estado   │
│  3. Prepara payload │
│  4. Llama webhook   │
└──────────┬──────────┘
           │
           ↓ HTTP POST
           │ X-Webhook-Secret: xxx
           │
┌─────────────────────┐
│  Next.js API        │
│  /api/send-order-   │
│  email              │ ← [ORD-20] ✅ YA IMPLEMENTADO
│                     │
│  1. Valida secret   │
│  2. Genera template │
│  3. Envía a Resend  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│     Resend          │
│  Email Service      │ ← [ORD-20] ✅ YA CONFIGURADO
└──────────┬──────────┘
           │
           ↓
     📧 Cliente
```

---

## 🗂️ Estructura del Proyecto Strapi

### Archivos Clave

```
/Users/andresperezandreiev/repos/personal-projects/relojes-bv-beni-api/
├── .env.example                    # ← ACTUALIZAR: agregar variables de webhook
├── .env                            # ← CONFIGURAR: agregar valores reales
├── src/
│   └── api/
│       └── order/
│           ├── content-types/
│           │   └── order/
│           │       ├── schema.json           # ✅ Schema del modelo Order
│           │       └── lifecycles.ts         # ← IMPLEMENTAR: afterUpdate hook
│           ├── controllers/order.ts          # (No se modifica)
│           ├── services/order.ts             # (No se modifica)
│           └── routes/order.ts               # (No se modifica)
```

### Modelo Order (Schema actual)

```json
{
  "attributes": {
    "orderId": "string (unique, required)",
    "items": "json (required)",
    "subtotal": "decimal (required)",
    "shipping": "decimal (required)",
    "total": "decimal (required)",
    "orderStatus": "enumeration (required)",
    "paymentIntentId": "string",
    "user": "relation (manyToOne → users-permissions.user)",
    "paymentInfo": "json",
    "shippedAt": "date",
    "deliveredAt": "date"
  }
}
```

**Estados de orden (enum):**
- `pending` - Esperando pago
- `paid` - Pago confirmado
- `processing` - Siendo preparado
- `shipped` - Enviado
- `delivered` - Entregado
- `cancelled` - Cancelado
- `refunded` - Reembolsado

---

## 🔧 Plan de Implementación

### Fase 1: Configuración de Variables de Entorno

#### 1.1 Actualizar `.env.example` en Strapi

**Archivo:** `/relojes-bv-beni-api/.env.example`

**Agregar al final:**
```bash
# ===========================================
# EMAIL WEBHOOK CONFIGURATION (ORD-22)
# ===========================================
# Webhook for Next.js email notifications
# Generate secret: openssl rand -base64 32

# URL of Next.js frontend API
# Development: http://localhost:3000
# Production: https://your-nextjs-app.vercel.app
FRONTEND_URL=http://localhost:3000

# Shared secret for webhook authentication
# IMPORTANT: Must match WEBHOOK_SECRET in Next.js .env.local
# Minimum 32 characters recommended
WEBHOOK_SECRET=your-webhook-secret-here-min-32-chars

# Optional: Disable email notifications (for testing)
# DISABLE_EMAIL_NOTIFICATIONS=true
```

#### 1.2 Configurar `.env` en Strapi

**Archivo:** `/relojes-bv-beni-api/.env`

**Agregar valores reales:**
```bash
# Email Webhook Configuration
FRONTEND_URL=http://localhost:3000
WEBHOOK_SECRET=<copiar desde Next.js .env.local>
```

**⚠️ IMPORTANTE:**
- El `WEBHOOK_SECRET` debe ser **exactamente el mismo** que en Next.js
- En producción, `FRONTEND_URL` debe ser la URL de Vercel (HTTPS)
- Para generar un secret seguro: `openssl rand -base64 32`

---

### Fase 2: Implementar Lifecycle Hook `afterUpdate`

#### 2.1 Archivo a modificar

**Ubicación:** `/relojes-bv-beni-api/src/api/order/content-types/order/lifecycles.ts`

#### 2.2 Funcionalidad Requerida

El hook debe:
1. ✅ Detectar cuando cambia el campo `orderStatus`
2. ✅ Obtener el email del usuario asociado a la orden
3. ✅ Construir el payload con todos los datos necesarios
4. ✅ Llamar al endpoint de Next.js con autenticación
5. ✅ Manejar errores sin bloquear la actualización de la orden
6. ✅ Agregar logs detallados para debugging

#### 2.3 Implementación Propuesta

```typescript
/**
 * Order lifecycle hooks
 *
 * [ORD-22] Email notifications on order status changes
 *
 * Hooks:
 * - beforeCreate: Assigns authenticated user to new orders (existing)
 * - afterUpdate: Sends email when order status changes (NEW)
 */

export default {
  /**
   * beforeCreate hook
   * Assigns the authenticated user to new orders
   * (Existing - no changes)
   */
  async beforeCreate(event) {
    const { data } = event.params;

    const ctx = strapi.requestContext.get();

    if (ctx?.state?.user?.id) {
      data.user = {
        connect: [ctx.state.user.id]
      };

      strapi.log.info(`Order lifecycle: Assigning user ${ctx.state.user.id} to new order`);
    } else {
      strapi.log.warn('Order lifecycle: No authenticated user found in request context');
    }
  },

  /**
   * afterUpdate hook
   * [ORD-22] Sends email notification when order status changes
   */
  async afterUpdate(event) {
    const { result, params } = event;

    try {
      // 1. Check if email notifications are enabled
      const emailNotificationsDisabled = process.env.DISABLE_EMAIL_NOTIFICATIONS === 'true';
      if (emailNotificationsDisabled) {
        strapi.log.info('[ORD-22] Email notifications disabled via env var');
        return;
      }

      // 2. Check if orderStatus changed
      const previousData = params.data;
      const newStatus = result.orderStatus;
      const oldStatus = previousData?.orderStatus;

      if (!oldStatus || newStatus === oldStatus) {
        strapi.log.debug(`[ORD-22] Order ${result.orderId}: Status unchanged (${newStatus}), skipping email`);
        return;
      }

      strapi.log.info(`[ORD-22] Order ${result.orderId}: Status changed ${oldStatus} → ${newStatus}`);

      // 3. Get user email
      // Important: Need to populate user relation to get email
      const order = await strapi.entityService.findOne('api::order.order', result.id, {
        populate: ['user'],
      });

      if (!order?.user?.email) {
        strapi.log.error(`[ORD-22] Order ${result.orderId}: No user email found, cannot send notification`);
        return;
      }

      const customerEmail = order.user.email;
      const customerName = order.user.username; // or firstName if available

      strapi.log.info(`[ORD-22] Order ${result.orderId}: Sending email to ${customerEmail}`);

      // 4. Prepare webhook payload
      const payload = {
        orderId: result.orderId,
        customerEmail,
        customerName,
        orderStatus: newStatus,
        orderData: {
          items: result.items,
          subtotal: parseFloat(result.subtotal),
          shipping: parseFloat(result.shipping),
          total: parseFloat(result.total),
          createdAt: result.createdAt,
        },
      };

      // 5. Call Next.js webhook
      const frontendUrl = process.env.FRONTEND_URL;
      const webhookSecret = process.env.WEBHOOK_SECRET;

      if (!frontendUrl || !webhookSecret) {
        strapi.log.error('[ORD-22] Missing FRONTEND_URL or WEBHOOK_SECRET env vars');
        return;
      }

      const webhookUrl = `${frontendUrl}/api/send-order-email`;

      strapi.log.debug(`[ORD-22] Calling webhook: ${webhookUrl}`);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhookSecret,
        },
        body: JSON.stringify(payload),
      });

      // 6. Handle response
      const responseData = await response.json();

      if (response.ok) {
        strapi.log.info(`[ORD-22] ✅ Email sent successfully for order ${result.orderId}`);
      } else {
        strapi.log.error(`[ORD-22] ❌ Email sending failed for order ${result.orderId}:`, {
          status: response.status,
          error: responseData,
        });
      }

    } catch (error) {
      // 7. Error handling - NEVER throw, just log
      // Emails are notifications, not critical operations
      // Order update must succeed even if email fails
      strapi.log.error(`[ORD-22] Exception in afterUpdate hook:`, {
        orderId: result?.orderId,
        error: error.message,
        stack: error.stack,
      });
    }
  },
};
```

#### 2.4 Decisiones de Arquitectura

##### ¿Por qué NO lanzar error si el email falla?

**Decisión:** Log error pero continuar (return 200)

**Razón:**
- Los emails son **notificaciones**, no parte crítica del flujo
- La orden debe actualizarse aunque el email falle
- Mejor UX: admin puede ver el pedido actualizado aunque no se envíe email
- Futuro: botón "Reenviar email" en admin (ORD-25)

##### ¿Por qué usar `entityService.findOne` para obtener el usuario?

**Decisión:** Re-fetch con populate

**Razón:**
- Strapi v5 no popula relaciones automáticamente en lifecycle hooks
- `event.result` no incluye datos de usuario
- Necesitamos el email del usuario para enviar la notificación

##### ¿Por qué validar `DISABLE_EMAIL_NOTIFICATIONS`?

**Decisión:** Flag opcional para deshabilitar emails

**Razón:**
- Útil para testing local sin enviar emails reales
- Permite migración de datos sin spam
- Control manual en caso de problemas con Resend

---

### Fase 3: Estructura del Payload

#### 3.1 Payload enviado desde Strapi a Next.js

```typescript
interface SendOrderEmailRequest {
  orderId: string              // "ORD-1234567890-ABCD"
  customerEmail: string        // "cliente@example.com"
  customerName?: string        // "Juan Pérez"
  orderStatus: OrderStatus     // "paid" | "shipped" | etc.
  orderData: {
    items: CartItem[]          // Productos de la orden
    subtotal: number           // 299.99
    shipping: number           // 5.95
    total: number              // 305.94
    createdAt?: string         // "2025-12-29T10:30:00.000Z"
  }
}
```

#### 3.2 Validación en Next.js

El endpoint `/api/send-order-email` ya valida:
- ✅ Header `X-Webhook-Secret` coincide con env var
- ✅ Campos requeridos presentes
- ✅ Email en formato válido
- ✅ `orderStatus` es un valor válido del enum

---

## ✅ Checklist de Implementación

### Configuración (Strapi)

- [ ] Agregar variables de entorno a `.env.example`
- [ ] Generar `WEBHOOK_SECRET` seguro (`openssl rand -base64 32`)
- [ ] Configurar `.env` con valores reales
- [ ] Verificar que `WEBHOOK_SECRET` coincide con Next.js
- [ ] Configurar `FRONTEND_URL` correctamente (dev/prod)

### Código (Strapi)

- [ ] Abrir `/src/api/order/content-types/order/lifecycles.ts`
- [ ] Implementar hook `afterUpdate`
- [ ] Detectar cambio de `orderStatus`
- [ ] Obtener email del usuario (con populate)
- [ ] Construir payload completo
- [ ] Llamar webhook de Next.js con secret
- [ ] Manejar errores sin bloquear actualización
- [ ] Agregar logs detallados ([ORD-22] prefix)

### Testing Local

- [ ] Iniciar Strapi en desarrollo (`npm run develop`)
- [ ] Iniciar Next.js en desarrollo (`npm run dev`)
- [ ] Verificar que ambos `.env` tienen el mismo `WEBHOOK_SECRET`
- [ ] Crear una orden de prueba en Strapi
- [ ] Actualizar `orderStatus` de la orden (pending → paid)
- [ ] Verificar logs de Strapi:
  - `[ORD-22] Order XXX: Status changed pending → paid`
  - `[ORD-22] Order XXX: Sending email to ...`
  - `[ORD-22] Calling webhook: http://localhost:3000/api/send-order-email`
  - `[ORD-22] ✅ Email sent successfully`
- [ ] Verificar logs de Next.js:
  - `📧 [EMAIL API] Received request to send order email`
  - `✅ Request validated for order XXX`
  - `📧 Sending email to ...`
  - `✅ Email sent successfully`
- [ ] Verificar email recibido en inbox
- [ ] Probar cada cambio de estado (paid, processing, shipped, delivered)
- [ ] Probar con `DISABLE_EMAIL_NOTIFICATIONS=true` (no debe enviar)

### Testing de Errores

- [ ] Probar con webhook secret incorrecto → Debe loguear error, orden se actualiza
- [ ] Probar con `FRONTEND_URL` incorrecto → Debe loguear error, orden se actualiza
- [ ] Probar con Next.js apagado → Debe loguear error, orden se actualiza
- [ ] Probar con orden sin usuario → Debe loguear error, orden se actualiza
- [ ] Verificar que en TODOS los casos, la orden se actualiza exitosamente

### Producción

- [ ] Actualizar `.env` de Strapi en Render:
  - `FRONTEND_URL=https://your-app.vercel.app`
  - `WEBHOOK_SECRET=<mismo que Vercel>`
- [ ] Verificar que Next.js en Vercel tiene el mismo `WEBHOOK_SECRET`
- [ ] Deploy de Strapi a Render
- [ ] Verificar logs de producción
- [ ] Crear orden de prueba en producción
- [ ] Cambiar estado y verificar email recibido

---

## 📋 Testing Scenarios

### Escenario 1: Flujo Normal - Cambio de Estado

**Setup:**
- Orden existente con `orderStatus = "pending"`
- Usuario con email válido asociado

**Pasos:**
1. Actualizar orden a `orderStatus = "paid"` en Strapi admin
2. Hook detecta cambio
3. Webhook llamado
4. Email enviado

**Resultado esperado:**
- ✅ Orden actualizada a "paid"
- ✅ Email recibido con template "Pago Confirmado"
- ✅ Logs muestran flujo completo
- ✅ No errores

### Escenario 2: Sin Cambio de Estado

**Setup:**
- Orden con `orderStatus = "paid"`

**Pasos:**
1. Actualizar otro campo (ej: `shipping = 10.00`)
2. No cambiar `orderStatus`

**Resultado esperado:**
- ✅ Orden actualizada
- ✅ NO se envía email
- ✅ Log: "Status unchanged, skipping email"

### Escenario 3: Email Falla - Next.js Apagado

**Setup:**
- Next.js no está corriendo
- Orden con estado "pending"

**Pasos:**
1. Actualizar orden a "paid"
2. Hook intenta llamar webhook
3. Fetch falla (connection refused)

**Resultado esperado:**
- ✅ Orden actualizada a "paid"
- ❌ Email NO enviado
- ✅ Log: "Exception in afterUpdate hook"
- ✅ Error NO bloquea actualización

### Escenario 4: Webhook Secret Inválido

**Setup:**
- `WEBHOOK_SECRET` diferente en Strapi y Next.js

**Pasos:**
1. Actualizar orden
2. Webhook llamado con secret incorrecto
3. Next.js rechaza request (401)

**Resultado esperado:**
- ✅ Orden actualizada
- ❌ Email NO enviado
- ✅ Log: "Email sending failed: 401"
- ✅ Error NO bloquea actualización

### Escenario 5: Orden Sin Usuario

**Setup:**
- Orden creada sin usuario asociado (edge case)

**Pasos:**
1. Actualizar estado de orden
2. Hook intenta obtener email de usuario
3. Usuario no existe

**Resultado esperado:**
- ✅ Orden actualizada
- ❌ Email NO enviado
- ✅ Log: "No user email found, cannot send notification"

### Escenario 6: Múltiples Cambios Rápidos

**Setup:**
- Orden con estado "pending"

**Pasos:**
1. Actualizar a "paid"
2. Inmediatamente actualizar a "processing"
3. Inmediatamente actualizar a "shipped"

**Resultado esperado:**
- ✅ 3 emails enviados (uno por cada cambio)
- ✅ Orden en estado final "shipped"
- ✅ Cada email con el template correcto

---

## 🔍 Debugging

### Logs de Strapi

**Ubicación:** Terminal donde corre `npm run develop`

**Buscar:**
```bash
# Logs de lifecycle hooks
[ORD-22]

# Filtrar solo emails
npm run develop | grep "\[ORD-22\]"
```

### Logs de Next.js

**Ubicación:** Terminal de Next.js o Vercel dashboard

**Buscar:**
```bash
# Logs de email API
📧 [EMAIL API]

# Filtrar
npm run dev | grep "EMAIL API"
```

### Resend Dashboard

**URL:** https://resend.com/emails

**Verificar:**
- Email aparece en la lista
- Estado: Delivered / Bounced
- Logs de delivery
- Email preview

---

## 📚 Referencias

### Documentación

- [Strapi Lifecycle Hooks](https://docs.strapi.io/dev-docs/backend-customization/models#lifecycle-hooks)
- [Strapi Entity Service](https://docs.strapi.io/dev-docs/api/entity-service)
- [ORD-20] Email System Documentation: `/docs/email-system.md`
- [CHALLENGES.md] Email Architecture Decisions

### Archivos Relacionados

**Frontend (Next.js):**
- `/src/app/api/send-order-email/route.ts` - API endpoint
- `/src/lib/email/client.ts` - Resend client
- `/src/lib/email/config.ts` - Email configuration
- `/src/emails/templates/OrderStatusEmail.tsx` - Email template

**Backend (Strapi):**
- `/src/api/order/content-types/order/lifecycles.ts` - Lifecycle hooks
- `/src/api/order/content-types/order/schema.json` - Order model
- `/.env` - Environment variables

### Commits Previos Relacionados

- [ORD-21] React Email templates - `7d0d99f`
- [ORD-20] Resend configuration - `7a336ca`
- [ORD-19] Delivery dates logic - `9dd3a88`

---

## 🚀 Próximos Pasos (Post ORD-22)

Después de completar ORD-22, el sistema estará completamente funcional:

- [x] **[ORD-19]** Lógica de fechas de entrega ✅
- [x] **[ORD-20]** Sistema Resend configurado ✅
- [x] **[ORD-21]** React Email templates ✅
- [ ] **[ORD-22]** Strapi lifecycle hooks ← ESTE TICKET
- [ ] **[ORD-23]** Tests E2E del flujo completo
- [ ] **[ORD-24]** Botón "Reenviar email" en Strapi admin
- [ ] **[ORD-25]** Dashboard de emails enviados

---

## ⚠️ Notas Importantes

### Seguridad

- ✅ `WEBHOOK_SECRET` NUNCA debe tener prefijo `NEXT_PUBLIC_`
- ✅ Secret debe tener mínimo 32 caracteres
- ✅ Usar diferentes secrets en dev/staging/prod
- ✅ Rotar secret si se expone accidentalmente

### Performance

- ✅ Hook `afterUpdate` es asíncrono pero NO bloquea respuesta HTTP
- ✅ Webhook tiene retry automático en Next.js (3 intentos)
- ✅ Si Resend falla, se loguea pero no se bloquea

### Desarrollo vs Producción

**Development:**
- `FRONTEND_URL=http://localhost:3000`
- Emails van a `DEV_EMAIL` (configurado en Next.js)
- `WEBHOOK_SECRET` de prueba

**Production:**
- `FRONTEND_URL=https://your-app.vercel.app`
- Emails van a clientes reales
- `WEBHOOK_SECRET` diferente y seguro

---

**Última actualización:** 2026-01-10
**Autor:** Andrés Pérez (@AndresDev28)
**Siguiente paso:** Implementar en `/relojes-bv-beni-api/src/api/order/content-types/order/lifecycles.ts`
