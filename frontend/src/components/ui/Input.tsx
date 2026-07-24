import { AlertCircle } from 'lucide-react';
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils';

/** Shared control chrome so inputs, selects and textareas stay pixel-identical. */
const fieldBase =
  'w-full rounded-xl border border-line bg-surface text-sm text-fg shadow-sm outline-none transition-all duration-200 placeholder:text-fg-subtle ' +
  'hover:border-line-strong focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle';

const fieldError =
  'border-danger-500 hover:border-danger-500 focus:border-danger-500 focus:ring-danger-500/20';

interface FieldShellProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Label + description + error scaffolding shared by every form control. */
function FieldShell({ id, label, hint, error, required, children, className }: FieldShellProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-fg">
          {label}
          {required && (
            <span className="ml-0.5 text-danger-500" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-xs font-medium text-danger-600">
          <AlertCircle size={13} aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-fg-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  /** Trailing adornment — e.g. a password reveal toggle or unit suffix. */
  trailing?: ReactNode;
  containerClassName?: string;
}

/** Labelled text input with error/hint states and leading/trailing adornments. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, hint, icon, trailing, className, containerClassName, id, required, ...props },
    ref,
  ) => {
    const reactId = useId();
    const inputId = id ?? props.name ?? reactId;
    return (
      <FieldShell
        id={inputId}
        label={label}
        hint={hint}
        error={error}
        required={required}
        className={containerClassName}
      >
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={cn(
              fieldBase,
              'h-11 px-3.5',
              icon && 'pl-10',
              trailing && 'pr-11',
              error && fieldError,
              className,
            )}
            {...props}
          />
          {trailing && (
            <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center text-fg-subtle">
              {trailing}
            </span>
          )}
        </div>
      </FieldShell>
    );
  },
);
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

/** Multi-line text control matching the Input chrome. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, containerClassName, id, required, rows = 4, ...props }, ref) => {
    const reactId = useId();
    const fieldId = id ?? props.name ?? reactId;
    return (
      <FieldShell
        id={fieldId}
        label={label}
        hint={hint}
        error={error}
        required={required}
        className={containerClassName}
      >
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(fieldBase, 'resize-y px-3.5 py-2.5 leading-relaxed', error && fieldError, className)}
          {...props}
        />
      </FieldShell>
    );
  },
);
Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

/** Native select styled to match the Input chrome (keeps mobile UX intact). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, containerClassName, id, required, children, ...props }, ref) => {
    const reactId = useId();
    const fieldId = id ?? props.name ?? reactId;
    return (
      <FieldShell
        id={fieldId}
        label={label}
        hint={hint}
        error={error}
        required={required}
        className={containerClassName}
      >
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(
            fieldBase,
            "h-11 appearance-none bg-[length:1.15em] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-10",
            "bg-[url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%237a8aa2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
            error && fieldError,
            className,
          )}
          {...props}
        >
          {children}
        </select>
      </FieldShell>
    );
  },
);
Select.displayName = 'Select';
