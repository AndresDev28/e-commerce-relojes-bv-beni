## Desafío de Arquitectura: La Batalla de los Server vs. Client Components

    Al intentar conectar el Navbar al CartContext usando el hook useCart(), la aplicación crasheaba con un error en el servidor: 'Attempted to call useCart() from the server but useCart is on the client'. Esto era confuso, porque el Navbar es un componente de UI que claramente debería tener acceso al estado del cliente.

    Mi investigación me llevó a profundizar en la arquitectura fundamental del App Router de Next.js. Descubrí que, por defecto, todos los componentes son Server Components para optimizar el rendimiento. Los hooks de React como useState y useContext (que useCart utiliza) son exclusivos del 'mundo del cliente'. El error ocurría porque estaba intentando usar una herramienta del cliente en un entorno de servidor.

    La solución fue aplicar el patrón de arquitectura recomendado por Next.js. Convertí el Navbar y cualquier otro componente que necesitara interactividad en un Client Component añadiendo la directiva 'use client'; al principio del archivo. Esto crea un 'límite' claro, permitiendo que el esqueleto de la aplicación se renderice en el servidor para una carga rápida, mientras que las partes interactivas se 'hidratan' y cobran vida en el navegador. Esto no solo solucionó el error, sino que optimizó la aplicación al separar claramente las responsabilidades del servidor y del cliente.

## El Misterio de las Clases de Tailwind que no se Aplicaban:

    Problema: Las clases de utilidad de Tailwind no funcionaban en componentes reutilizables.

    Investigación: Descubrí que el compilador Just-In-Time (JIT) de Tailwind funciona escaneando los archivos en busca de strings literales. No puede "ejecutar" JavaScript para construir nombres de clases dinámicamente.

    Solución: Refactoricé el componente Button para definir las variantes como strings completos y literales. Para la lógica condicional, implementé la librería clsx, el estándar de la industria, que permite construir clases de forma segura y compatible con el escaneo de Tailwind.

## La Batalla por la Consistencia de Tipos:

    Problema: Tenía errores de TypeScript aparentemente aleatorios, como props href que llegaban como undefined.

    Investigación: Analicé el flujo de datos y me di cuenta de que tenía múltiples "fuentes de la verdad" para la forma de un Product. Cada componente definía sus propias props ligeramente diferentes.

    Solución: Centralicé la definición de todos los tipos de datos principales en una carpeta types. Creé una interface Product maestra y refactoricé todos los componentes (ProductCard, ProductDetailPage, etc.) para que usaran este tipo importado. Esto eliminó todas las inconsistencias y hizo el código mucho más robusto y fácil de mantener.

## El Desafío de la Integración con Strapi: De 400 Bad Request a Renderizado Robusto

    Problema: Al conectar la aplicación con Strapi, aparecían dos errores críticos: un 400 Bad Request en el fetch de productos y un runtime error "Cannot read properties of undefined (reading 'image')" en el componente FeaturedProducts.

    Investigación: El 400 venía de una construcción incorrecta de la URL de la API y parámetros de query inválidos. El runtime error se debía a que Strapi puede devolver relaciones de media como `image` (singular) o `images` (plural), y la estructura de datos no estaba normalizada para manejar ambos casos.

    Solución:
    - En `page.tsx`: Implementé construcción segura de URLs con `new URL()` y `populate='*'` para evitar queries inválidas. Añadí fallback entre variables de entorno públicas y privadas, y mejoré los mensajes de error para debugging.
    - En `FeaturedProducts.tsx`: Creé tipos flexibles para relaciones de media que soportan tanto `image` como `images`, normalización de arrays de imágenes, y defensivas para evitar crashes cuando faltan datos. Añadí un placeholder cuando no hay imágenes disponibles.

    Resultado: La aplicación ahora se conecta exitosamente a Strapi, maneja respuestas inconsistentes de la API de forma robusta, y no crashea aunque falten relaciones de media en algunos productos.

## Desafío de Integración: La Batalla contra el Desajuste de Datos (API vs. Frontend)

**Problema:** Tras configurar el backend con Strapi, la integración inicial con el frontend falló por completo. Aparecían errores `400 Bad Request` en el servidor, errores de `TypeError` en el navegador y, lo más frustrante, los componentes no renderizaban los datos a pesar de que el código parecía lógicamente correcto.

**Investigación:** Este fue un desafío de depuración multifacético que requirió un análisis profundo en ambos extremos (frontend y backend):

1.  **Análisis de la API:** Usando `curl` y tokens de API, descubrí que la estructura de datos real que devolvía mi versión de Strapi era "plana" y no contenía el objeto `attributes` anidado que esperaba. Además, el nombre del campo de media era `image` (singular), no `images`.
2.  **Análisis del `fetch`:** La construcción de la URL en los Server Components de Next.js fallaba debido a una variable de entorno incorrecta (`STRAPI_API_URL` vs `NEXT_PUBLIC_...`) y a una sintaxis de `populate` que, aunque documentada, resultaba problemática.
3.  **Análisis de Tipos:** El error más persistente venía de la falta de una "única fuente de la verdad" para los tipos. Múltiples componentes tenían definiciones locales e inconsistentes de lo que era un `Product`, causando errores de TypeScript en tiempo de compilación.

**Solución:** Implementé una solución de arquitectura de tres capas para asegurar la robustez del sistema:

1.  **Servicio de API Centralizado (`lib/api.ts`):** Creé un módulo "isomórfico" que abstrae toda la lógica de `fetch`. Maneja la construcción segura de URLs, utiliza la variable de entorno correcta para cliente/servidor y centraliza el manejo de errores.
2.  **Fuente de Tipos Única (`types/index.ts`):** Centralicé todas las `interfaces` de la aplicación, incluyendo los tipos que describen la respuesta "cruda" de la API de Strapi (`StrapiProduct`) y los tipos "limpios" que usan los componentes (`Product`).
3.  **Capa de Transformación de Datos:** En cada componente que recibe datos de la API (como `FeaturedProducts` y `ProductsPage`), implementé una lógica de mapeo dentro de un `useMemo`. Esta capa es responsable de transformar los datos "crudos" de Strapi en la estructura `Product` limpia, manejando defensivamente campos que puedan faltar y normalizando inconsistencias.

**Resultado:** La aplicación ahora se comunica con la API de forma fiable. Los componentes son agnósticos a la estructura de la API, ya que solo reciben datos limpios y predecibles. El código es más robusto, mantenible y a prueba de errores de datos.

## Desafío de Producción: La Persistencia de Imágenes y la Arquitectura "Headless" Real

**Problema:** Tras el despliegue exitoso inicial, me enfrenté a un problema crítico y silencioso: todas las imágenes subidas a Strapi a través del Media Library **desaparecían con cada nuevo despliegue del backend en Render**. Adicionalmente, las URLs de las imágenes no se resolvían correctamente en el frontend desplegado en Vercel, mostrando imágenes rotas.

**Investigación:**

1.  **Análisis del Entorno de Render:** Descubrí que la mayoría de las plataformas de despliegue modernas (como Render o Heroku) tienen un **sistema de archivos efímero**. Esto significa que cualquier archivo subido directamente al servidor se borra cuando la instancia se reinicia o se redespliega, lo cual es una práctica estándar para mantener la escalabilidad y la inmutabilidad de los servidores.
2.  **Análisis de URLs:** Me di cuenta de que Strapi, por defecto, generaba URLs relativas (ej. `/uploads/imagen.png`). Mi frontend en Vercel intentaba resolver esa ruta desde su propio dominio, no desde el dominio del backend, causando las imágenes rotas.
3.  **Investigación de Soluciones:** La solución estándar de la industria para este problema es no almacenar los archivos subidos por los usuarios en el mismo servidor que la aplicación. En su lugar, se utiliza un **proveedor de almacenamiento de objetos o una CDN (Content Delivery Network)** de terceros.

**Solución:**
Implementé una arquitectura de gestión de medios de nivel de producción, desacoplando el almacenamiento de imágenes de la aplicación del backend:

1.  **Integración de Cloudinary:** Elegí Cloudinary como mi proveedor de almacenamiento de medios. Instalé y configuré el `strapi-provider-upload-cloudinary` en mi proyecto de Strapi, añadiendo las credenciales de la API de Cloudinary como variables de entorno seguras en Render.
2.  **Actualización de la Política de Seguridad (CSP):** Modifiqué el `middleware` de seguridad de Strapi (`config/middlewares.ts`) para añadir `res.cloudinary.com` a las directivas `img-src` y `media-src`. Esto le da permiso a mi panel de administración para mostrar imágenes servidas desde Cloudinary.
3.  **Refactorización del Frontend:** Una vez que las imágenes se servían desde Cloudinary, estas ya venían con una URL absoluta y completa. Refactoricé toda la lógica de transformación de datos en mi frontend para eliminar el prefijo de `STRAPI_API_URL` que antes añadía a las URLs de las imágenes.
4.  **Configuración de `next.config.ts`:** Añadí el dominio de Cloudinary a la configuración `images.remotePatterns` en mi `next.config.ts` para permitir que el componente `<Image>` de Next.js optimice estas imágenes externas.

**Resultado:** Mi aplicación ahora tiene un sistema de gestión de imágenes robusto, persistente y altamente optimizado. Las imágenes sobreviven a los despliegues, se sirven globalmente a través de la CDN de Cloudinary para una carga ultrarrápida, y la arquitectura está verdaderamente desacoplada, siguiendo las mejores prácticas "headless".

## Desafío de UX: Navbar en páginas de autenticación (login/registro)

**Problema:** Las páginas de `login` y `registro` necesitaban ser limpias y enfocadas, sin distracciones de navegación. Sin embargo, el `Navbar` y el `Footer` aparecían (o parpadeaban) al entrar a estas rutas, rompiendo la experiencia y la jerarquía visual.

**Investigación:** En el App Router de Next.js, el `layout.tsx` raíz envuelve toda la app. Condicionar el `Navbar` ahí según la ruta puede provocar desajustes entre render de servidor y cliente, y mezcla responsabilidades que deberían estar segmentadas por áreas de la app. Además, requería una forma fiable de detectar la ruta desde el cliente.

**Solución:** Apliqué el patrón de "shell de aplicación" combinado con un layout por segmento:

1. Creé un `AppShell` como Client Component que usa `usePathname()` para detectar si la ruta actual es de auth.
2. Definí `isAuthRoute` para `'/login'` y `'/registro'` y, en esos casos, `AppShell` devuelve solo `{children}` sin `Navbar` ni `Footer`.
3. Añadí un `layout.tsx` dentro de `(auth)` que controla el fondo, el color y la altura mínima para toda la sección de auth, aislando su look&feel del layout global.
4. Mantengo los `Providers` globales (`AuthProvider`, `CartProvider`) en el `RootLayout` para que el estado esté disponible también en auth aunque el `Navbar` no se muestre.

**Resultado:** Las páginas de `login` y `registro` se renderizan sin `Navbar`/`Footer`, sin parpadeos ni desajustes, y con un diseño coherente propio. El resto de rutas conservan el layout global con navegación y pie, logrando una experiencia consistente y clara.
