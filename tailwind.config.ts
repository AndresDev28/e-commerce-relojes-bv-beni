import { keyframes, themes } from "storybook/internal/theming";
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
      backgroundImage: {
        'radial-dark': 'radial-gradient(ellipse at center, #374151 0%, #1F2937 70%)',
      },
      fontFamily: {
        // sans: ['var(--font-oswald)'], 
        // serif: ['var(--font-lora)'],
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)'},
          '100%': { opacity: '1', transform: 'translateY(0)'}
        }
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;