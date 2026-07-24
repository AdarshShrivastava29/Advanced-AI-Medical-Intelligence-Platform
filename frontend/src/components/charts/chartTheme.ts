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
  /** Surface colour for chart-drawn elements (active dots, donut gaps). */
  tooltipSurface: string;
}

/**
 * Recharts needs concrete colour values, so chart chrome is resolved from the
 * theme store rather than Tailwind classes. Keeps axes and tooltips legible in
 * both light and dark mode.
 */
export function useChartTheme(): ChartTheme {
  const isDark = useThemeStore((s) => s.theme) === 'dark';

  return {
    axis: isDark ? '#8b9cb5' : '#5a6b84',
    grid: isDark ? '#2a3a52' : '#dfe7f0',
    gridOpacity: isDark ? 0.9 : 1,
    cursor: isDark ? 'rgba(91,192,235,0.07)' : 'rgba(15,76,129,0.05)',
    tooltipSurface: isDark ? '#1e293b' : '#ffffff',
  };
}
