import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
// Clinical design tokens (docs/22_Design_System.md).
//
// Palette anchors:
//   primary   #0F4C81  (brand-700)    — deep clinical blue
//   secondary #1F7A8C  (clinical-600) — medical teal
//   accent    #5BC0EB  (accent-400)   — diagnostic cyan
//   canvas    #F5F8FC light · #0F172A dark
//   card      #FFFFFF light · #1E293B dark
//
// Two families of colour tokens live here:
//   * Fixed scales (brand, clinical, accent, navy, risk, status) — hues that
//     stay put regardless of theme.
//   * Themed aliases (canvas, surface, line, fg) — resolved from CSS custom
//     properties in src/styles/index.css so one utility (e.g. `bg-surface`)
//     renders correctly in both light and dark mode.
const themed = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Themed surface aliases -------------------------------------
        canvas: themed('--c-canvas'),
        surface: {
          DEFAULT: themed('--c-surface'),
          muted: themed('--c-surface-muted'),
          raised: themed('--c-surface-raised'),
          sunken: themed('--c-surface-sunken'),
        },
        line: {
          DEFAULT: themed('--c-line'),
          strong: themed('--c-line-strong'),
        },
        fg: {
          DEFAULT: themed('--c-fg'),
          muted: themed('--c-fg-muted'),
          subtle: themed('--c-fg-subtle'),
        },

        // ---- Primary: deep clinical blue --------------------------------
        brand: {
          50: '#f0f6fc',
          100: '#dceaf7',
          200: '#bdd8ef',
          300: '#90bce3',
          400: '#5c99d2',
          500: '#367abc',
          600: '#205f9f',
          700: '#0f4c81',
          800: '#0e3f6b',
          900: '#10365a',
          950: '#0a2138',
        },

        // ---- Secondary: medical teal ------------------------------------
        clinical: {
          50: '#eff8fa',
          100: '#d7edf1',
          200: '#b0dbe4',
          300: '#7cc1d0',
          400: '#47a1b5',
          500: '#2b869a',
          600: '#1f7a8c',
          700: '#1c6373',
          800: '#1c5260',
          900: '#1b4551',
          950: '#0d2c36',
        },

        // ---- Accent: diagnostic cyan (AI signals, highlights) -----------
        accent: {
          200: '#c4e8f8',
          300: '#8ed4f2',
          400: '#5bc0eb',
          500: '#33a8d9',
          600: '#1f8bb8',
          700: '#1c7096',
        },

        // ---- Deep navy: dark-mode chrome + hero panels -------------------
        navy: {
          50: '#f4f7fb',
          100: '#e6edf6',
          200: '#cbd9ec',
          300: '#a2bbdb',
          400: '#7295c5',
          500: '#4f74ad',
          600: '#3c5b91',
          700: '#2f4266',
          800: '#233149',
          900: '#1e293b',
          925: '#172033',
          950: '#0f172a',
          975: '#0a1120',
        },

        // ---- Clinical risk semantics ------------------------------------
        risk: {
          low: '#15803d',
          moderate: '#b45309',
          high: '#b42318',
        },

        // ---- Status semantics -------------------------------------------
        // The 400 step exists for dark mode only: the 500/600 steps drop to
        // ~3:1 on the #1E293B card and fail AA for status text.
        success: {
          50: '#ecfdf3',
          100: '#d1fadf',
          400: '#47cd89',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
        },
        warning: {
          50: '#fffaeb',
          100: '#fef0c7',
          400: '#fdb022',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
        },
        danger: {
          50: '#fef3f2',
          100: '#fee4e2',
          400: '#f97066',
          500: '#d92d20',
          600: '#b42318',
          700: '#912018',
        },
        info: {
          50: '#f0f6fc',
          100: '#dceaf7',
          500: '#367abc',
          600: '#205f9f',
          700: '#0f4c81',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      fontSize: {
        // Tight, editorial display sizes for page titles and hero headings.
        'display-sm': ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em' }],
        'display-md': ['2.25rem', { lineHeight: '2.625rem', letterSpacing: '-0.022em' }],
        'display-lg': ['3rem', { lineHeight: '3.375rem', letterSpacing: '-0.026em' }],
        'display-xl': ['3.75rem', { lineHeight: '4rem', letterSpacing: '-0.03em' }],
        // Uppercase micro-label used for clinical field captions.
        label: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.09em' }],
      },

      borderRadius: {
        '4xl': '1.75rem',
        panel: '1.75rem',
      },

      spacing: {
        18: '4.5rem',
        70: '17.5rem',
      },

      boxShadow: {
        // Layered, low-opacity elevation — premium rather than heavy.
        card: '0 1px 2px rgba(15, 42, 76, 0.04), 0 2px 8px -2px rgba(15, 42, 76, 0.06)',
        'card-hover': '0 2px 4px rgba(15, 42, 76, 0.05), 0 14px 30px -12px rgba(15, 42, 76, 0.16)',
        elevated: '0 8px 24px -8px rgba(15, 42, 76, 0.14), 0 24px 56px -24px rgba(15, 42, 76, 0.22)',
        panel: '0 24px 64px -28px rgba(15, 42, 76, 0.30), 0 2px 6px -2px rgba(15, 42, 76, 0.08)',
        glass: '0 8px 32px rgba(15, 76, 129, 0.08)',
        'glass-lg': '0 20px 60px -12px rgba(15, 76, 129, 0.18)',
        focus: '0 0 0 3px rgba(54, 122, 188, 0.32)',
      },

      backdropBlur: {
        glass: '12px',
      },

      transitionTimingFunction: {
        // `DEFAULT` makes every bare `transition` share the product's easing, so
        // hovers across the app decelerate identically instead of drifting
        // between Tailwind's default ease and the ad-hoc curves in components.
        DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)',
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },

      transitionDuration: {
        DEFAULT: '200ms',
      },

      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.6' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'ecg-sweep': {
          '0%': { strokeDashoffset: '1400' },
          '100%': { strokeDashoffset: '0' },
        },
        'scan-line': {
          '0%, 100%': { transform: 'translateY(-8%)', opacity: '0' },
          '10%, 90%': { opacity: '1' },
          '50%': { transform: 'translateY(108%)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
      },

      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 0.5s ease-out',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        float: 'float 6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.24, 0, 0.38, 1) infinite',
        'ecg-sweep': 'ecg-sweep 4s linear infinite',
        'scan-line': 'scan-line 3.6s ease-in-out infinite',
        breathe: 'breathe 5s ease-in-out infinite',
      },
    },
  },
  plugins: [typography],
};
