import { keyframes } from "storybook/internal/theming";
import type { Config } from "tailwindcss";
import { transform } from "typescript";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Paleta de Marca ---
        primary: '#2563EB', // Azul Corporativo (blue-600)
        secondary: '#DC2626', // Rojo Corporativo (red-600)

        // --- Paleta de Texto y Fondos Base
        dark: '#272727', // Gris Fondo Logo
        light: '#ffffff',

        // --- Paleta Neutral de Apoyo ---
        'neutral-light': '#F3F4F6', // Gris muy claro para fondos (gray-100)
        'neutral-medium': '#6B7280',// Gris medio para texto secundario (gray-500)
        'neutral-dark': '#374151',  // Gris para bordes y hovers sutiles (gray-700)
      },
      fontFamily: {
        // sans: ['var(--font-oswald)'], 
        // serif: ['var(--font-lora)'],
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      },
      animation: {
        'spin': 'spin 1s linear infinite'
      }
    },
  },
  plugins: [],
};

export default config;