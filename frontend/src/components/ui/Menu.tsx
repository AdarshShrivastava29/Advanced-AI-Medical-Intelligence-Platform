import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState, type ReactNode } from 'react';

import { useClickOutside } from '@/hooks/useClickOutside';
import { cn } from '@/lib/utils';

interface MenuProps {
  /** Render-prop for the trigger; receives the current open state. */
  trigger: (open: boolean) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: 'left' | 'right';
  /** Panel width; defaults to a comfortable menu width. */
  width?: string;
  className?: string;
  panelClassName?: string;
  label?: string;
}

/**
 * Lightweight dropdown: click to toggle, dismiss on outside-click or Escape.
 * Kept dependency-free so the topbar bundle stays small.
 */
export function Menu({
  trigger,
  children,
  align = 'right',
  width = 'w-64',
  className,
  panelClassName,
  label = 'Menu',
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="flex items-center rounded-xl outline-none"
      >
        {trigger(open)}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute z-50 mt-2 origin-top overflow-hidden rounded-xl border border-line bg-surface p-2 elevation-3',
              align === 'right' ? 'right-0' : 'left-0',
              width,
              panelClassName,
            )}
          >
            {typeof children === 'function' ? children(close) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MenuItemProps {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'danger';
  /** Trailing slot for shortcuts or counts. */
  trailing?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Single actionable row inside a `Menu`. */
export function MenuItem({
  children,
  icon,
  onClick,
  tone = 'default',
  trailing,
  disabled = false,
  className,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        tone === 'danger'
          ? 'text-danger-600 hover:bg-danger-500/10 dark:text-danger-400'
          : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing && <span className="shrink-0 text-xs text-fg-subtle">{trailing}</span>}
    </button>
  );
}

/** Section caption inside a `Menu`. */
export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="medical-label px-3 pb-1 pt-2">{children}</p>;
}

/** Hairline separator inside a `Menu`. */
export function MenuSeparator() {
  return <div className="my-2 h-px bg-line" role="separator" />;
}
