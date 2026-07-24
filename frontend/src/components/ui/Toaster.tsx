import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { type ToastKind, useToastStore } from '@/store/toastStore';

const icons: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 size={18} aria-hidden />,
  error: <XCircle size={18} aria-hidden />,
  info: <Info size={18} aria-hidden />,
};

const iconTone: Record<ToastKind, string> = {
  success: 'bg-success-500/12 text-success-600 ring-success-500/20 dark:text-success-400',
  error: 'bg-danger-500/12 text-danger-600 ring-danger-500/20 dark:text-danger-400',
  info: 'bg-brand-500/12 text-brand-600 ring-brand-500/20 dark:text-brand-300',
};

const accent: Record<ToastKind, string> = {
  success: 'bg-success-500',
  error: 'bg-danger-500',
  info: 'bg-brand-500',
};

/** Global toast container (mount once near the app root). */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6 sm:w-full sm:max-w-sm"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 32, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 32, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-line bg-surface p-4 pr-2 text-sm elevation-3"
            role="status"
          >
            <span className={cn('absolute inset-y-0 left-0 w-1', accent[toast.kind])} aria-hidden />
            <span
              className={cn(
                'ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset',
                iconTone[toast.kind],
              )}
            >
              {icons[toast.kind]}
            </span>
            <span className="flex-1 pt-1 leading-snug text-fg">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="mt-0.5 rounded-lg p-2 text-fg-subtle transition hover:bg-surface-sunken hover:text-fg"
              aria-label="Dismiss notification"
            >
              <X size={14} aria-hidden />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
