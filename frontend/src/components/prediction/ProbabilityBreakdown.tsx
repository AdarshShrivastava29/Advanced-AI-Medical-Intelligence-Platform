import { motion } from 'framer-motion';
import { memo } from 'react';

import { cn, percent } from '@/lib/utils';

interface ProbabilityBreakdownProps {
  probabilities: Record<string, number>;
  predictedClass: string;
}

const barTone = (label: string, isPredicted: boolean): string => {
  if (!isPredicted) return 'bg-line-strong';
  return label.toUpperCase() === 'PNEUMONIA'
    ? 'bg-gradient-to-r from-danger-500 to-danger-600'
    : 'bg-gradient-to-r from-success-500 to-success-600';
};

/** Per-class softmax breakdown, highlighting the winning class. */
export const ProbabilityBreakdown = memo(function ProbabilityBreakdown({ probabilities, predictedClass }: ProbabilityBreakdownProps) {
  const entries = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);

  return (
    <ul className="space-y-4">
      {entries.map(([label, value], index) => {
        const isPredicted = label === predictedClass;
        return (
          <li key={label}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span
                className={cn(
                  'truncate text-sm',
                  isPredicted ? 'font-semibold text-fg' : 'text-fg-muted',
                )}
              >
                {label}
                {isPredicted && (
                  <span className="ml-2 rounded bg-brand-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:bg-accent-400/10 dark:text-accent-300">
                    Predicted
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'shrink-0 text-sm nums',
                  isPredicted ? 'font-bold text-fg' : 'font-medium text-fg-muted',
                )}
              >
                {percent(value)}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-sunken ring-1 ring-inset ring-line">
              <motion.div
                className={cn('h-full rounded-full', barTone(label, isPredicted))}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
                transition={{ duration: 0.9, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
});
