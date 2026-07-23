import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Glassmorphism surface container. */
export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('glass-card p-6', className)} {...props}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

/** Standard card header with optional icon and action slot. */
export function CardHeader({ title, subtitle, action, icon }: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-500">
            {icon}
          </span>
        )}
        <div>
          <h3 className="font-semibold leading-tight">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
