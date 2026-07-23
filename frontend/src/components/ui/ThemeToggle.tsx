import { Moon, Sun } from 'lucide-react';

import { useThemeStore } from '@/store/themeStore';

/** Dark/light mode toggle button. */
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
