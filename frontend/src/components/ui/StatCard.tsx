import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: 'brand' | 'green' | 'amber' | 'red';
  hint?: string;
  delay?: number;
}

const toneClasses = {
  brand: 'text-brand-500 bg-brand-500/10',
  green: 'text-risk-low bg-risk-low/10',
  amber: 'text-risk-moderate bg-risk-moderate/10',
  red: 'text-risk-high bg-risk-high/10',
};

/** KPI tile for the dashboard/analytics. */
export function StatCard({ label, value, icon, tone = 'brand', hint, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card flex items-center gap-4 p-5"
    >
      <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl', toneClasses[tone])}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </motion.div>
  );
}
