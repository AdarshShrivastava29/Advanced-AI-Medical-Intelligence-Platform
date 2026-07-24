import { motion, type HTMLMotionProps } from 'framer-motion';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type CardVariant = 'solid' | 'glass' | 'outline' | 'sunken';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const variantClasses: Record<CardVariant, string> = {
  solid: 'surface-card',
  glass: 'glass-card',
  outline: 'rounded-2xl border border-line bg-transparent',
  sunken: 'rounded-2xl border border-line bg-surface-muted',
};

const paddingClasses: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  /** Adds a hover lift + shadow transition (use for clickable cards). */
  interactive?: boolean;
}

/** Primary content surface. Defaults to the opaque enterprise card. */
export function Card({
  className,
  children,
  variant = 'solid',
  padding = 'md',
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        variantClasses[variant],
        paddingClasses[padding],
        interactive && 'lift cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface AnimatedCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  /** Stagger offset in seconds, for grids that reveal sequentially. */
  delay?: number;
}

/** Card that fades/rises into view — used for dashboard grids. */
export function AnimatedCard({
  className,
  children,
  variant = 'solid',
  padding = 'md',
  delay = 0,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(variantClasses[variant], paddingClasses[padding], className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
  /** Small caption rendered above the title. */
  eyebrow?: string;
  /** Draw a hairline under the header block. */
  divided?: boolean;
  className?: string;
}

/** Standard card header with optional icon, eyebrow and action slot. */
export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  eyebrow,
  divided = false,
  className,
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        'mb-5 flex items-start justify-between gap-3',
        divided && 'border-b border-line pb-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 ring-1 ring-inset ring-brand-500/15 dark:text-brand-300">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="medical-label mb-1">{eyebrow}</p>}
          <h3 className="truncate text-base font-semibold leading-tight text-fg">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Muted footer strip for card-level actions or metadata. */
export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm text-fg-muted',
        className,
      )}
    >
      {children}
    </div>
  );
}
