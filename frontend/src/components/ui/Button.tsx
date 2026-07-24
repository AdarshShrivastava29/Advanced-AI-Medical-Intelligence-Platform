import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle' | 'outline';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Leading adornment rendered before the label (hidden while loading). */
  leadingIcon?: ReactNode;
  /** Trailing adornment rendered after the label. */
  trailingIcon?: ReactNode;
  /** Stretch to the full width of the parent. */
  block?: boolean;
}

const variants: Record<Variant, string> = {
  // Primary sits on #0F4C81 in both themes — 8.7:1 against white text.
  primary:
    'bg-brand-700 text-white shadow-sm shadow-brand-900/20 hover:bg-brand-800 hover:shadow-md hover:shadow-brand-900/25 active:bg-brand-900 disabled:bg-brand-700/55 disabled:shadow-none',
  secondary:
    'border border-line bg-surface text-fg shadow-sm hover:border-line-strong hover:bg-surface-muted active:bg-surface-sunken',
  outline:
    'border border-brand-600/40 bg-brand-600/[0.05] text-brand-700 hover:border-brand-600 hover:bg-brand-600/10 dark:border-accent-400/40 dark:bg-accent-400/[0.07] dark:text-accent-300 dark:hover:border-accent-400',
  subtle:
    'bg-brand-600/10 text-brand-700 hover:bg-brand-600/[0.16] dark:bg-accent-400/10 dark:text-accent-300 dark:hover:bg-accent-400/[0.18]',
  ghost: 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
  danger:
    'bg-danger-600 text-white shadow-sm shadow-danger-700/25 hover:bg-danger-700 active:bg-danger-700 disabled:bg-danger-600/55',
};

const sizes: Record<Size, string> = {
  xs: 'h-7 gap-1.5 rounded-lg px-2.5 text-xs',
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-sm',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-6 text-[0.9375rem]',
  icon: 'h-10 w-10 rounded-xl',
  'icon-sm': 'h-9 w-9 rounded-lg',
};

/**
 * Primary action control. Variants map to the design-system intent scale
 * (primary → destructive), sizes include square icon-only presets.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leadingIcon,
      trailingIcon,
      block = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-200 ease-premium',
        'active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={16} aria-hidden />
      ) : (
        leadingIcon && <span className="shrink-0">{leadingIcon}</span>
      )}
      {children}
      {trailingIcon && !loading && <span className="shrink-0">{trailingIcon}</span>}
    </button>
  ),
);
Button.displayName = 'Button';

interface IconButtonProps extends Omit<ButtonProps, 'size' | 'children'> {
  /** Required: icon-only controls need an accessible name. */
  label: string;
  icon: ReactNode;
  size?: 'icon' | 'icon-sm';
}

/** Icon-only button that enforces an accessible label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, size = 'icon', variant = 'ghost', ...props }, ref) => (
    <Button ref={ref} aria-label={label} title={label} size={size} variant={variant} {...props}>
      {icon}
    </Button>
  ),
);
IconButton.displayName = 'IconButton';
