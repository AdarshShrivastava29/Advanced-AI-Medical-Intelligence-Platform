import { AlertTriangle, CheckCircle2, Info, ShieldAlert, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type AlertTone = 'info' | 'success' | 'warning' | 'danger' | 'clinical';

const toneClasses: Record<AlertTone, string> = {
  info: 'border-brand-500/25 bg-brand-500/[0.07] text-brand-800 dark:text-brand-200',
  success: 'border-success-500/25 bg-success-500/[0.07] text-success-700 dark:text-success-400',
  warning: 'border-warning-500/30 bg-warning-500/[0.08] text-warning-700 dark:text-warning-400',
  danger: 'border-danger-500/25 bg-danger-500/[0.07] text-danger-700 dark:text-danger-400',
  clinical: 'border-line bg-surface-muted text-fg-muted',
};

const iconTone: Record<AlertTone, string> = {
  info: 'text-brand-600 dark:text-brand-300',
  success: 'text-success-600 dark:text-success-400',
  warning: 'text-warning-600 dark:text-warning-400',
  danger: 'text-danger-600 dark:text-danger-400',
  clinical: 'text-fg-subtle',
};

const defaultIcons: Record<AlertTone, ReactNode> = {
  info: <Info size={18} aria-hidden />,
  success: <CheckCircle2 size={18} aria-hidden />,
  warning: <AlertTriangle size={18} aria-hidden />,
  danger: <XCircle size={18} aria-hidden />,
  clinical: <ShieldAlert size={18} aria-hidden />,
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Inline banner for clinical warnings, disclaimers and system notices. */
export function Alert({ tone = 'info', title, children, icon, action, className }: AlertProps) {
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'note'}
      className={cn('flex items-start gap-3 rounded-xl border px-4 py-4 text-sm', toneClasses[tone], className)}
    >
      <span className={cn('mt-0.5 shrink-0', iconTone[tone])}>{icon ?? defaultIcons[tone]}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold leading-snug">{title}</p>}
        {children && <div className={cn('leading-relaxed', title && 'mt-1 opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
