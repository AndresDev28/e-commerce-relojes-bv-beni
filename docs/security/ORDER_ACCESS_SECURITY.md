# Order Access Security Documentation

**Ticket:** [ORD-16] Tests: No se puede acceder a pedidos de otros usuarios  
**Created:** 2025-12-15  
**Status:** ✅ Implemented

## Resumen Ejecutivo

Este documento describe las medidas de seguridad implementadas para proteger el acceso a pedidos de usuarios en el sistema de e-commerce. El objetivo principal es garantizar que **los usuarios solo puedan acceder a sus propios pedidos** y que cualquier intento de acceso no autorizado sea detectado y registrado.

---

## 🔒 Principios de Seguridad Implementados

### 1. **Least Privilege (Privilegio Mínimo)**
Los usuarios solo pueden acceder a los recursos que les pertenecen. No hay forma de acceder a pedidos de otros usuarios, incluso con credenciales válidas.

### 2. **Defense in Depth (Defensa en Profundidad)**
Múltiples capas de validación:
- **Capa 1**: Autenticación JWT (válida el token)
- **Capa 2**: Filtrado por userId en Strapi (solo retorna pedidos del usuario)
- **Capa 3**: Verificación adicional en el endpoint (doble check)

### 3. **Information Disclosure Prevention (Prevención de Filtración de Información)**
- Retornamos **404** (no 403) para pedidos ajenos → No revelamos si el pedido existe
- Mensajes de error genéricos sin detalles sensibles
- Logs de seguridad NO contienen datos de pedidos

### 4. **Audit Logging (Registro de Auditoría)**
- Todos los intentos de acceso se registran
- Accesos exitosos: `console.log` (audit trail)
- Intentos no autorizados: `console.warn` (security alerts)

### 5. **Fail Secure (Fallo Seguro)**
En caso de error, el sistema **deniega el acceso** por defecto. Nunca otorga acceso ante la duda.

---

## 🛡️ Arquitectura de Seguridad

### Flujo de Validación de Acceso

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Usuario hace request: GET /api/orders/ORD-123              │
│     Headers: Authorization: Bearer <jwt-token>                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Validación de JWT                                           │
│     ✓ Token presente?                                           │
│     ✓ Formato correcto (Bearer <token>)?                        │
│     → Si falla: 401 Unauthorized                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Autenticación con Strapi                                    │
│     GET /api/users/me con JWT                                   │
│     → Obtiene userId del usuario autenticado                    │
│     → Si falla: 500 Failed to authenticate user                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Validación de Ownership (Propiedad)                         │
│     GET /api/orders (con JWT → Strapi filtra por userId)        │
│     → Strapi retorna SOLO pedidos del usuario autenticado       │
│     → Verificamos si ORD-123 está en la lista                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
              ┌─────────────┴──────────────┐
              │                            │
         ✅ SÍ está                   ❌ NO está
              │                            │
              ↓                            ↓
┌──────────────────────────┐  ┌────────────────────────────┐
│  5a. ACCESO AUTORIZADO   │  │  5b. ACCESO DENEGADO       │
│                          │  │                            │
│  • Log: console.log      │  │  • Log: console.warn       │
│    "Authorized access"   │  │    "Unauthorized attempt"  │
│                          │  │                            │
│  • Return: 200 OK        │  │  • Return: 404 Not Found   │
│  • Data: Pedido completo │  │  • Data: { error: "..." }  │
└──────────────────────────┘  └────────────────────────────┘
```

---

## 🔐 Escenarios de Seguridad

### Escenario 1: Acceso Legítimo (200 OK)

**Situación**: Usuario 1 accede a su propio pedido ORD-123

```
Request:
  GET /api/orders/ORD-123
  Authorization: Bearer <token-user-1>

Validación:
  1. JWT válido ✓
  2. Strapi retorna userId = 1
  3. Strapi retorna pedidos de user 1: [ORD-123, ORD-124]
  4. ORD-123 está en la lista ✓

Log:
  ✅ [SECURITY AUDIT] Authorized order access: {
    event: 'authorized_access',
    userId: 1,
    orderId: 'ORD-123',
    timestamp: '2025-12-15T10:30:00.000Z'
  }

Response: 200 OK
  {
    data: {
      orderId: 'ORD-123',
      items: [...],
      total: 299.99,
      ...
    }
  }
```

### Escenario 2: Intento de Acceso No Autorizado (404 Not Found)

**Situación**: Usuario 1 intenta acceder al pedido ORD-999 que pertenece a Usuario 2

```
Request:
  GET /api/orders/ORD-999
  Authorization: Bearer <token-user-1>

Validación:
  1. JWT válido ✓
  2. Strapi retorna userId = 1
  3. Strapi retorna pedidos de user 1: [ORD-123, ORD-124]
  4. ORD-999 NO está en la lista ✗

Log:
  ⚠️ [SECURITY AUDIT] Unauthorized order access attempt: {
    event: 'unauthorized_access_attempt',
    requestingUserId: 1,
    attemptedOrderId: 'ORD-999',
    timestamp: '2025-12-15T10:30:00.000Z'
  }

Response: 404 Not Found
  {
    error: 'Order not found'
  }

SECURITY NOTE: Retornamos 404 (no 403) para no revelar que el pedido existe.
```

### Escenario 3: Token Inválido (401/500)

**Situación**: Token expirado, corrupto, o revocado

```
Request:
  GET /api/orders/ORD-123
  Authorization: Bearer <expired-token>

Validación:
  1. JWT presente ✓
  2. Strapi rechaza el token (401) ✗

Response: 500 Internal Server Error
  {
    error: 'Failed to authenticate user'
  }
```

### Escenario 4: Sin Token (401 Unauthorized)

**Situación**: Request sin header de autorización

```
Request:
  GET /api/orders/ORD-123
  (sin header Authorization)

Validación:
  1. JWT presente? ✗

Response: 401 Unauthorized
  {
    error: 'Unauthorized - JWT token required'
  }
```

### Escenario 5: Pedido Inexistente (404 Not Found)

**Situación**: Usuario intenta acceder a un pedido que no existe en el sistema

```
Request:
  GET /api/orders/ORD-FAKE
  Authorization: Bearer <token-user-1>

Validación:
  1. JWT válido ✓
  2. Strapi retorna userId = 1
  3. Strapi retorna pedidos de user 1: [ORD-123, ORD-124]
  4. ORD-FAKE NO está en la lista ✗

Response: 404 Not Found
  {
    error: 'Order not found'
  }

SECURITY NOTE: Mismo mensaje que "no autorizado" → previene enumeration attacks
```

---

## 🚨 Escenarios de Ataque Mitigados

### 1. Horizontal Privilege Escalation

**Ataque**: Usuario A intenta acceder a recursos de Usuario B con credenciales válidas.

**Mitigación**:
- Filtrado por userId en Strapi
- Verificación en endpoint
- Retorna 404 (no revela existencia)

**Test Coverage**: ✅ Test implementado

### 2. Enumeration Attack

**Ataque**: Attacker prueba múltiples orderIds para descubrir pedidos válidos.

**Mitigación**:
- Mismo mensaje de error para "no existe" y "no autorizado"
- No diferenciamos entre ambos casos
- Respuestas consistentes (previene timing attacks)

**Test Coverage**: ✅ Test implementado

### 3. Path Traversal

**Ataque**: `GET /api/orders/../../../etc/passwd`

**Mitigación**:
- Next.js maneja rutas de forma segura
- orderId se trata como string opaco
- No se ejecutan comandos del sistema

**Test Coverage**: ✅ Test implementado

### 4. SQL Injection

**Ataque**: `GET /api/orders/ORD-123'; DROP TABLE orders--`

**Mitigación**:
- No usamos SQL directamente
- Strapi API maneja queries de forma segura
- orderId se usa solo para comparación de strings

**Test Coverage**: ✅ Test implementado

### 5. XSS (Cross-Site Scripting)

**Ataque**: `GET /api/orders/<script>alert('xss')</script>`

**Mitigación**:
- API retorna JSON (Content-Type: application/json)
- No renderizamos HTML
- Next.js escapa automáticamente en frontend

**Test Coverage**: ✅ Test implementado

### 6. Brute Force / Account Enumeration

**Ataque**: Múltiples intentos de acceso a diferentes pedidos.

**Mitigación**:
- Todos los intentos se loggean con `console.warn`
- Respuestas consistentes
- Monitoreo de logs puede detectar patrones

**Test Coverage**: ✅ Test implementado

---

## 📊 Tests de Seguridad

### Cobertura de Tests (19 tests totales)

#### Suite 1: Autenticación (2 tests)
- ✅ Rechaza requests sin token (401)
- ✅ Rechaza tokens con formato inválido (401)

#### Suite 2: Ownership Validation (5 tests)
- ✅ Usuario puede ver su propio pedido (200)
- ✅ Usuario NO puede ver pedido ajeno (404)
- ✅ Error 404 no expone información sensible
- ✅ Token inválido es rechazado (500)
- ✅ Pedido inexistente retorna 404

#### Suite 3: Attack Scenarios (3 tests)
- ✅ Path traversal, SQL injection, XSS manejados correctamente
- ✅ Múltiples intentos no autorizados son consistentes
- ✅ Usuario eliminado es manejado correctamente

#### Suite 4: Response Structure (2 tests)
- ✅ Respuesta exitosa tiene estructura correcta
- ✅ Errores tienen estructura consistente

#### Suite 5: Error Handling (4 tests)
- ✅ Strapi errors manejados correctamente
- ✅ Network errors manejados correctamente
- ✅ Pedidos no encontrados (404)
- ✅ Datos completos de pedidos propios

#### Suite 6: Acceso Exitoso (3 tests)
- ✅ Retorna detalles completos del pedido
- ✅ Retorna items con todos los campos
- ✅ Calcula totales correctamente

### Ejecución de Tests

```bash
npm run test -- src/app/api/orders/[orderId]/__tests__/route.test.ts

✓ Test Files  1 passed (1)
✓ Tests       19 passed (19)
```

---

## 📝 Logging y Monitoreo

### Formato de Logs de Seguridad

#### Acceso Autorizado
```javascript
console.log('✅ [SECURITY AUDIT] Authorized order access:', {
  event: 'authorized_access',
  userId: 1,
  orderId: 'ORD-123',
  timestamp: '2025-12-15T10:30:00.000Z'
})
```

#### Acceso No Autorizado
```javascript
console.warn('⚠️ [SECURITY AUDIT] Unauthorized order access attempt:', {
  event: 'unauthorized_access_attempt',
  requestingUserId: 1,
  attemptedOrderId: 'ORD-999',
  timestamp: '2025-12-15T10:30:00.000Z'
})
```

### Monitoreo Recomendado

**Para MVP (Actual)**:
- Revisar logs manualmente en caso de incidentes
- Buscar patrones de `console.warn` en producción

**Para Producción Final**:
- Integrar con servicio de logging (Datadog, LogRocket, Sentry)
- Crear alertas automáticas para múltiples `console.warn` del mismo userId
- Dashboard de seguridad con métricas:
  - Intentos no autorizados por hora/día
  - Top usuarios con más intentos no autorizados
  - Top pedidos más intentados (puede indicar enumeration)

---

## 🔍 Datos Sensibles - Qué NO Loggeamos

### ❌ NUNCA en Logs
- Totales de pedidos
- Items del pedido
- Precios
- Direcciones de envío
- Información de pago
- Emails de clientes
- Teléfonos
- Nombres completos

### ✅ SÍ Loggeamos (Seguro)
- userIds (números)
- orderIds (strings)
- Timestamps
- Eventos (authorized/unauthorized)
- Status codes

---

## 🎯 Criterios de Aceptación ORD-16

| Criterio | Estado |
|----------|--------|
| Todos los tests de seguridad pasan | ✅ 19/19 |
| Tests mockean diferentes usuarios | ✅ |
| Tests verifican respuestas 200, 401, 404 | ✅ |
| Tests verifican que error 404 no filtra datos | ✅ |
| Tests verifican logging de intentos no autorizados | ✅ |
| Tests simulan escenarios de ataque | ✅ |
| Los tests son determinísticos | ✅ |
| Coverage > 80% en validación de seguridad | ✅ |

---

## 📚 Referencias

- **Endpoint**: `src/app/api/orders/[orderId]/route.ts`
- **Tests**: `src/app/api/orders/[orderId]/__tests__/route.test.ts`
- **Ownership Validator**: `src/lib/security/ownership-validator.ts`
- **Related Docs**: `docs/security/TOKENIZATION_FLOW.md`

---

## 🔄 Mejoras Futuras (Post-MVP)

1. **Rate Limiting**: Limitar número de requests por usuario/IP
2. **CAPTCHA**: Para múltiples intentos fallidos
3. **2FA**: Autenticación de dos factores para operaciones sensibles
4. **IP Whitelisting**: Para admin access
5. **Audit Log Database**: Persistir logs en BD en lugar de consola
6. **Real-time Alerts**: Notificaciones automáticas para intentos sospechosos
7. **Machine Learning**: Detectar patrones de comportamiento anómalos

---

**Última Actualización**: 2025-12-15  
**Autor**: Andres Perez  
**Ticket**: [ORD-16] Tests: No se puede acceder a pedidos de otros usuarios  
**Estado**: ✅ Completado
