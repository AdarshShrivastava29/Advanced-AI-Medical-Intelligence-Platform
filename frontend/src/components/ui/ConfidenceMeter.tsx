import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { percent } from '@/lib/utils';

interface ConfidenceMeterProps {
  value: number; // 0..1
  label?: string;
  tone?: 'brand' | 'green' | 'amber' | 'red';
}

const toneClasses: Record<NonNullable<ConfidenceMeterProps['tone']>, string> = {
  brand: 'bg-brand-500',
  green: 'bg-risk-low',
  amber: 'bg-risk-moderate',
  red: 'bg-risk-high',
};

/** Animated horizontal confidence bar. */
export function ConfidenceMeter({ value, label, tone = 'brand' }: ConfidenceMeterProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">{label}</span>
          <span className="font-semibold tabular-nums">{percent(clamped)}</span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
        <motion.div
          className={cn('h-full rounded-full', toneClasses[tone])}
          initial={{ width: 0 }}
          animate={{ width: `${clamped * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
