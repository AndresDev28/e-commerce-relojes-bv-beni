# Setup de Producción - E-commerce Relojes BV Beni

**Última actualización:** 13 Marzo 2026  
**Objetivo:** Preparar infraestructura completa para soft launch

---

## 🎯 Tickets para Linear

### EPIC: Infraestructura de Producción

---

#### 1. Backend - Railway

| Ticket     | Título                                   | Descripción                                                 |
| ---------- | ---------------------------------------- | ----------------------------------------------------------- |
| **INF-01** | Crear proyecto Strapi en Railway         | Crear proyecto nuevo en Railway, configurar región (Europa) |
| **INF-02** | Configurar PostgreSQL en Railway         | Crear database PostgreSQL, obtener connection string        |
| **INF-03** | Desplegar Strapi en Railway              | Deploy del backend, verificar build exitoso                 |
| **INF-04** | Configurar variables de entorno prod     | DATABASE_URL, JWT_SECRET, ADMIN_JWT, API_TOKEN, CLOUDINARY  |
| **INF-05** | Configurar Cloudinary para media         | Conectar cuenta Cloudinary, verificar uploads funcionan     |
| **INF-06** | Configurar dominio api.relojesbvbeni.com | CNAME en DNS, SSL automático                                |
| **INF-07** | Testing APIs en producción               | Verificar endpoints funcionan: products, categories, auth   |

---

#### 2. Frontend - Vercel

| Ticket     | Título                               | Descripción                                             |
| ---------- | ------------------------------------ | ------------------------------------------------------- |
| **INF-08** | Verificar proyecto en Vercel         | Confirmar que el proyecto Next.js ya está conectado     |
| **INF-09** | Configurar variables de entorno prod | NEXT_PUBLIC_STRAPI_API_URL, STRIPE keys, RESEND_API_KEY |
| **INF-10** | Configurar dominio principal         | A record para relojesbvbeni.com → Vercel                |
| **INF-11** | Configurar redirect www → non-www    | Redirección en Vercel para consistencia SEO             |
| **INF-12** | Verificar SSL válido                 | Certificate emitido para ambos dominios                 |

---

#### 3. DNS y Dominios

| Ticket     | Título                    | Descripción                                                  |
| ---------- | ------------------------- | ------------------------------------------------------------ |
| **INF-13** | Configurar DNS en Abansys | A record @ → Vercel, CNAME api → Railway, CNAME www → Vercel |
| **INF-14** | Verificar propagación DNS | Usar tools like whatsmydns.net, esperar 24-48h               |
| **INF-15** | Probar SSL en producción  | Verificar HTTPS funciona en ambos dominios                   |

---

#### 4. Email - Zoho Mail

| Ticket     | Título                                  | Descripción                                            |
| ---------- | --------------------------------------- | ------------------------------------------------------ |
| **INF-16** | Crear cuenta Zoho Mail                  | Registar dominio en Zoho, verificar propiedad          |
| **INF-17** | Configurar buzón info@relojesbvbeni.com | Crear buzón, configurar credenciales                   |
| **INF-18** | Configurar Resend con dominio propio    | Verificar dominio emisor en Resend (DNS records)       |
| **INF-19** | Testing emails en producción            | Enviar email de prueba, verificar llega y no va a spam |

---

#### 5. Servicios Externos

| Ticket     | Título                                | Descripción                                        |
| ---------- | ------------------------------------- | -------------------------------------------------- |
| **INF-20** | Activar Stripe modo Live              | Cambiar de test a live, obtener claves production  |
| **INF-21** | Configurar webhooks Stripe producción | Endpoint: api.relojesbvbeni.com/api/webhook-stripe |
| **INF-22** | Verificar Cloudinary en producción    | Plan actual, límites, bandwidth disponible         |
| **INF-23** | Testing completo de pagos             | Hacer compra test con tarjeta real (monto mínimo)  |

---

#### 6. Monitoring y Backup

| Ticket     | Título                        | Descripción                                          |
| ---------- | ----------------------------- | ---------------------------------------------------- |
| **INF-24** | Configurar Vercel Analytics   | Habilitar analytics, verificar datos fluyen          |
| **INF-25** | Configurar Railway logs       | Ver logs en tiempo real, setup retención             |
| **INF-26** | Configurar backups PostgreSQL | Verificar backups automáticos habilitados            |
| **INF-27** | Configurar uptime monitoring  | Crear cuenta UptimeRobot, monitorizar ambos dominios |

---

## 📋 Checklist Ejecutivo

```
Semana 1:
INF-01 → INF-02 → INF-03 → INF-04 → INF-05 → INF-06 → INF-07
    ↓
INF-08 → INF-09 → INF-10 → INF-11 → INF-12
    ↓
INF-13 → INF-14 → INF-15

Semana 2:
INF-16 → INF-17 → INF-18 → INF-19
    ↓
INF-20 → INF-21 → INF-22 → INF-23
    ↓
INF-24 → INF-25 → INF-26 → INF-27
```

---

## ⏱️ Estimación

| Fase               | Horas      |
| ------------------ | ---------- |
| Backend Railway    | 3-4h       |
| Frontend Vercel    | 2h         |
| DNS y Dominios     | 1-2h       |
| Email Zoho         | 2-3h       |
| Servicios externos | 2h         |
| Monitoring         | 1-2h       |
| **Total**          | **11-15h** |

---

## ⚠️ Notas Importantes

1. **DNS**: Configurar 3-4 días antes del soft launch para que propague
2. **Stripe Live**: Solo activar después de testing completo en test mode
3. **Zoho**: Puede tomar 24-48h verificar dominio
4. **Health Check**: Endpoint disponible en `/api/health` para monitoring

---

## 🔧 Variables de Entorno Requeridas

### Producción - Vercel

```
NEXT_PUBLIC_STRAPI_API_URL=https://api.relojesbvbeni.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=pedidos@relojesbvbeni.com
WEBHOOK_SECRET=...
DEV_EMAIL=
```

### Producción - Railway

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
ADMIN_JWT_SECRET=...
API_TOKEN_STRAPI=...
CLOUDINARY_NAME=...
CLOUDINARY_KEY=...
CLOUDINARY_SECRET=...
```

---

## 📞 URLs de Producción

| Servicio       | URL                                  |
| -------------- | ------------------------------------ |
| Frontend       | https://relojesbvbeni.com            |
| Backend API    | https://api.relojesbvbeni.com        |
| Health Check   | https://relojesbvbeni.com/api/health |
| Email (Resend) | pedidos@relojesbvbeni.com            |
