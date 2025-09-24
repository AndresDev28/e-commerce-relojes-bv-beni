// lib/constants.ts

// 1. Leemos la URL base de la API desde las variables de entorno
export const API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL

// 2. Definimos los endpoints específicos de la API
export const AUTH_LOGIN_ENDPOINT = '/api/auth/local'
export const AUTH_REGISTER_ENDPOINT = '/api/auth/local/register'
export const PRODUCTS_ENDPOINT = '/api/products'
// ...y así con todos los demás que necesites
