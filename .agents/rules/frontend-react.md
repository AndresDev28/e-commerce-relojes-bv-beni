---
trigger: always_on
---

# Antigravity Workspace Rules: Frontend (React)

## 1. Estándares de Componentes
- **Atomic Design:** Los agentes deben sugerir la creación de componentes bajo la estructura de `atoms`, `molecules` y `organisms`.
- **Prop-Types/TypeScript:** Es obligatorio definir interfaces para cada componente. Si un componente recibe un objeto "Watch", debe coincidir con el modelo del Backend.

## 2. Comunicación con el Backend (Integración)
- **Interceptor de Trace ID:** Todos los agentes que generen servicios de API (Axios/Fetch) deben incluir obligatoriamente el `trace_id` en los headers (`X-Trace-Id`) para mantener la trazabilidad global.
- **Manejo de Errores UI:** Los agentes no deben mostrar errores técnicos crípticos (ej: 500 Internal Server Error). Deben mapear los errores del backend a mensajes de usuario amigables, según la **Global Rule #5**.

## 3. Seguridad y Estado
- **Protección de PII:** Siguiendo la **Global Rule #2**, queda prohibido persistir el estado de Redux/Zustand que contenga datos personales en `localStorage` sin cifrado previo o una política de expiración corta.
- **Validación de Formularios:** Los agentes deben implementar validaciones en el cliente que sean espejo de las restricciones de `Sequelize` definidas en el Backend para evitar viajes innecesarios al servidor.

## 4. Agentes Especializados
### Agent: `UI-Performance-Observer`
- **Rol:** Optimización de renderizado.
- **Tarea:** Identificar hooks (`useMemo`, `useCallback`) mal implementados que puedan degradar la fluidez de la navegación en el catálogo de relojes.

### Agent: `Ecom-Flow-Validator`
- **Rol:** Guardián del flujo de compra.
- **Tarea:** Asegurar que el estado del carrito sea inmutable y que cualquier cambio de precio en el backend invalide la sesión de checkout actual.