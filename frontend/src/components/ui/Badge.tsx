import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types/api';

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'slate' | 'teal' | 'violet';
type BadgeVariant = 'soft' | 'solid' | 'outline';
type BadgeSize = 'sm' | 'md';

const softTones: Record<Tone, string> = {
  brand: 'bg-brand-600/10 text-brand-700 ring-brand-600/20 dark:text-accent-300 dark:ring-accent-400/25',
  green: 'bg-success-500/10 text-success-700 ring-success-500/20 dark:text-success-500',
  amber: 'bg-warning-500/10 text-warning-700 ring-warning-500/25 dark:text-warning-500',
  red: 'bg-danger-500/10 text-danger-700 ring-danger-500/20 dark:text-danger-500',
  slate: 'bg-fg/[0.06] text-fg-muted ring-line',
  teal: 'bg-clinical-600/10 text-clinical-700 ring-clinical-600/20 dark:text-clinical-300',
  violet: 'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300',
};

const solidTones: Record<Tone, string> = {
  brand: 'bg-brand-600 text-white ring-transparent',
  green: 'bg-success-600 text-white ring-transparent',
  amber: 'bg-warning-600 text-white ring-transparent',
  red: 'bg-danger-600 text-white ring-transparent',
  slate: 'bg-fg-muted text-canvas ring-transparent',
  teal: 'bg-clinical-600 text-white ring-transparent',
  violet: 'bg-violet-600 text-white ring-transparent',
};

const outlineTones: Record<Tone, string> = {
  brand: 'text-brand-700 ring-brand-500/40 dark:text-brand-300',
  green: 'text-success-700 ring-success-500/40 dark:text-success-500',
  amber: 'text-warning-700 ring-warning-500/40 dark:text-warning-500',
  red: 'text-danger-700 ring-danger-500/40 dark:text-danger-500',
  slate: 'text-fg-muted ring-line-strong',
  teal: 'text-clinical-700 ring-clinical-500/40 dark:text-clinical-300',
  violet: 'text-violet-700 ring-violet-500/40 dark:text-violet-300',
};

const dotTones: Record<Tone, string> = {
  brand: 'bg-brand-500',
  green: 'bg-success-500',
  amber: 'bg-warning-500',
  red: 'bg-danger-500',
  slate: 'bg-fg-subtle',
  teal: 'bg-clinical-500',
  violet: 'bg-violet-500',
};

const sizes: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[0.6875rem]',
  md: 'px-2.5 py-1 text-xs',
};

interface BadgeProps {
  tone?: Tone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Render a leading status dot in the tone colour. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

/** Small pill label used for status, class and metadata chips. */
export function Badge({
  tone = 'slate',
  variant = 'soft',
  size = 'md',
  dot = false,
  children,
  className,
}: BadgeProps) {
  const toneClasses =
    variant === 'solid' ? solidTones[tone] : variant === 'outline' ? outlineTones[tone] : softTones[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset',
        sizes[size],
        toneClasses,
        className,
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', variant === 'solid' ? 'bg-white/80' : dotTones[tone])}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

const riskTone: Record<RiskLevel, Tone> = { low: 'green', moderate: 'amber', high: 'red' };

/** Risk-level badge with medical colour semantics. */
export function RiskBadge({ level, size = 'md' }: { level: RiskLevel; size?: BadgeSize }) {
  return (
    <Badge tone={riskTone[level]} size={size} dot>
      {level.toUpperCase()} RISK
    </Badge>
  );
}

/** Predicted-class badge (PNEUMONIA = warning tone, NORMAL = ok tone). */
export function ClassBadge({ label, size = 'md' }: { label: string; size?: BadgeSize }) {
  return (
    <Badge tone={label.toUpperCase() === 'PNEUMONIA' ? 'red' : 'green'} size={size} dot>
      {label}
    </Badge>
  );
}

/** Live status pill with an animated halo for "healthy" states. */
export function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-fg-muted">
      <span className="relative flex h-2 w-2" aria-hidden>
        {ok && (
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success-500" />
        )}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            ok ? 'bg-success-500' : 'bg-danger-500',
          )}
        />
      </span>
      {label}
    </span>
  );
}
