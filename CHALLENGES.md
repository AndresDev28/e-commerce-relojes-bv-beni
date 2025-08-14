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
