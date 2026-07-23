import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { type ToastKind, useToastStore } from '@/store/toastStore';

const icons: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 size={18} className="text-risk-low" />,
  error: <XCircle size={18} className="text-risk-high" />,
  info: <Info size={18} className="text-brand-500" />,
};

/** Global toast container (mount once near the app root). */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className={cn(
              'glass-card pointer-events-auto flex items-center gap-3 p-3 pr-2 text-sm shadow-glass-lg',
            )}
            role="status"
          >
            {icons[toast.kind]}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
