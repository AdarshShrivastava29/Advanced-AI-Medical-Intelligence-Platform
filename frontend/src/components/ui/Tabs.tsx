import { motion } from 'framer-motion';
import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Optional count/status chip rendered after the label. */
  badge?: ReactNode;
  disabled?: boolean;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `underline` for page-level sections, `pill` for compact in-card switches. */
  variant?: 'underline' | 'pill';
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

/**
 * Accessible tab rail with an animated active indicator (shared layoutId).
 * Roving focus is handled natively by the browser via `role="tab"` buttons.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = 'underline',
  size = 'md',
  className,
  'aria-label': ariaLabel = 'Sections',
}: TabsProps<T>) {
  const layoutId = useId();
  const isPill = variant === 'pill';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'no-scrollbar flex items-center gap-1 overflow-x-auto',
        isPill
          ? 'rounded-xl border border-line bg-surface-muted p-1'
          : 'border-b border-line',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 whitespace-nowrap font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
              size === 'sm' ? 'text-xs' : 'text-sm',
              isPill
                ? cn('rounded-lg px-3', size === 'sm' ? 'h-7' : 'h-9')
                : cn('px-3', size === 'sm' ? 'pb-2 pt-1' : 'pb-3 pt-1.5'),
              active ? 'text-brand-700 dark:text-brand-300' : 'text-fg-muted hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className={cn(
                  'absolute',
                  isPill
                    ? 'inset-0 rounded-lg bg-surface shadow-sm ring-1 ring-line'
                    : 'inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600',
                )}
                aria-hidden
              />
            )}
            <span className="relative flex items-center gap-2">
              {item.icon}
              {item.label}
              {item.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Panel paired with `Tabs`; renders nothing unless it is the active tab. */
export function TabPanel({
  active,
  children,
  className,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!active) return null;
  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
