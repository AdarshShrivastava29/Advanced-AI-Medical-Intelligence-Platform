/** @type {import('tailwindcss').Config} */
// Design tokens mirror docs/22_Design_System.md: medical blue/teal palette, risk
// semantics, glassmorphism surfaces, and a class-based dark-mode strategy.
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        risk: {
          low: '#16a34a',
          moderate: '#d97706',
          high: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(2, 132, 199, 0.12)',
      },
      backdropBlur: {
        glass: '14px',
      },
    },
  },
  plugins: [],
};
