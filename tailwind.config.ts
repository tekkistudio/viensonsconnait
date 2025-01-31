import type { Config } from "tailwindcss";

export default {
  darkMode: 'class', // Activation explicite du mode sombre
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          blue: '#132D5D',    // couleur primaire
          pink: '#FF7E93',    // couleur secondaire
          white: '#F9FAFB',   // couleur de fond claire
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        // Ajout des couleurs pour le mode sombre
        dark: {
          background: '#1a1b1e',
          surface: '#2b2c2f',
          primary: '#2563EB',
          text: {
            primary: '#ffffff',
            secondary: '#9ca3af'
          }
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'], // Police par défaut pour le front
        inter: ['var(--font-inter)', 'sans-serif'], // Police pour l'admin
      },
      keyframes: {
        "accordion-down": {
          from: { height: '0' },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: '0' },
        },
        "fade-in": {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        "fade-out": {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        "zoom-in": {
          from: { transform: "scale(0.95)" },
          to: { transform: "scale(1)" },
        },
        "zoom-out": {
          from: { transform: "scale(1)" },
          to: { transform: "scale(0.95)" },
        },
        "slide-in-top": {
          from: { transform: "translateY(-2%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-out-top": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(-2%)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 100ms cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-out": "fade-out 100ms cubic-bezier(0.4, 0, 0.2, 1)",
        "zoom-in": "zoom-in 100ms cubic-bezier(0.4, 0, 0.2, 1)",
        "zoom-out": "zoom-out 100ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in-top": "slide-in-top 100ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-out-top": "slide-out-top 100ms cubic-bezier(0.4, 0, 0.2, 1)"
      },
      typography: (theme: any) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.900'),
            a: {
              color: theme('colors.brand.blue'),
              '&:hover': {
                color: theme('colors.brand.pink'),
              },
            },
            'h1, h2, h3, h4': {
              color: theme('colors.brand.blue'),
              fontWeight: '700',
            },
          },
        },
        dark: {
          css: {
            color: theme('colors.gray.100'),
            a: {
              color: theme('colors.blue.400'),
              '&:hover': {
                color: theme('colors.blue.300'),
              },
            },
            'h1, h2, h3, h4': {
              color: theme('colors.white'),
              fontWeight: '700',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
} satisfies Config;