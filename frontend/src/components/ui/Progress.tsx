import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'teal';

const strokeTone: Record<Tone, string> = {
  brand: 'stroke-brand-500',
  green: 'stroke-success-500',
  amber: 'stroke-warning-500',
  red: 'stroke-danger-500',
  teal: 'stroke-clinical-500',
};

const fillTone: Record<Tone, string> = {
  brand: 'bg-brand-500',
  green: 'bg-success-500',
  amber: 'bg-warning-500',
  red: 'bg-danger-500',
  teal: 'bg-clinical-500',
};

interface ProgressBarProps {
  /** 0..100 */
  value: number;
  tone?: Tone;
  size?: 'xs' | 'sm' | 'md';
  /** Renders a moving stripe for unknown-duration work (e.g. uploads). */
  indeterminate?: boolean;
  label?: string;
  className?: string;
}

const barHeights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5' } as const;

/** Linear determinate/indeterminate progress track. */
export function ProgressBar({
  value,
  tone = 'brand',
  size = 'sm',
  indeterminate = false,
  label,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-surface-sunken', barHeights[size], className)}
      role="progressbar"
      aria-label={label ?? 'Progress'}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {indeterminate ? (
        <motion.div
          className={cn('h-full w-1/3 rounded-full', fillTone[tone])}
          animate={{ x: ['-100%', '320%'] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <motion.div
          className={cn('h-full rounded-full', fillTone[tone])}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </div>
  );
}

interface RadialGaugeProps {
  /** 0..1 */
  value: number;
  tone?: Tone;
  size?: number;
  thickness?: number;
  /** Centre content — defaults to the percentage. */
  children?: ReactNode;
  label?: string;
  className?: string;
}

/**
 * Circular confidence gauge. Used for the headline prediction confidence and
 * any single-value clinical score.
 */
export function RadialGauge({
  value,
  tone = 'brand',
  size = 148,
  thickness = 10,
  children,
  label = 'Confidence',
  className,
}: RadialGaugeProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={cn('relative grid place-items-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${(clamped * 100).toFixed(1)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-line"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className={strokeTone[tone]}
          initial={{ strokeDashoffset: circumference, r: radius }}
          animate={{ strokeDashoffset: circumference * (1 - clamped) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
