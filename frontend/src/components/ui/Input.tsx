import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

/** Labelled text input with error state and optional leading icon. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-600 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            className={cn(
              'h-11 w-full rounded-xl border border-slate-200 bg-white/70 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-white/5',
              icon && 'pl-10',
              error && 'border-risk-high focus:border-risk-high focus:ring-risk-high/30',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-risk-high">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
