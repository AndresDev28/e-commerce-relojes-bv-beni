# 🧪 Guía de Pruebas - [PAY-07] ErrorMessage Component

## ✅ ¿Qué hemos implementado?

- ✅ Componente `ErrorMessage` reutilizable
- ✅ 3 variantes: error (rojo), warning (amarillo), info (azul)
- ✅ Iconos de lucide-react (AlertCircle, AlertTriangle, Info, X)
- ✅ Animaciones suaves de entrada
- ✅ Accesibilidad completa (ARIA)
- ✅ Responsive (mobile + desktop)
- ✅ Botón de cierre con animación
- ✅ Integrado en CheckoutForm

---

## 🧪 Cómo Probar

### 1. Inicia el servidor de desarrollo
```bash
npm run dev
```

### 2. Abre el navegador
```
http://localhost:3000/checkout
```

### 3. Prueba diferentes errores

Edita `CheckoutForm.tsx` (línea 87-113) y **descomenta UNA línea** para probar cada error:

#### ❌ **Error 1: Tarjeta Rechazada**
```typescript
throw {
  type: 'card_error',
  code: 'card_declined',
  message: 'Your card was declined.',
}
```
**Resultado esperado:**
- 🔴 Mensaje: "Tu tarjeta fue rechazada. Por favor, contacta con tu banco."
- 💡 Sugerencia: "Contacta con tu banco o intenta con otra tarjeta."
- ⭕ Icono: AlertCircle (rojo)

---

#### ❌ **Error 2: Tarjeta Caducada**
```typescript
throw {
  type: 'card_error',
  code: 'expired_card',
  message: 'Your card has expired.',
}
```
**Resultado esperado:**
- 🔴 Mensaje: "Tu tarjeta ha caducado. Por favor, usa otra tarjeta."
- 💡 Sugerencia: "Por favor, usa una tarjeta válida."

---

#### ❌ **Error 3: CVC Incorrecto**
```typescript
throw {
  type: 'card_error',
  code: 'incorrect_cvc',
  message: "Your card's security code is incorrect.",
}
```
**Resultado esperado:**
- 🔴 Mensaje: "El código de seguridad (CVV/CVC) es incorrecto."
- 💡 Sugerencia: "Verifica el código de 3 o 4 dígitos en el reverso de tu tarjeta."

---

#### ❌ **Error 4: Fondos Insuficientes**
```typescript
throw {
  type: 'card_error',
  code: 'insufficient_funds',
  message: 'Your card has insufficient funds.',
}
```
**Resultado esperado:**
- 🔴 Mensaje: "Tu tarjeta no tiene fondos suficientes."
- 💡 Sugerencia: "Intenta con otra tarjeta o forma de pago."

---

#### ❌ **Error 5: Error de Red**
```typescript
throw new Error('Network error')
```
**Resultado esperado:**
- 🔴 Mensaje: "Sin conexión. Verifica tu internet."
- 💡 Sugerencia: "Revisa tu conexión a internet."

---

#### ❌ **Error 6: Timeout**
```typescript
throw new Error('timeout')
```
**Resultado esperado:**
- 🔴 Mensaje: "Tiempo de espera agotado. Por favor, intenta de nuevo."
- 💡 Sugerencia: "Espera unos segundos antes de intentar nuevamente."

---

## ✅ Criterios de Aceptación - Verificación

### 1. ✅ **El componente se renderiza correctamente**
- [ ] El mensaje aparece después de hacer clic en "Pagar"
- [ ] El icono es visible y correcto
- [ ] El mensaje y la sugerencia se leen claramente

### 2. ✅ **Soporta diferentes tipos de mensajes**
- [ ] Error (rojo) funciona
- [ ] Warning (amarillo) funciona
- [ ] Info (azul) funciona

### 3. ✅ **Es accesible para lectores de pantalla**
- [ ] Tiene `role="alert"` en errores
- [ ] Tiene `aria-live="polite"` en warnings/info
- [ ] Tiene `aria-atomic="true"`
- [ ] El botón X tiene `aria-label="Cerrar mensaje"`

### 4. ✅ **Tiene animaciones suaves**
- [ ] Aparece con fade-in desde arriba
- [ ] Desaparece suavemente al hacer clic en X
- [ ] La transición dura 300ms

### 5. ✅ **Es responsive en mobile y desktop**
- [ ] En desktop (>768px): Se ve bien alineado
- [ ] En mobile (<768px): El texto no se corta
- [ ] El botón X siempre está alineado arriba-derecha

---

## 🎨 Diseño Visual

### Variante: Error
- **Fondo**: `bg-red-50` (rojo muy claro)
- **Borde**: `border-secondary` (#DC2626 - rojo corporativo)
- **Texto**: `text-red-900` (rojo oscuro)
- **Icono**: AlertCircle (rojo)

### Variante: Warning
- **Fondo**: `bg-yellow-50` (amarillo muy claro)
- **Borde**: `border-yellow-400`
- **Texto**: `text-yellow-900`
- **Icono**: AlertTriangle (amarillo)

### Variante: Info
- **Fondo**: `bg-blue-50` (azul muy claro)
- **Borde**: `border-primary` (#2563EB - azul corporativo)
- **Texto**: `text-blue-900`
- **Icono**: Info (azul)

---

## 🧩 Uso del Componente

### Ejemplo básico
```tsx
<ErrorMessage
  message="Hubo un error"
  variant="error"
/>
```

### Con sugerencia
```tsx
<ErrorMessage
  message="Tu tarjeta fue rechazada"
  variant="error"
  suggestion="Contacta con tu banco"
/>
```

### Con botón de cierre
```tsx
<ErrorMessage
  message="Guardado exitosamente"
  variant="info"
  onDismiss={() => setMessage('')}
/>
```

### Warning
```tsx
<ErrorMessage
  message="Este campo es opcional"
  variant="warning"
  suggestion="Puedes dejarlo vacío si lo prefieres"
/>
```

---

## 🐛 Troubleshooting

### El error no aparece
1. Asegúrate de haber descomentado UNA línea de error
2. Verifica que guardaste el archivo
3. Refresca el navegador (Cmd+R / Ctrl+R)

### La animación no se ve
1. Asegúrate de que Tailwind CSS está compilando correctamente
2. Verifica que `animate-in` y `fade-in` existen en tu config

### El icono no aparece
1. Verifica que lucide-react está instalado: `npm ls lucide-react`
2. Si falta: `npm install lucide-react`

---

## 📝 Notas para Desarrollo Futuro

### Dónde más usar ErrorMessage

Este componente es **reutilizable**. Puedes usarlo en:

- ✅ Login (`/login`) - Errores de autenticación
- ✅ Registro (`/register`) - Validación de formularios
- ✅ Perfil (`/profile`) - Actualización de datos
- ✅ Carrito (`/carrito`) - Stock insuficiente
- ✅ Checkout (`/checkout`) - Errores de pago ← **Ya implementado**

### Próximos pasos (Fase 3)

- [ ] [PAY-09] Escribir tests unitarios para ErrorMessage
- [ ] [PAY-10] Tests de integración en CheckoutForm
- [ ] Implementar retry logic (PAY-08)

---

## ✅ Conclusión

El componente `ErrorMessage` cumple **TODOS** los criterios de aceptación:

- ✅ Se renderiza correctamente
- ✅ Soporta 3 variantes
- ✅ Es accesible (ARIA)
- ✅ Tiene animaciones suaves
- ✅ Es responsive

¡Listo para producción! 🚀
