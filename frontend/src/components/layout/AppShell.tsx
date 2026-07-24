import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { CommandPalette } from '@/components/layout/CommandPalette';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useSystemAlerts } from '@/hooks/usePlatform';
import { useLogout } from '@/hooks/useAuth';
import { CLINICAL_DISCLAIMER } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/store/layoutStore';
import { useToast } from '@/store/toastStore';

/** Authenticated app shell: collapsible sidebar (desktop) + drawer (mobile) + topbar. */
export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const alerts = useSystemAlerts();
  const logout = useLogout();
  const navigate = useNavigate();
  const toast = useToast();
  const { pathname } = useLocation();

  const handleSignOut = useCallback(async () => {
    await logout();
    toast.info('Signed out');
    navigate('/login');
  }, [logout, navigate, toast]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Ctrl/⌘ + K opens global search.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Surface out-of-distribution alerts as a badge on the History destination.
  // Memoised so the (memoised) sidebar does not re-render on unrelated state.
  const reviewCount = alerts.filter((alert) => alert.tone === 'warning').length;
  const navBadges = useMemo(() => ({ '/history': reviewCount }), [reviewCount]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <div className="app-gradient min-h-screen">
      <a
        href="#main"
        className="sr-only rounded-lg bg-brand-600 px-3 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[90]"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="glass-chrome no-print fixed inset-y-0 left-0 z-30 hidden border-r lg:block"
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleSidebar}
          onSignOut={handleSignOut}
          badges={navBadges}
        />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-navy-975/50 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeDrawer}
              aria-hidden
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[17.5rem] border-r border-line bg-surface elevation-3 lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close navigation menu"
                className="absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-fg-subtle transition hover:bg-surface-sunken hover:text-fg"
              >
                <X size={18} aria-hidden />
              </button>
              <Sidebar
                variant="drawer"
                collapsed={false}
                onNavigate={closeDrawer}
                onSignOut={handleSignOut}
                badges={navBadges}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      {/* `print:pl-0` drops the sidebar gutter so printed reports use the full page. */}
      <div
        className={cn(
          'transition-[padding] duration-300 ease-premium print:pl-0',
          collapsed ? 'lg:pl-20' : 'lg:pl-[17.5rem]',
        )}
      >
        <div className="no-print">
          <Topbar
            onOpenDrawer={openDrawer}
            onOpenSearch={openSearch}
            onSignOut={handleSignOut}
          />
        </div>

        <main
          id="main"
          className="mx-auto w-full max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0"
        >
          <Outlet />
        </main>

        <footer className="no-print mx-auto w-full max-w-[90rem] px-4 pb-8 sm:px-6 lg:px-8">
          <p className="border-t border-line pt-6 text-xs leading-relaxed text-fg-subtle">
            {CLINICAL_DISCLAIMER}
          </p>
        </footer>
      </div>

      <CommandPalette open={searchOpen} onClose={closeSearch} />
    </div>
  );
}
