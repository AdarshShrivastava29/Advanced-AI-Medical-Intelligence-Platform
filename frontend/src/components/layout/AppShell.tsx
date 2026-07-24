import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Brand } from '@/components/layout/Brand';
import { NAV_ITEMS } from '@/components/layout/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useLogout } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100',
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Authenticated app shell: fixed sidebar (desktop) + drawer (mobile) + topbar. */
export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out');
    navigate('/login');
  };

  return (
    <div className="app-gradient min-h-screen">
      <a
        href="#main"
        className="sr-only rounded-lg bg-brand-500 px-3 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/40 bg-white/40 p-4 backdrop-blur-glass dark:border-white/10 dark:bg-white/[0.02] lg:flex">
        <div className="px-2 py-2">
          <Brand />
        </div>
        <div className="mt-6 flex-1">
          <NavList />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-risk-high/10 hover:text-risk-high"
        >
          <LogOut size={18} /> Sign out
        </button>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white p-4 dark:bg-slate-950 lg:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <div className="flex items-center justify-between px-2 py-2">
                <Brand />
                <button aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="mt-6 flex-1">
                <NavList onNavigate={() => setDrawerOpen(false)} />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-risk-high"
              >
                <LogOut size={18} /> Sign out
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/40 bg-white/50 px-4 backdrop-blur-glass dark:border-white/10 dark:bg-slate-950/50 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="lg:hidden">
              <Brand compact />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-100/60 px-2.5 py-1.5 dark:bg-white/5">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-xs font-semibold text-white">
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-sm font-medium sm:block">{user.full_name}</span>
              </div>
            )}
          </div>
        </header>

        <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
