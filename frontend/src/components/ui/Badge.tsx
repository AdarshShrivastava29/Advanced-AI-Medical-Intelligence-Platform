import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types/api';

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'slate';

const tones: Record<Tone, string> = {
  brand: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
  green: 'bg-risk-low/10 text-risk-low',
  amber: 'bg-risk-moderate/10 text-risk-moderate',
  red: 'bg-risk-high/10 text-risk-high',
  slate: 'bg-slate-500/10 text-slate-500 dark:text-slate-300',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

/** Small pill label. */
export function Badge({ tone = 'slate', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const riskTone: Record<RiskLevel, Tone> = { low: 'green', moderate: 'amber', high: 'red' };

/** Risk-level badge with medical colour semantics. */
export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge tone={riskTone[level]}>{level.toUpperCase()} RISK</Badge>;
}

/** Predicted-class badge (PNEUMONIA = warning tone, NORMAL = ok tone). */
export function ClassBadge({ label }: { label: string }) {
  return <Badge tone={label.toUpperCase() === 'PNEUMONIA' ? 'red' : 'green'}>{label}</Badge>;
}
