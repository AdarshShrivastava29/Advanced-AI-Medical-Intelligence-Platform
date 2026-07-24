import { motion } from 'framer-motion';
import { useId } from 'react';

import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  /** Hide the visible label (still announced to screen readers). */
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Accessible on/off control used across settings panels. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  hideLabel = false,
  disabled = false,
  className,
}: SwitchProps) {
  const id = useId();
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      {!hideLabel && (
        <label htmlFor={id} className="min-w-0 cursor-pointer select-none">
          <span className="block text-sm font-medium text-fg">{label}</span>
          {description && <span className="mt-0.5 block text-xs text-fg-muted">{description}</span>}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-brand-600' : 'bg-line-strong',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <motion.span
          className="block h-5 w-5 rounded-full bg-white shadow-sm"
          animate={{ x: checked ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </button>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Segmented control for mutually exclusive, low-cardinality choices. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: SegmentedProps<T>) {
  const layoutId = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-line bg-surface-muted p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex items-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
              active ? 'text-brand-700 dark:text-brand-300' : 'text-fg-muted hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-surface shadow-sm ring-1 ring-line"
                aria-hidden
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
