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
        primary: "#fff",
        primaryDark: "rgba(255,255,255,0.7)",
        secondary: "#fb923c",
      },
      backgroundImage: {
        radialBlack:
          "linear-gradient(225.95deg, #ffffff 0%, #6d6d6d 0%, #11101d 91.61%)",
        radialOrange: 
          "linear-gradient(90deg, #f97316 0%, rgba(253, 186, 116, 0.6) 95.83%)",
        lightOrange:
          "linear-gradient(90deg, #fb923c 0%, rgba(255, 237, 213, 0.86) 95.83%)",
        bannerImg: "url('/hero-image.jpg')",
        blackOverlay:
          "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.9) 100%)",
      },
      boxShadow: {
        dark: "0px 20px 100px -10px rgba(66, 71, 91, 0.1)",
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