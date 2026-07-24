import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/themeStore';

/** Dark/light mode toggle with a cross-fading icon. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={cn(
        'relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 70, scale: 0.6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="absolute grid place-items-center"
        >
          {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
