# Integration Tests - Quick Start

Guía rápida para ejecutar los tests de integración.

## Prerrequisitos

Antes de ejecutar los integration tests, asegúrate de tener:

1. **Docker Desktop corriendo**
   ```bash
   docker --version
   # Docker version 24.0.0 or higher
   ```

2. **Strapi backend iniciado**
   ```bash
   cd ../relojes-bv-beni-api
   npm run dev
   # Espera a ver: "Server is running on http://localhost:1337"
   ```

3. **Variables de entorno configuradas**
   ```bash
   # No necesitas configurar nada manualmente
   # El setup.ts configura todo automáticamente
   ```

## Ejecutar Tests

```bash
# Ejecutar TODOS los integration tests
npm run test:integration

# Ejecutar en modo watch (re-ejecuta al cambiar código)
npm run test:integration:watch

# Ejecutar un solo test
npm run test:integration -- -t "IT-1"

# Ejecutar con logs detallados
npm run test:integration -- --reporter=verbose
```

## Tests Actuales

### [IT-1] Order Status Change Email

Valida el flujo completo:
1. Crear orden en Strapi (estado: PAID)
2. Actualizar orden a SHIPPED
3. Webhook dispara email
4. Email se envía correctamente

### [IT-2] Invalid Webhook Secret

Valida que el endpoint rechaza requests sin autenticación.

### [IT-3] Missing Required Fields

Valida que el endpoint valida los campos requeridos.

## Troubleshooting

### "Cannot connect to Strapi"

**Solución:**
```bash
# 1. Verificar Docker Desktop
docker ps

# 2. Iniciar Strapi
cd ../relojes-bv-beni-api
npm run dev
```

### "Test server already running on port 3001"

**Solución:**
```bash
# Matar proceso en puerto 3001
lsof -ti:3001 | xargs kill -9
```

### "Authentication failed with Strapi"

**Solución:**

Este error es una advertencia, no bloquea los tests. Los tests intentarán autenticarse pero continuarán sin token si falla.

## Documentación Completa

Para más detalles, ver: `/docs/integration-tests.md`

## Soporte

Si encuentras un bug o tienes dudas:

1. Revisa los logs del test (busca los 🎯, ✅, ❌)
2. Verifica que Strapi esté corriendo: `curl http://localhost:1337/api/products`
3. Revisa la documentación completa: `docs/integration-tests.md`
