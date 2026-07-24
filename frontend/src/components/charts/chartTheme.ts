import { useThemeStore } from '@/store/themeStore';

/** Categorical series colours — clinical blue → teal → cyan, never neon. */
export const SERIES = {
  primary: '#0f4c81',
  primaryLight: '#367abc',
  secondary: '#1f7a8c',
  accent: '#5bc0eb',
  normal: '#15803d',
  pneumonia: '#b42318',
  neutral: '#94a3b8',
} as const;

/** Sequential ramp for ordered bands (e.g. confidence deciles). */
export const BAND_RAMP = ['#bdd8ef', '#8ed4f2', '#5bc0eb', '#2b869a', '#0f4c81'] as const;

export interface ChartTheme {
  axis: string;
  grid: string;
  gridOpacity: number;
  cursor: string;
  tooltip: {
    borderRadius: number;
    border: string;
    background: string;
    color: string;
    fontSize: number;
    boxShadow: string;
    padding: string;
  };
  tooltipLabel: { color: string; fontWeight: number; marginBottom: number };
}

/**
 * Recharts needs concrete colour values, so chart chrome is resolved from the
 * theme store rather than Tailwind classes. Keeps axes and tooltips legible in
 * both light and dark mode.
 */
export function useChartTheme(): ChartTheme {
  const isDark = useThemeStore((s) => s.theme) === 'dark';

  return {
    axis: isDark ? '#8b9cb5' : '#6b7c96',
    grid: isDark ? '#3a4d68' : '#c3d0e0',
    gridOpacity: isDark ? 0.5 : 0.7,
    cursor: isDark ? 'rgba(148,163,184,0.10)' : 'rgba(15,76,129,0.06)',
    tooltip: {
      borderRadius: 12,
      border: `1px solid ${isDark ? '#3a4d68' : '#dfe7f0'}`,
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#e8eef7' : '#0e1b2e',
      fontSize: 12,
      boxShadow: isDark
        ? '0 12px 28px -12px rgba(0,0,0,0.6)'
        : '0 12px 28px -12px rgba(15,42,76,0.25)',
      padding: '10px 12px',
    },
    tooltipLabel: {
      color: isDark ? '#9fb0c8' : '#4a5a73',
      fontWeight: 600,
      marginBottom: 4,
    },
  };
}
