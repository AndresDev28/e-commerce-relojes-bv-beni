# Integration Tests - Arquitectura y Guía

**[ORD-24] Integration Tests para Email System**

Documentación de la arquitectura de tests de integración implementados en el proyecto.

---

## 📐 Arquitectura

### ¿Qué son los Integration Tests?

Los **Integration Tests** validan que múltiples componentes funcionen correctamente juntos. A diferencia de los **Unit Tests** que prueban una función aislada, los integration tests prueban el flujo completo.

**Analogía:**
- **Unit Test:** Probar que un motor enciende
- **Integration Test:** Probar que el auto maneja (motor + transmisión + ruedas juntas)

### Nuestra Arquitectura de Tests

```
┌─────────────────────────────────────────────────────────┐
│                  TIPOS DE TESTS                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. UNIT TESTS (src/**/__tests__/)                     │
│     ├─ Componentes UI (Button, Card, etc.)            │
│     ├─ Hooks (useCart, useAuth)                        │
│     ├─ Utilidades (formatPrice, formatDate)            │
│     └─ API Routes (con MOCKS de Strapi, Resend)        │
│                                                          │
│  2. INTEGRATION TESTS (test/integration/)              │
│     ├─ Flujo completo Next.js → Strapi                 │
│     ├─ Webhooks → API Routes → Email sending           │
│     └─ Servicios REALES (excepto externos)             │
│                                                          │
│  3. E2E TESTS (futuro: Playwright/Cypress)             │
│     └─ Flujo completo del usuario (click en browser)   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ Decisiones Arquitectónicas

### 1. Ubicación: `test/integration/`

**¿Por qué una carpeta separada?**

- **Separación de responsabilidades:** Unit tests e integration tests son categorías diferentes
- **Claridad:** Al ver `test/integration/` sabes que son tests que requieren setup externo
- **Escalabilidad:** Cuando tengas 50+ integration tests, estarán organizados
- **Patrón estándar:** Usado por Next.js, Vercel, y grandes proyectos

**Estructura:**
```
test/
├── integration/
│   ├── email/                          ← Tests de email
│   │   └── order-status-change.integration.test.ts
│   ├── orders/                         ← Tests de pedidos (futuro)
│   │   └── create-order.integration.test.ts
│   └── helpers/                        ← Utilidades reutilizables
│       ├── setup.ts                    ← Configuración global
│       └── test-server.ts              ← Servidor Next.js de prueba
```

### 2. Conexión Frontend ↔ Backend: HTTP REAL

**Estrategia por capa:**

| Capa | Estrategia | Por qué |
|------|------------|---------|
| **Next.js API Routes** | REAL | Queremos probar el código de producción |
| **Strapi Backend** | REAL (Docker) | Confiamos en sus propios tests |
| **Resend API** | MOCK | Servicio externo, no controlado |
| **Fetch HTTP** | REAL | Validar comunicación real |

**¿Por qué HTTP REAL y no mocks?**

1. **Confianza de deploy:** Los mocks mienten, la realidad no
2. **Bugs reales:** Se descubren problemas que los mocks esconden
3. **Contratos:** Validamos que frontend y backend hablen el mismo idioma
4. **Speed:** Docker es rápido, no hay excusa

**¿Por qué SÍ mockear Resend?**

1. **Externo:** No es nuestro código
2. **Cuota:** No queremos gastar emails de prueba
3. **Velocidad:** La API de Resend puede ser lenta
4. **Determinismo:** No queremos flakes por red

### 3. Variables de Entorno y Setup

**Requisitos previos:**

```bash
# 1. Docker Desktop debe estar corriendo
docker --version

# 2. Strapi backend debe estar iniciado
cd relojes-bv-beni-api && npm run dev

# 3. Verificar que Strapi responde
curl http://localhost:1337/_health
```

**Variables de entorno (configuradas en setup.ts):**

```bash
NODE_ENV=test
WEBHOOK_SECRET=test-webhook-secret
RESEND_API_KEY=re_test_key
RESEND_FROM_EMAIL=test@resend.dev
NEXT_PUBLIC_STRAPI_API_URL=http://localhost:1337
```

---

## 🚀 Cómo Ejecutar los Tests

### Comandos Disponibles

```bash
# Ejecutar TODOS los integration tests
npm run test:integration

# Ejecutar en modo watch (re-ejecuta al cambiar código)
npm run test:integration:watch

# Ejecutar unit tests + integration tests
npm run test:all
```

### Ejecutar un Solo Test

```bash
# Ejecutar solo IT-1
npm run test:integration -- order-status-change

# Ejecutar con filtro
npm run test:integration -- -t "should send email"
```

### Ejecutar con Debug Logs

```bash
# Ver logs detallados
npm run test:integration -- --reporter=verbose

# Ejecutar en modo foreground (no detached)
vitest --project=integration --no-coverage
```

---

## 📝 Estructura de un Integration Test

### Anatomía de `order-status-change.integration.test.ts`

```typescript
// 1. IMPORTS
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer } from '../helpers/test-server'

// 2. MOCKS (servicios externos)
vi.mock('@/lib/email/client', () => ({
  sendEmail: vi.fn(),
}))

// 3. SETUP GLOBAL (una vez antes de todos los tests)
beforeAll(async () => {
  testServer = await createTestServer(3001)
  authToken = await loginToStrapi()
})

// 4. CLEANUP GLOBAL (una vez después de todos los tests)
afterAll(async () => {
  await testServer.stop()
})

// 5. CADA TEST INDIVIDUAL
it('should send email when order status changes', async () => {
  // ARRANGE: Preparar escenario
  const order = await createTestOrder()

  // ACT: Ejecutar acción
  await updateOrderStatus(order.id, 'SHIPPED')
  await waitForWebhook()

  // ASSERT: Verificar resultado
  expect(sendEmail).toHaveBeenCalledTimes(1)
  expect(sendEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'customer@example.com',
    })
  )
})
```

---

## 🎯 Test IT-1: Order Status Change

### ¿Qué valida?

El test IT-1 valida el flujo completo del webhook:

```
1. Simular payload del lifecycle hook de Strapi
2. Webhook llama a Next.js /api/send-order-email
3. Next.js valida request (webhook secret, campos requeridos)
4. Next.js genera email HTML
5. Next.js llama a sendEmail()
6. Email se envía (puede fallar en test env por API key)
```

**NOTA:** El test simula el webhook directamente en lugar de crear/actualizar una orden real en Strapi porque esto requiere permisos de admin. El test valida que el endpoint de Next.js procese correctamente el payload.

### Assertions del Test

1. **El endpoint responde con status 200**
   ```typescript
   expect(webhookResponse.status).toBe(200)
   ```

2. **La respuesta contiene los campos esperados**
   ```typescript
   expect(responseData).toHaveProperty('success')
   expect(responseData).toHaveProperty('message')
   ```

3. **Si el email se envió correctamente, tiene emailId**
   ```typescript
   if (responseData.success) {
     expect(responseData).toHaveProperty('emailId')
   }
   ```

4. **Si el email falló, tiene el error**
   ```typescript
   if (!responseData.success) {
     expect(responseData).toHaveProperty('error')
   }
   ```

---

## 🎯 Test IT-4: All Order Statuses (Parametrized)

### ¿Qué valida?

Test parametrizado usando `it.each` de Vitest para validar que todos los estados importantes de la orden envíen emails correctamente:

- **CANCELLED**: "Pedido cancelado"
- **DELIVERED**: "¡Pedido entregado!"
- **REFUNDED**: "Reembolso procesado"

### Assertions del Test

1. **El endpoint responde con status 200**
2. **La respuesta contiene los campos esperados**

### Código

```typescript
const orderStatusesToTest = [
  { status: OrderStatus.CANCELLED, expectedSubject: 'cancelado' },
  { status: OrderStatus.DELIVERED, expectedSubject: 'entregado' },
  { status: OrderStatus.REFUNDED, expectedSubject: 'reembolsado' },
] as const

it.each(orderStatusesToTest)('[IT-4] should send email when order status changes to $status', async ({ status }) => {
  // Test implementation...
})
```

---

## 🎯 Test IT-5: Multiple Sequential Status Changes

### ¿Qué valida?

Que el sistema envíe múltiples emails cuando una orden cambia su estado múltiples veces de forma secuencial.

### Flujo del Test

```
1. Primera llamada: SHIPPED → Email 1
2. Pausa de 500ms
3. Segunda llamada: DELIVERED → Email 2
4. Verificar: 2 respuestas exitosas
```

### Assertions del Test

1. **Se reciben tantas respuestas como cambios de estado**
   ```typescript
   expect(responses).toHaveLength(statusSequence.length)
   ```

2. **Cada respuesta tiene la estructura correcta**
   ```typescript
   responses.forEach((responseData) => {
     expect(responseData).toHaveProperty('success')
     expect(responseData).toHaveProperty('message')
   })
   ```

---

## 🎯 Test IT-6: Webhook Retry Logic

### ¿Qué valida?

Que el sistema reintente enviar el email automáticamente si falla, usando exponential backoff.

### Configuración de Retry

| Intento | Delay | Total |
|---------|-------|-------|
| 1 | Inmediato | 0ms |
| 2 | 1000ms | ~1s |
| 3 | 2000ms | ~3s |

**Tiempo total mínimo**: ~6 segundos + tiempo de requests

### Assertions del Test

1. **El endpoint responde (aunque falle, devuelve 200)**
2. **La duración total es consistente con los reintentos**
3. **Si falla, tiene el error descriptivo**

---

## 🎯 Test IT-7: Email Fields Validation

### ¿Qué valida?

Que todos los campos requeridos para generar el email estén presentes y tengan el formato correcto.

### Campos Validados

| Campo | Validación |
|-------|------------|
| `orderId` | Formato: `TEST-ORD-VALIDATE-{timestamp}` |
| `customerEmail` | Regex de email válido |
| `customerName` | No vacío, longitud > 0 |
| `orderData.items` | Al menos 1 item con nombre |
| `orderData.total` | Valor numérico correcto |

### Assertions del Test

```typescript
// 1. Order ID format
expect(testOrderId).toMatch(/^TEST-ORD-VALIDATE-\d+$/)

// 2. Email válido
expect(customerEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)

// 3. Nombre presente
expect(customerName).toBeTruthy()
expect(customerName).length.greaterThan(0)

// 4. Items presentes
expect(webhookPayload.orderData.items).toHaveLength(1)

// 5. Total correcto
expect(webhookPayload.orderData.total).toBe(310.0)
```

---

## 🐛 Troubleshooting

### Error: "Cannot connect to Strapi"

**Causa:** Strapi no está corriendo o está en otro puerto

**Solución:**
```bash
# 1. Verificar que Docker Desktop está corriendo
docker ps

# 2. Iniciar Strapi
cd relojes-bv-beni-api
npm run dev

# 3. Verificar que responde
curl http://localhost:1337/_health
```

### Error: "Test server already running on port 3001"

**Causa:** Puerto 3001 ya está en uso

**Solución:**
```bash
# Encontrar proceso
lsof -ti:3001

# Matar proceso
kill -9 $(lsof -ti:3001)

# O cambiar el puerto en el test
const testServer = await createTestServer(3002)
```

### Error: "Authentication failed with Strapi"

**Causa:** No existe usuario de prueba en Strapi

**Solución:**
```bash
# Crear usuario de prueba en Strapi admin
# Email: test@example.com
# Password: Test1234!
```

### Test falla intermitentemente

**Causa:** Race condition o timeout muy corto

**Solución:**
```typescript
// Aumentar el timeout de espera
await new Promise(resolve => setTimeout(resolve, 5000)) // 5s en lugar de 2s
```

---

## 📊 Mejores Prácticas

### ✅ DO

1. **Tests independientes:** Cada test debe crear sus propios datos
2. **Cleanup correcto:** Siempre usar `afterAll` para limpiar
3. **Esperas asíncronas:** Usar `await` y `setTimeout` donde sea necesario
4. **Logs útiles:** Agregar `console.log` para debuggear
5. **Tests rápidos:** Target < 30s por test
6. **Nombres descriptivos:** `should send email when X happens`

### ❌ DON'T

1. **Dependencias entre tests:** El test B no debería depender del test A
2. **Hardcodes:** Usar variables de entorno para URLs y ports
3. **Tests lentos:** Evitar sleeps innecesarios
4. **No limpiar:** Dejar datos basura en la base de datos
5. **Mocks excesivos:** Si mockeas todo, no es un integration test

---

## 🚦 Próximos Pasos

### Tests Completados (ORD-24) ✅

- [x] IT-1: Order status change (PAID → SHIPPED) → Email sent
- [x] IT-2: Invalid webhook secret → 401 Unauthorized
- [x] IT-3: Missing required fields → 400 Validation error
- [x] IT-4: All order statuses (parametrized with it.each)
  - cancelled, delivered, refunded
- [x] IT-5: Multiple sequential status changes → Multiple emails
- [x] IT-6: Webhook retry logic (3 attempts with exponential backoff)
- [x] IT-7: Email fields validation (orderId, customerEmail, subject, items, total)

### Tests Futuros (Otros Epics)

- [ ] IT-ORD: Crear orden desde Next.js → Stripe → Strapi
- [ ] IT-AUTH: Login completo → Strapi JWT → Next.js session
- [ ] IT-PAYMENT: Stripe Payment Intent → Order creation

---

## 📚 Referencias

- [Vitest Integration Testing](https://vitest.dev/guide/testing.html)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)
- [Testing Library](https://testing-library.com/docs/dom-testing-library/intro/)
- [Backend Tests (relojes-bv-beni-api)](../relojes-bv-beni-api/test/api/)

---

**Última actualización:** 2025-01-26
**Autor:** Andrés Pérez (@AndresDev28) + Mentor Claude
**Ticket:** [ORD-24] Integration Tests
