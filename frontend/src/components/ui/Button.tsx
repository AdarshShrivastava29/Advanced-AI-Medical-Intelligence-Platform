import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/30 disabled:bg-brand-500/60',
  secondary:
    'bg-white/70 text-slate-700 border border-slate-200 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:border-white/10 dark:hover:bg-white/10',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5',
  danger: 'bg-risk-high text-white hover:brightness-110',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

/** Primary button with variants, sizes and a loading state. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all disabled:cursor-not-allowed disabled:opacity-70',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={16} aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
