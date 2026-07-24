import { motion } from 'framer-motion';

import { cn, percent } from '@/lib/utils';

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'teal';

interface ConfidenceMeterProps {
  value: number; // 0..1
  label?: string;
  tone?: Tone;
  /** Track thickness. */
  size?: 'sm' | 'md' | 'lg';
  /** Hide the numeric readout beside the label. */
  hideValue?: boolean;
  className?: string;
}

const barTone: Record<Tone, string> = {
  brand: 'from-brand-500 to-brand-600',
  green: 'from-success-500 to-success-600',
  amber: 'from-warning-500 to-warning-600',
  red: 'from-danger-500 to-danger-600',
  teal: 'from-clinical-400 to-clinical-600',
};

const trackSize = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' } as const;

/** Animated horizontal confidence bar. */
export function ConfidenceMeter({
  value,
  label,
  tone = 'brand',
  size = 'md',
  hideValue = false,
  className,
}: ConfidenceMeterProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="truncate text-fg-muted">{label}</span>
          {!hideValue && <span className="font-semibold text-fg nums">{percent(clamped)}</span>}
        </div>
      )}
      <div
        className={cn('w-full overflow-hidden rounded-full bg-surface-sunken ring-1 ring-inset ring-line', trackSize[size])}
        role="progressbar"
        aria-valuenow={Math.round(clamped * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Confidence'}
      >
        <motion.div
          className={cn('h-full rounded-full bg-gradient-to-r', barTone[tone])}
          initial={{ width: 0 }}
          animate={{ width: `${clamped * 100}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
