# [CHALLENGE.md] Experiencia y Soluciones de Arquitectura

---

## Desafío de Arquitectura: La Batalla de los Server vs. Client Components

Al intentar conectar el `Navbar` al `CartContext` usando el hook `useCart()`, la aplicación _crasheaba_ con un error en el servidor: `'Attempted to call useCart() from the server but useCart is on the client'`. Esto era confuso, porque el `Navbar` es un componente de UI que claramente debería tener acceso al estado del cliente.

**Investigación:**
Mi investigación me llevó a profundizar en la arquitectura fundamental del **App Router de Next.js**. Descubrí que, por defecto, todos los componentes son **Server Components** para optimizar el rendimiento. Los _hooks_ de React como `useState` y `useContext` (que `useCart` utiliza) son exclusivos del 'mundo del cliente'. El error ocurría porque estaba intentando usar una herramienta del cliente en un entorno de servidor.

**Solución:**
La solución fue aplicar el patrón de arquitectura recomendado por Next.js. Convertí el `Navbar` y cualquier otro componente que necesitara interactividad en un **Client Component** añadiendo la directiva `'use client';` al principio del archivo. Esto crea un **"límite"** claro, permitiendo que el esqueleto de la aplicación se renderice en el servidor para una carga rápida, mientras que las partes interactivas se 'hidratan' y cobran vida en el navegador.

**Resultado:**
Esto no solo solucionó el error, sino que **optimizó la aplicación** al separar claramente las responsabilidades del servidor y del cliente.

---

## El Misterio de las Clases de Tailwind que no se Aplicaban

**Problema:**
Las clases de utilidad de **Tailwind CSS** no funcionaban en componentes reutilizables cuando se construían dinámicamente.

**Investigación:**
Descubrí que el compilador **Just-In-Time (JIT)** de Tailwind funciona escaneando los archivos en busca de _strings_ literales. No puede "ejecutar" JavaScript para construir nombres de clases dinámicamente.

**Solución:**
Refactoricé el componente `Button` para definir las variantes como **strings completos y literales**. Para la lógica condicional, implementé la librería **`clsx`**, el estándar de la industria, que permite construir clases de forma segura y compatible con el escaneo de Tailwind.

---

## La Batalla por la Consistencia de Tipos

**Problema:**
Tenía errores de **TypeScript** aparentemente aleatorios, como _props_ `href` que llegaban como `undefined`.

**Investigación:**
Analicé el flujo de datos y me di cuenta de que tenía múltiples **"fuentes de la verdad"** para la forma de un `Product`. Cada componente definía sus _props_ ligeramente diferentes.

**Solución:**
Centralicé la definición de todos los tipos de datos principales en una carpeta `types`. Creé una `interface Product` maestra y refactoricé todos los componentes (`ProductCard`, `ProductDetailPage`, etc.) para que usaran este tipo importado.

**Resultado:**
Esto eliminó todas las inconsistencias y hizo el código mucho **más robusto y fácil de mantener**.

---

## Desafío de Integración: La Batalla contra el Desajuste de Datos (API vs. Frontend)

**Problema:**
Tras configurar el _backend_ con **Strapi**, la integración inicial con el _frontend_ falló por completo. Aparecían errores `400 Bad Request` en el servidor, errores de `TypeError` en el navegador y, lo más frustrante, los componentes no renderizaban los datos.

**Investigación:**
Este fue un desafío de depuración multifacético:

1.  **Análisis de la API:** Descubrí que la estructura de datos real que devolvía Strapi era **"plana"** y no contenía el objeto `attributes` anidado que esperaba. Además, el campo de media era `image` (singular), no `images`.
2.  **Análisis del `fetch`:** La construcción de la URL en los Server Components fallaba debido a una variable de entorno incorrecta (`STRAPI_API_URL` vs `NEXT_PUBLIC_...`) y a una sintaxis de `populate` problemática.
3.  **Análisis de Tipos:** La falta de una **"única fuente de la verdad"** para los tipos causaba errores persistentes de TypeScript.

**Solución: Arquitectura de Tres Capas**
Implementé una solución para asegurar la robustez del sistema:

1.  **Servicio de API Centralizado (`lib/api.ts`):** Un módulo que abstrae toda la lógica de `fetch`, maneja la construcción segura de URLs y centraliza el manejo de errores.
2.  **Fuente de Tipos Única (`types/index.ts`):** Centralicé todas las `interfaces`, incluyendo tipos para la respuesta "cruda" de Strapi (`StrapiProduct`) y los tipos "limpios" (`Product`) que usan los componentes.
3.  **Capa de Transformación de Datos:** En cada componente que recibe datos, implementé una lógica de **mapeo** (`useMemo`) responsable de transformar los datos "crudos" de Strapi en la estructura `Product` limpia, manejando defensivamente campos que puedan faltar.

**Resultado:**
La aplicación ahora se comunica con la API de forma **fiable**. Los componentes solo reciben **datos limpios y predecibles**, logrando un código más robusto, mantenible y a prueba de errores de datos.

---

## Desafío de Producción: La Persistencia de Imágenes y la Arquitectura "Headless" Real

**Problema:**
Tras el despliegue exitoso inicial, todas las imágenes subidas a Strapi a través del Media Library **desaparecían con cada nuevo despliegue del _backend_** en Render. Además, las URLs de las imágenes no se resolvían correctamente en el _frontend_ desplegado en Vercel, mostrando imágenes rotas.

**Investigación:**

1.  **Entorno Efímero:** Descubrí que plataformas como Render tienen un **sistema de archivos efímero**. Cualquier archivo subido directamente al servidor se borra cuando la instancia se reinicia.
2.  **URLs Relativas:** Strapi generaba **URLs relativas** (ej. `/uploads/imagen.png`), haciendo que el _frontend_ en Vercel intentara resolver la ruta desde su propio dominio.
3.  **Solución Estándar:** La mejor práctica de la industria es utilizar un **proveedor de almacenamiento de objetos** o una **CDN** de terceros.

**Solución:**
Implementé una arquitectura de gestión de medios de nivel de producción:

1.  **Integración de Cloudinary:** Elegí **Cloudinary** como mi proveedor de almacenamiento. Instalé y configuré el `strapi-provider-upload-cloudinary`.
2.  **Refactorización del Frontend:** Las imágenes ahora venían con una URL absoluta. Refactoricé la lógica de transformación para eliminar el prefijo `STRAPI_API_URL` que se añadía antes.
3.  **Configuración de Next.js:** Añadí el dominio de Cloudinary a la configuración `images.remotePatterns` en `next.config.ts` para permitir la optimización del componente `<Image>`.

**Resultado:**
Mi aplicación ahora tiene un sistema de gestión de imágenes **robusto, persistente y altamente optimizado**. Las imágenes sobreviven a los despliegues, se sirven globalmente a través de la CDN de Cloudinary para una carga ultrarrápida, y la arquitectura está verdaderamente **desacoplada**.

---

## Desafío de UX: Navbar en páginas de autenticación (`login`/`registro`)

**Problema:**
Las páginas de `login` y `registro` necesitaban ser limpias y enfocadas. Sin embargo, el `Navbar` y el `Footer` aparecían al entrar a estas rutas, rompiendo la experiencia y la jerarquía visual.

**Investigación:**
En el App Router, el `layout.tsx` raíz envuelve toda la _app_. Condicionar el `Navbar` ahí puede provocar **desajustes entre _render_ de servidor y cliente** y mezcla responsabilidades.

**Solución: Patrón "Shell de Aplicación" y Layout por Segmento**

1.  Creé un **`AppShell`** como **Client Component** que usa `usePathname()` para detectar si la ruta actual es de autenticación.
2.  Definí `isAuthRoute` para `'/login'` y `'/registro'` y, en esos casos, `AppShell` devuelve solo `{children}` sin `Navbar` ni `Footer`.
3.  Añadí un `layout.tsx` dentro del grupo `(auth)` que controla el fondo y la altura mínima para toda esa sección, **aislando su _look&feel_**.

**Resultado:**
Las páginas de `login` y `registro` se renderizan sin `Navbar`/`Footer`, sin parpadeos ni desajustes, y con un **diseño coherente propio**.

---

# [BUGFIX] Bug de Redirección en Logout y Refactorización a Rutas Protegidas 🛡️

## 1. El Problema: Conflicto de Redirecciones (Race Condition)

Al cerrar sesión desde una página protegida (ej: `/mi-cuenta`), la aplicación redirigía incorrectamente a `/login` en lugar de a la página de inicio (`/`).

Esto era causado por una **"condición de carrera"** (_race condition_) entre dos `router.push` que se disparaban casi simultáneamente:

1.  La función **`logout`** en `AuthContext`, que intentaba enviar al usuario a **`/`**.
2.  El **`useEffect` de protección** dentro de `MiCuentaPage`, que intentaba enviar al usuario a **`/login`**.

---

## 2. El Diagnóstico: Lógica de Seguridad Desacoplada

La lógica de protección de rutas, al estar implementada dentro del mismo componente (`MiCuentaPage`), se activaba durante el proceso de _logout_ y **"ganaba" la carrera de redirecciones**.

Este error reveló una **debilidad arquitectónica**: tener la lógica de seguridad mezclada con la lógica de la UI no es escalable y requiere repetir el `useEffect` en cada nueva ruta protegida.

---

## 3. La Solución Arquitectónica: Componente `ProtectedRoute`

Se implementó una refactorización clave para centralizar la seguridad:

### Componente Wrapper

Se refactorizó la lógica de protección a un **componente _wrapper_ reutilizable:** `ProtectedRoute.tsx`.

- Este componente se encarga únicamente de **comprobar la autenticación** y **redirigir si es necesario**, mostrando un `Spinner` mientras tanto.

### Layouts Anidados (Next.js App Router)

Se creó un `layout.tsx` específico para las rutas protegidas (ej: `app/mi-cuenta/layout.tsx`) que utiliza el _wrapper_ `<ProtectedRoute>` para envolver el contenido.

**Resultado:**
Esto **desacopla** la lógica de seguridad de los componentes de la página, haciendo que las páginas sean más simples y la lógica de protección sea **centralizada y reutilizable** (principio **DRY** - _Don't Repeat Yourself_).

---

## 4. Aprendizajes Clave 💡

- **Next.js App Router:** La importancia de la importación correcta del _hook_ `useRouter` de `'next/navigation'`.
- **Debug de Race Conditions:** Cómo depurar "condiciones de carrera" entendiendo el ciclo de vida de los componentes.
- **Patrones de Diseño:** Implementación del patrón de **"Layouts Anidados"** y **"Componentes de Orden Superior"** (_Wrappers_) para gestionar responsabilidades transversales como la autenticación.

---

## Desafío de Testing: Tests de Integración Fallidos por Variables de Entorno y Paginación

**Problema:**
Al ejecutar los tests de integración para las órdenes (`orders.integration.test.ts`), surgieron múltiples fallos:

1. **Error inicial:** `Failed to parse URL from undefined/api/orders` - La variable `API_URL` no estaba disponible en el entorno de tests
2. **Tests fallidos:** 2 de 11 tests fallaban con "expected undefined to be defined" - Las órdenes recién creadas no aparecían al obtener la lista de órdenes del usuario

**Investigación:**

### Problema 1: Variables de Entorno No Disponibles
Descubrí que **Vitest no carga automáticamente archivos `.env`** como lo hace Next.js en producción. El módulo `orders.ts` importa `API_URL` de `constants.ts`, que depende de `process.env.NEXT_PUBLIC_STRAPI_API_URL`, pero esta variable era `undefined` durante la ejecución de tests.

### Problema 2: Paginación y Ordenamiento de Strapi
Mediante logging de debug, descubrí que:
- Strapi devuelve **25 órdenes por defecto** (límite de paginación)
- Las órdenes se ordenaban por `createdAt` **ascendente** (más antiguas primero)
- Las órdenes recién creadas en los tests no aparecían en la primera página de resultados

**Solución: Configuración de Testing Robusta**

### 1. Carga de Variables de Entorno en Tests (`vitest.setup.ts`)
```typescript
import { loadEnvConfig } from '@next/env'

// Cargar variables de entorno de Next.js (.env.local, etc)
loadEnvConfig(process.cwd())
```

Esto asegura que **todas las variables de entorno** de Next.js estén disponibles antes de que los módulos se importen.

### 2. Optimización de Consultas a Strapi (`orders.ts`)
Refactoricé `getUserOrders` para incluir parámetros de query que resuelven el problema de paginación:

```typescript
const queryParams = new URLSearchParams({
  'sort[0]': 'createdAt:desc',    // Más recientes primero
  'pagination[pageSize]': '100',   // Aumentar límite
})
```

### 3. Timing de Consistencia Eventual
Agregué delays estratégicos (500ms) después de crear órdenes para asegurar que Strapi procese completamente las escrituras antes de las lecturas subsecuentes.

**Resultado:**
- ✅ **11/11 tests pasando** (100% de éxito)
- Los tests de integración ahora son **confiables y determinísticos**
- Arquitectura de testing lista para **CI/CD**
- Mejor comprensión del modelo de **consistencia eventual** en sistemas distribuidos

**Aprendizajes Clave:**

- **Vitest vs Next.js:** Diferencias fundamentales en cómo cada framework maneja variables de entorno
- **API de Strapi:** Comprender los valores por defecto de paginación (`pageSize: 25`) y ordenamiento
- **Testing de Integración:** Importancia de gestionar el timing y la consistencia eventual al probar contra APIs reales
- **Query Parameters:** Uso correcto de la API de Strapi v5 con `URLSearchParams` para filtrado, ordenamiento y paginación

---

## Desafío de Strapi v5: La Relación User-Order que no Populaba (7+ horas debuggeando)

**Problema:**
Al intentar acceder a los detalles de un pedido (`/mi-cuenta/pedidos/[orderId]`), la aplicación devolvía un **error 500**. Los logs mostraban:

```
📦 Order data from Strapi: { id: 657, orderId: "ORD-1765452834-CI51", ... }
👤 Order user relation: undefined
❌ SECURITY ERROR: Order has no user relation. This should never happen.
```

Lo frustrante era que **en el Content Manager de Strapi, el usuario SÍ estaba asignado** al pedido. El problema ocurría únicamente al consultar la API.

**Investigación: Una Odisea de 7+ Horas**

Este bug requirió múltiples intentos de solución, cada uno revelando nuevas restricciones de Strapi v5:

### Intento 1: Populate Simple
```typescript
const queryParams = { 'populate': 'user' }
```
**Resultado:** `user: undefined` - Strapi v5 no populaba relaciones de `users-permissions` con la sintaxis estándar.

### Intento 2: Populate con Selección de Campos
```typescript
const queryParams = {
  'populate[user][fields][0]': 'id',
  'populate[user][fields][1]': 'email',
}
```
**Resultado:** `user: undefined` - Mismo problema. La documentación de Strapi v5 sugería esta sintaxis, pero no funcionaba para relaciones con `plugin::users-permissions.user`.

### Intento 3: Filtrar por Relación de Usuario
```typescript
const queryParams = {
  'filters[orderId][$eq]': orderId,
  'filters[user][id][$eq]': userId.toString(),
}
```
**Resultado:** `400 Bad Request: Invalid key user` - Strapi v5 **no permite filtrar directamente por relaciones de users-permissions** en queries públicas.

### Hipótesis Descartada: Permisos
Verificamos que el rol **Authenticated** tenía todos los permisos necesarios (`find`, `findOne`, `create`, `update`) tanto para `Order` como para `User`. El problema no era de permisos.

**Causa Raíz:**
Strapi v5 tiene **restricciones de seguridad específicas** para el plugin `users-permissions`. Las relaciones con usuarios:
- No se pueden poblar (`populate`) desde la REST API pública
- No se pueden usar como filtro (`filters[user][id]`) en queries
- Estas restricciones existen para prevenir la exposición de datos de usuarios

**Solución: Validación de Propiedad en Dos Pasos**

Implementé un enfoque alternativo que aprovecha el hecho de que Strapi **sí filtra los pedidos por usuario autenticado** internamente:

```typescript
// 1. Obtener la lista de pedidos del usuario (ya filtrada por Strapi)
const userOrdersUrl = `${API_URL}/api/orders?sort[0]=createdAt:desc&pagination[pageSize]=100`

const userOrdersResponse = await fetch(userOrdersUrl, {
  headers: { Authorization: `Bearer ${jwtToken}` },
})

const userOrdersData = await userOrdersResponse.json()
const userOrderIds = userOrdersData.data.map(o => o.orderId)

// 2. Validar que el orderId solicitado pertenece al usuario
if (!userOrderIds.includes(orderId)) {
  return NextResponse.json({ error: 'Order not found' }, { status: 404 })
}

// 3. Encontrar y devolver el pedido de la lista ya obtenida
const order = userOrdersData.data.find(o => o.orderId === orderId)
```

**Por qué funciona:**
- Strapi aplica automáticamente un filtro por usuario cuando se usa JWT authentication
- El endpoint `/api/orders` devuelve **solo los pedidos del usuario autenticado**
- Al verificar si el `orderId` está en esa lista, validamos la propiedad sin necesitar populate ni filter por user

**Resultado:**
- ✅ Los detalles del pedido ahora se muestran correctamente
- ✅ La validación de propiedad funciona de forma segura
- ✅ Pedidos de otros usuarios devuelven 404 (no revelan existencia)
- ✅ Compatible con las restricciones de seguridad de Strapi v5

**Aprendizajes Clave:**

1. **Strapi v5 vs v4:** El plugin `users-permissions` tiene restricciones adicionales en v5 que no están claramente documentadas
2. **Debugging Sistemático:** La importancia de agregar logs detallados (`Strapi error body:`) para entender respuestas de error
3. **Pensamiento Lateral:** Cuando una API no permite hacer algo directamente, buscar formas alternativas de lograr el mismo objetivo
4. **Seguridad por Diseño:** Las restricciones de Strapi existen por buenas razones - la solución final respeta el modelo de seguridad en lugar de intentar evitarlo
5. **Documentación:** Cuando un bug toma 7+ horas, **documentarlo** para el "yo del futuro" y otros desarrolladores

---

## Desafío de Workflow: Primera Vez Usando GitHub CLI y Problemática de Branches Anidadas

**Contexto:**
Al completar ORD-17 (centralización del enum `OrderStatus`) y ORD-18 (refactor del componente `StatusBadge`), surgió la necesidad de crear Pull Requests desde la línea de comandos. Esta fue mi primera experiencia usando **GitHub CLI (`gh`)** y reveló una problemática de gestión de branches que no había anticipado.

**Problema Inicial: Branches Anidadas**

Durante el desarrollo:
1. Creé la branch `EPIC-15/ORD-17` desde `main`
2. Hice push: `git push --set-upstream origin EPIC-15/ORD-17`
3. **Inmediatamente después** creé `EPIC-15/ORD-18` con: `git checkout -b EPIC-15/ORD-18`

**Consecuencia:**
```
main (36554ef)
  │
  └─── EPIC-15/ORD-17 (commit b6f5d9f)
         │
         └─── EPIC-15/ORD-18 (commits 571c13e + 1d4651b)
                └── Incluye el commit de ORD-17
```

La branch `ORD-18` **contenía los 3 commits**: 1 de ORD-17 + 2 de ORD-18. Esto significaba que crear un PR de ORD-18 hacia `main` incluiría cambios de ambos tickets.

**Descubrimiento: gh CLI y el Error "No commits between branches"**

Al intentar crear el PR de ORD-17:
```bash
gh pr create --base main --head EPIC-15/ORD-17 --title "..." --body "..."
```

**Error recibido:**
```
pull request create failed: GraphQL: No commits between main and EPIC-15/ORD-17
```

**Investigación:**
Este error reveló que **ORD-17 ya había sido mergeado a `main`** en una sesión anterior (PR #21, mergeado el 17-dic-2025), pero mi `main` local estaba desactualizado.

**Problema Adicional: Permisos SSH**

Al intentar sincronizar:
```bash
git pull origin main
# Error: git@github.com: Permission denied (publickey)
```

El repositorio estaba configurado con SSH, pero las claves no estaban disponibles en el entorno actual.

**Solución Implementada:**

### 1. Instalación de GitHub CLI
```bash
brew install gh
gh auth login  # Autenticación vía navegador
gh auth status # Verificación
```

### 2. Resolución de Sincronización
Como SSH fallaba pero `gh` usa HTTPS y funcionaba:
```bash
# Cambiar temporalmente a HTTPS
git remote set-url origin https://github.com/AndresDev28/e-commerce-relojes-bv-beni.git

# Sincronizar main
git pull origin main
# Resultado: Actualizó de 36554ef a c1e7a63 (incluye ORD-17)

# Restaurar SSH
git remote set-url origin git@github.com:AndresDev28/e-commerce-relojes-bv-beni.git
```

### 3. Rebase de ORD-18 para Limpieza de Commits
```bash
git checkout EPIC-15/ORD-18
git log main..EPIC-15/ORD-18 --oneline
# Mostraba 2 commits únicos (los de ORD-18)

git rebase main
# ✅ Rebase exitoso sin conflictos

git push origin EPIC-15/ORD-18 --force-with-lease
# Force push necesario porque rebase cambió la historia
```

**Resultado del Rebase:**
- Los commits de ORD-18 obtuvieron nuevos hashes (ddccaba y 6ff471d)
- La branch quedó limpia: solo 2 commits de ORD-18 sobre main actualizado
- Historia lineal y organizada

### 4. Creación y Merge de PR con gh CLI
```bash
# Crear PR con descripción completa
gh pr create --base main --head EPIC-15/ORD-18 \
  --title "[EPIC-15][ORD-18] Refactor StatusBadge with smart icon display logic" \
  --body "$(cat <<'EOF'
[Descripción completa en inglés...]
EOF
)"
# Resultado: https://github.com/AndresDev28/e-commerce-relojes-bv-beni/pull/22

# Mergear con squash (combina commits en uno)
gh pr merge 22 --squash --delete-branch
# ✅ PR #22 mergeado exitosamente
```

**Comandos de GitHub CLI Aprendidos:**

| Comando | Propósito |
|---------|-----------|
| `gh auth login` | Autenticar con GitHub (abre navegador) |
| `gh auth status` | Verificar estado de autenticación |
| `gh pr create` | Crear PR desde CLI con título y body |
| `gh pr view [number]` | Ver detalles de un PR |
| `gh pr list` | Listar PRs (con filtros opcionales) |
| `gh pr merge` | Mergear PR con opciones (--squash, --merge, --rebase) |
| `gh repo sync` | Sincronizar branch con remote |

**Ventajas de gh CLI:**
- ✅ No salir del terminal para crear/mergear PRs
- ✅ Permite descripciones completas con heredocs
- ✅ Usa HTTPS (funciona cuando SSH falla)
- ✅ Integración perfecta con el flujo de Git
- ✅ Mantiene historial de PRs

**Aprendizajes Clave:**

1. **Branch Strategy:** Siempre crear branches desde `main` actualizado, no desde otras feature branches, a menos que haya dependencia explícita
2. **Flujo Correcto:**
   ```bash
   git checkout main
   git pull origin main          # Actualizar primero
   git checkout -b EPIC-15/ORD-XX
   ```
3. **Rebase vs Merge:** El `--force-with-lease` es más seguro que `--force` porque verifica que no haya cambios remotos no sincronizados
4. **gh CLI vs UI:** Para PRs simples, gh CLI es más rápido. Para PRs con revisión de código extensiva, la UI de GitHub sigue siendo mejor
5. **Troubleshooting:** Cuando Git da errores oscuros, siempre verificar:
   - ¿Está `main` actualizado?
   - ¿Qué commits tiene cada branch? (`git log main..feature`)
   - ¿Hay PRs existentes? (`gh pr list`)
6. **HTTPS vs SSH:** Tener ambos métodos configurados es útil. gh CLI usa HTTPS y puede servir como fallback cuando SSH falla

**Resultado Final:**
- ✅ PR #21 (ORD-17) - Mergeado previamente
- ✅ PR #22 (ORD-18) - Creado y mergeado exitosamente desde CLI
- ✅ Historia de commits limpia y organizada
- ✅ Nuevo conocimiento de herramientas para flujo de trabajo más eficiente

**Próximos Pasos:**
Para evitar el problema de branches anidadas en el futuro, documenté el flujo recomendado:
1. Mergear ticket anterior primero
2. Actualizar `main` local
3. Crear nueva branch desde `main` actualizado
4. Esto mantiene cada PR independiente y fácil de revisar

---

