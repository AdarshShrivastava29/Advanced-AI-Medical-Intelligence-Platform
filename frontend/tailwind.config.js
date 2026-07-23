import typography from '@tailwindcss/typography';

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
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        teal: {
          300: '#5eead4',
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
        'glass-lg': '0 20px 60px -12px rgba(2, 132, 199, 0.25)',
      },
      backdropBlur: {
        glass: '14px',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 0.5s ease-out',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [typography],
};
