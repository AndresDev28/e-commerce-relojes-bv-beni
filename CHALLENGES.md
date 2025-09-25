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
