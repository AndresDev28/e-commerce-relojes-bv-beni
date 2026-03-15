---
trigger: always_on
---

## 8. Restricciones de Ejecución y Estabilidad (Hardware Aware)

- **Ejecución Segura de Tests (Vitest):**
  - **Contexto:** Debido a la alta densidad de núcleos en hardware i7-HX, el paralelismo por defecto de Vitest satura la memoria RAM al competir con los agentes de IA.
  - **Comando Obligatorio:** Queda estrictamente prohibido el uso de `npx vitest` sin límites. Los agentes deben ejecutar exclusivamente:
    ```bash
    npx vitest run --maxWorkers=2
    ```
  - **Justificación:** Limitar a 2 workers controla los picos de RAM, previene el desbordamiento de la pila (stack overflow) y mantiene la estabilidad del entorno de Antigravity.

- **Monitoreo de Procesos:**
  - Si un agente detecta un cuelgue del sistema o lag extremo, debe detener cualquier proceso de background y verificar el estado del `PID` de Node antes de reintentar.