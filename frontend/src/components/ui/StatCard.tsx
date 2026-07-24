import { motion } from 'framer-motion';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { Sparkline } from '@/components/ui/Sparkline';
import { cn } from '@/lib/utils';

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'teal';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: Tone;
  hint?: string;
  delay?: number;
  /** Period-over-period change in percent; sign drives the trend colour. */
  trend?: number;
  /** Caption for the trend chip (e.g. "vs. previous 14 days"). */
  trendLabel?: string;
  /** Series for the background sparkline. */
  series?: number[];
  /** Renders the whole tile as a link-like surface with a hover lift. */
  interactive?: boolean;
  className?: string;
}

const iconTone: Record<Tone, string> = {
  brand: 'text-brand-600 bg-brand-500/10 ring-brand-500/15 dark:text-brand-300',
  green: 'text-success-600 bg-success-500/10 ring-success-500/15 dark:text-success-400',
  amber: 'text-warning-600 bg-warning-500/10 ring-warning-500/20 dark:text-warning-400',
  red: 'text-danger-600 bg-danger-500/10 ring-danger-500/15 dark:text-danger-400',
  teal: 'text-clinical-600 bg-clinical-500/10 ring-clinical-500/15 dark:text-clinical-300',
};

const sparkColor: Record<Tone, string> = {
  brand: '#2f83f7',
  green: '#16a34a',
  amber: '#f59e0b',
  red: '#e11d48',
  teal: '#14b8a6',
};

/** KPI tile for the dashboard/analytics: icon, metric, trend chip and sparkline. */
export function StatCard({
  label,
  value,
  icon,
  tone = 'brand',
  hint,
  delay = 0,
  trend,
  trendLabel,
  series,
  interactive = false,
  className,
}: StatCardProps) {
  const trendValue = typeof trend === 'number' && Number.isFinite(trend) ? trend : null;
  const direction =
    trendValue === null ? 'flat' : trendValue > 0.05 ? 'up' : trendValue < -0.05 ? 'down' : 'flat';
  const TrendIcon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'surface-card group relative overflow-hidden p-6',
        interactive && 'lift cursor-pointer',
        className,
      )}
    >
      {/* Tone wash — barely-there brand tint that warms on hover. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-10 h-24 w-24 rounded-full bg-current opacity-[0.04] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.09]"
        style={{ color: sparkColor[tone] }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg-muted">{label}</p>
          <p className="mt-2 font-display text-[1.75rem] font-bold leading-none text-fg nums">{value}</p>
        </div>
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition-transform duration-300 ease-premium group-hover:scale-105',
            iconTone[tone],
          )}
          aria-hidden
        >
          {icon}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {trendValue !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold nums',
                direction === 'up' && 'bg-success-500/10 text-success-600 dark:text-success-400',
                direction === 'down' && 'bg-danger-500/10 text-danger-600 dark:text-danger-400',
                direction === 'flat' && 'bg-fg/[0.06] text-fg-muted',
              )}
            >
              <TrendIcon size={14} aria-hidden />
              {trendValue > 0 ? '+' : ''}
              {trendValue.toFixed(1)}%
            </span>
          )}
          {(trendLabel ?? hint) && (
            <p className="mt-1 truncate text-xs text-fg-subtle">{trendLabel ?? hint}</p>
          )}
        </div>
        {series && series.length > 1 && (
          <Sparkline data={series} color={sparkColor[tone]} className="shrink-0 opacity-90" />
        )}
      </div>
    </motion.div>
  );
}
