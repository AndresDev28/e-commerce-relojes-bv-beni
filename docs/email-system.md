# 📧 Sistema de Emails - Relojes BV Beni

**[ORD-20] Configure Resend email system** ✅  
**[ORD-21] React Email templates** ✅

Documentación completa del sistema de notificaciones por email implementado con Resend y React Email.

---

## 📐 Arquitectura

```
┌─────────────────┐
│   Strapi CMS    │ 
│   (Backend)     │
│                 │
│  Order Model    │
│  + Lifecycle    │──┐
│    Hooks        │  │ 1. Order status changes
└─────────────────┘  │    (afterUpdate hook)
                     │
                     ↓
                     │ 2. Trigger webhook/API call
                     │
┌─────────────────┐  │
│   Next.js App   │←─┘
│                 │
│  /api/send-     │  3. Validate webhook secret
│  order-email    │  4. Get order details
│                 │  5. Generate HTML email
│                 │  6. Send via Resend client
└─────────────────┘
         │
         ↓
┌─────────────────┐
│     Resend      │  7. Deliver email
│   Email Service │     to customer
└─────────────────┘
```

---

## 🎯 Decisiones de Arquitectura (ORD-20)

### 1. **¿Por qué Resend?**

✅ **Ventajas:**
- API moderna y simple
- React Email integration (para ORD-21)
- Excelente DX (developer experience)
- Dashboard con logs detallados
- Tier gratuito generoso (3,000 emails/mes)

### 2. **¿Dónde vive la lógica de emails?**

**Decisión:** Next.js API Route (`/api/send-order-email`)

**Razones:**
- Centraliza lógica de emails
- Permite usar React Email templates (ORD-21)
- Mejor control de error handling y retry
- No sobrecarga Strapi con lógica extra

### 3. **¿Cómo se disparan los emails?**

**Decisión:** Strapi Lifecycle Hook → Next.js Webhook

**Flujo:**
```javascript
// strapi/src/api/order/content-types/order/lifecycles.js
async afterUpdate(event) {
  if (statusChanged) {
    await fetch('https://app.vercel.app/api/send-order-email', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.WEBHOOK_SECRET 
      },
      body: JSON.stringify({ orderId, status, ... })
    })
  }
}
```

### 4. **¿Qué pasa si el email falla?**

**Decisión:** Log error pero NO bloquear actualización del pedido

**Implementación:**
```typescript
// API route siempre devuelve 200
if (emailFailed) {
  console.error(`Email failed for order ${orderId}`)
  return NextResponse.json({
    success: false,
    error: errorMessage
  }, { status: 200 }) // ⚠️ 200, no 500!
}
```

**Razón:** El pedido debe actualizarse aunque el email falle. Emails son **notificaciones**, no parte crítica del flujo.

**Futuro:** Agregar botón "Reenviar email" en admin (ORD-25).

### 5. **Autenticación del webhook**

**Decisión:** Shared Secret en header `X-Webhook-Secret`

**Setup:**
1. Generar secret: `openssl rand -base64 32`
2. Configurar en `.env.local` (Next.js): `WEBHOOK_SECRET=xxx`
3. Configurar en Strapi `.env`: `WEBHOOK_SECRET=xxx`
4. Next.js valida el header en cada request

**Alternativas descartadas:**
- JWT: Más complejo, overkill para este caso
- Sin autenticación: Inseguro

---

## 📂 Estructura de Archivos

```
src/
├── emails/                        # [ORD-21] React Email templates
│   ├── templates/
│   │   ├── OrderStatusEmail.tsx   # Template principal de pedidos
│   │   └── index.ts               # Barrel export
│   ├── components/                # Componentes reutilizables
│   │   ├── EmailHeader.tsx
│   │   ├── EmailFooter.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── OrderItems.tsx
│   │   ├── OrderSummary.tsx
│   │   └── index.ts
│   └── utils/
│       ├── renderEmail.ts         # Renderiza React a HTML
│       ├── styles.ts              # Estilos compartidos
│       └── index.ts
├── lib/
│   └── email/
│       ├── config.ts              # Configuración centralizada
│       ├── env-validator.ts       # Validación de env vars
│       ├── client.ts              # Cliente de Resend + retry logic
│       └── __tests__/
│           ├── env-validator.test.ts
│           └── client.test.ts
├── app/
│   └── api/
│       └── send-order-email/
│           ├── route.ts           # API endpoint
│           └── __tests__/
│               └── route.test.ts
```

---

## ⚙️ Setup y Configuración

### 1. Obtener API Key de Resend

1. Crear cuenta en [resend.com](https://resend.com)
2. Ir a [API Keys](https://resend.com/api-keys)
3. Crear nueva key
4. Copiar key (formato: `re_xxxxxxxxxxxxx`)

### 2. Configurar Variables de Entorno

**Desarrollo (`.env.local`):**
```bash
# Resend
RESEND_API_KEY=re_your_test_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev  # Dominio de prueba
DEV_EMAIL=tu-email@gmail.com              # Opcional: redirigir emails

# Webhook
WEBHOOK_SECRET=generate-random-32-char-string
```

**Producción (Vercel/hosting platform):**
```bash
# Resend
RESEND_API_KEY=re_your_production_key
RESEND_FROM_EMAIL=pedidos@relojesbvbeni.com  # Dominio verificado
# NO configurar DEV_EMAIL en producción

# Webhook
WEBHOOK_SECRET=same-secret-as-strapi
```

### 3. Verificar Dominio (Solo Producción)

1. Ir a [Resend Domains](https://resend.com/domains)
2. Agregar `relojesbvbeni.com`
3. Agregar registros DNS (SPF, DKIM, DMARC)
4. Verificar dominio
5. Usar `pedidos@relojesbvbeni.com` como FROM email

**Nota:** En desarrollo usar `onboarding@resend.dev` (no requiere verificación).

### 4. Generar Webhook Secret

```bash
# macOS/Linux
openssl rand -base64 32

# O usar generador online
# https://generate-secret.vercel.app/32
```

Usar el mismo secret en Next.js y Strapi.

---

## 🔒 Seguridad

### Buenas Prácticas

✅ **DO:**
- Usar `RESEND_API_KEY` (sin `NEXT_PUBLIC_` prefix)
- Usar `WEBHOOK_SECRET` para validar requests
- Rotar keys si se exponen accidentalmente
- Usar diferentes keys para dev/staging/prod
- Validar formato de email antes de enviar
- Log errores pero no keys

❌ **DON'T:**
- Nunca usar `NEXT_PUBLIC_RESEND_API_KEY`
- Nunca commitear `.env.local`
- Nunca loggear API keys o secrets
- Nunca enviar a listas sin validación

### Environment Validation

El sistema valida automáticamente al iniciar:

```typescript
// src/lib/email/client.ts
import { validateAndLogResendEnv } from './env-validator'

// Valida en module load (falla si config inválida)
validateAndLogResendEnv(true)
```

**Errores detectados:**
- ✅ API key faltante o inválida
- ✅ Email formato incorrecto
- ✅ Webhook secret faltante
- ✅ Keys con `NEXT_PUBLIC_` prefix (security breach)
- ✅ DEV_EMAIL activo en producción

---

## 📤 Uso del Sistema

### Enviar Email Desde API Route

```typescript
import { sendEmail } from '@/lib/email/client'

const result = await sendEmail({
  to: 'customer@example.com',
  subject: 'Actualización de Pedido',
  html: '<h1>Tu pedido ha sido enviado</h1>',
  text: 'Tu pedido ha sido enviado',  // Opcional
  replyTo: 'support@relojesbvbeni.com', // Opcional
  tags: [                                 // Opcional (para analytics)
    { name: 'category', value: 'order-status' },
    { name: 'orderId', value: 'ORD-123' },
  ],
})

if (result.success) {
  console.log('Email sent:', result.emailId)
} else {
  console.error('Email failed:', result.error)
}
```

### Retry Logic Automático

El cliente incluye retry automático con exponential backoff:

- **Max intentos:** 3
- **Delay inicial:** 1 segundo
- **Delay máximo:** 5 segundos
- **Backoff:** 2^(attempt-1)

```
Attempt 1: Falla → Wait 1s
Attempt 2: Falla → Wait 2s
Attempt 3: Falla → Return error
```

### Development Email Override

Para evitar enviar emails a clientes reales durante desarrollo:

```bash
# .env.local
DEV_EMAIL=tu-email-dev@gmail.com
NODE_ENV=development
```

Todos los emails se redirigen a `DEV_EMAIL` en desarrollo.

```typescript
// Logs mostrarán:
📧 [DEV MODE] Email redirected from customer@example.com to tu-email-dev@gmail.com
```

---

## 🧪 Testing

### Unit Tests

```bash
# Todos los tests de email
npm test -- src/lib/email/__tests__/

# Solo env-validator
npm test -- src/lib/email/__tests__/env-validator.test.ts

# Solo client
npm test -- src/lib/email/__tests__/client.test.ts
```

### Manual Testing

#### 1. Test Email (local)

```typescript
import { sendTestEmail } from '@/lib/email/client'

const result = await sendTestEmail('tu-email@example.com')
console.log(result)
```

#### 2. Test API Route (cURL)

```bash
curl -X POST http://localhost:3000/api/send-order-email \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-webhook-secret" \
  -d '{
    "orderId": "ORD-TEST-123",
    "customerEmail": "test@example.com",
    "orderStatus": "paid",
    "orderData": {
      "items": [
        {
          "id": "1",
          "name": "Casio G-SHOCK",
          "price": 150,
          "quantity": 1,
          "images": ["test.jpg"],
          "href": "/test",
          "description": "Test",
          "stock": 10
        }
      ],
      "subtotal": 150,
      "shipping": 5.95,
      "total": 155.95
    }
  }'
```

#### 3. Verificar en Resend Dashboard

1. Ir a [Resend Emails](https://resend.com/emails)
2. Buscar por email ID o recipient
3. Ver logs, bounce rate, open rate

---

## 🐛 Troubleshooting

### Error: "Resend API key is not configured"

**Causa:** Falta `RESEND_API_KEY` en `.env.local`

**Solución:**
```bash
# 1. Copiar ejemplo
cp .env.example .env.local

# 2. Agregar key real
RESEND_API_KEY=re_your_key_here

# 3. Reiniciar servidor
npm run dev
```

### Error: "Invalid webhook secret"

**Causa:** Secret no coincide entre Next.js y Strapi

**Solución:**
```bash
# Verificar que sean iguales:

# Next.js (.env.local)
WEBHOOK_SECRET=abc123

# Strapi (.env)
WEBHOOK_SECRET=abc123
```

### Error: "Email delivery failed: Domain not verified"

**Causa:** Usando dominio custom sin verificar

**Solución Development:**
```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Solución Production:**
1. Ir a [Resend Domains](https://resend.com/domains)
2. Verificar `relojesbvbeni.com`
3. Usar `pedidos@relojesbvbeni.com`

### Emails no llegan

**Checklist:**
1. ✅ Verificar logs en Resend dashboard
2. ✅ Checar carpeta de spam
3. ✅ Verificar que el email receptor sea válido
4. ✅ Si es development, verificar `DEV_EMAIL` override
5. ✅ Revisar logs de Next.js por errores

---

## 📊 Monitoreo

### Resend Dashboard

- **URL:** [resend.com/emails](https://resend.com/emails)
- **Métricas:**
  - Emails enviados
  - Delivery rate
  - Bounce rate
  - Open rate (si tracking activado)

### Logs de Next.js

```typescript
// Cada email loguea:
📧 Sending email:
  To: customer@example.com
  Subject: Actualización de Pedido
  From: Relojes BV Beni <pedidos@relojesbvbeni.com>
  📤 Attempt 1/3...
  ✅ Email sent successfully (ID: email_abc123)
```

---

## 🎨 React Email Templates (ORD-21)

### Arquitectura de Templates

Los emails se construyen con **componentes React** usando `@react-email/components`, proporcionando:

✅ **Type-safety** con TypeScript  
✅ **Componentes reutilizables**  
✅ **Preview en desarrollo** con hot reload  
✅ **Compatible con todos los clientes** de email  
✅ **Fácil mantenimiento** vs HTML strings  

### Componentes Base

```typescript
// src/emails/components/
EmailHeader.tsx    // Logo + tagline
EmailFooter.tsx    // Contacto + copyright
StatusBadge.tsx    // Badge visual del estado
OrderItems.tsx     // Tabla de productos
OrderSummary.tsx   // Totales (subtotal, envío, total)
```

Todos los componentes están **type-safe** y usan estilos compartidos de `src/emails/utils/styles.ts`.

### Template Principal: OrderStatusEmail

**Ubicación:** `src/emails/templates/OrderStatusEmail.tsx`

**Props:**
```typescript
interface OrderStatusEmailProps {
  orderId: string
  customerName?: string
  orderStatus: OrderStatus
  orderData: {
    items: CartItem[]
    subtotal: number
    shipping: number
    total: number
    createdAt?: string
  }
}
```

**Uso en API Route:**
```typescript
import { OrderStatusEmail, EMAIL_SUBJECTS } from '@/emails/templates'
import { renderEmailToHtml } from '@/emails/utils'

// Generar HTML
const html = await renderEmailToHtml(
  OrderStatusEmail({
    orderId: 'ORD-123',
    customerName: 'Juan',
    orderStatus: OrderStatus.PAID,
    orderData: { ... }
  })
)

// Enviar
await sendEmail({
  to: 'customer@example.com',
  subject: EMAIL_SUBJECTS[OrderStatus.PAID],
  html,
})
```

### Preview de Emails en Desarrollo

Para ver y editar emails en el navegador:

```bash
# Iniciar preview server
npm run email:dev

# Abre automáticamente http://localhost:3001
```

**Features del preview:**
- ✅ Hot reload (cambios se reflejan al instante)
- ✅ Vista mobile/desktop
- ✅ Código HTML generado
- ✅ Copiar código

**Cambiar estado de preview:**

Edita `OrderStatusEmail.tsx`:
```typescript
OrderStatusEmail.PreviewProps = {
  orderStatus: OrderStatus.SHIPPED, // Cambia esto
  // ...
}
```

Guarda el archivo y el preview se actualiza automáticamente.

### Estados Soportados

Cada estado tiene su **badge de color**, **icono** y **mensaje personalizado**:

| Estado | Color | Icono | Mensaje |
|--------|-------|-------|---------|
| `PENDING` | Amarillo | ⏳ | Esperando confirmación de pago |
| `PAID` | Verde | ✓ | ¡Tu pago ha sido confirmado! |
| `PROCESSING` | Azul | 📦 | Tu pedido está siendo preparado |
| `SHIPPED` | Naranja | 🚚 | ¡Tu pedido está en camino! |
| `DELIVERED` | Verde | ✓ | ¡Tu pedido ha sido entregado! |
| `CANCELLED` | Rojo | ✗ | Tu pedido ha sido cancelado |
| `REFUNDED` | Morado | ↩ | Tu reembolso ha sido procesado |

### Estilos y Diseño

**Colores:** `src/emails/utils/styles.ts`
```typescript
export const colors = {
  primary: '#2563eb',    // Azul
  success: '#16a34a',    // Verde
  gray: { ... },
}
```

**Compatibilidad:**
- ✅ Ancho máximo: 600px (estándar de la industria)
- ✅ Mobile responsive
- ✅ Compatible con Gmail, Outlook, Apple Mail, etc.
- ✅ Sin Flexbox/Grid (usa `<table>` internamente)
- ✅ Estilos inline automáticos

### Crear Nuevo Template

1. **Crear componente:**
```tsx
// src/emails/templates/WelcomeEmail.tsx
export default function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html>
      <Body>
        <EmailHeader />
        <Text>Hola {name}!</Text>
        <EmailFooter />
      </Body>
    </Html>
  )
}

// Preview props
WelcomeEmail.PreviewProps = { name: 'Juan' }
```

2. **Exportar en barrel:**
```typescript
// src/emails/templates/index.ts
export { default as WelcomeEmail } from './WelcomeEmail'
```

3. **Usar en API:**
```typescript
import { WelcomeEmail } from '@/emails/templates'
import { renderEmailToHtml } from '@/emails/utils'

const html = await renderEmailToHtml(WelcomeEmail({ name: 'Juan' }))
```

---

## 🚀 Próximos Pasos

- [x] **[ORD-21]** Crear React Email templates ✅
- [ ] **[ORD-22]** Implementar lifecycle hooks en Strapi
- [ ] **[ORD-24]** Tests E2E de emails
- [ ] **[ORD-25]** Botón "Reenviar email" en admin panel

---

## 📚 Referencias

- [Resend Docs](https://resend.com/docs)
- [React Email](https://react.email)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Strapi Lifecycle Hooks](https://docs.strapi.io/dev-docs/backend-customization/models#lifecycle-hooks)

---

**Última actualización:** ORD-21 (Diciembre 2025)  
**Autor:** Andrés Pérez (@AndresDev28)
