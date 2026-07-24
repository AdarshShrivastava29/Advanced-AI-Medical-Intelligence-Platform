import { motion } from 'framer-motion';
import { ArrowLeft, Home, LifeBuoy, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/Button';
import { EmptyArt } from '@/components/visuals/EmptyArt';
import { useAuthStore } from '@/store/authStore';

/** 404 route. */
export function NotFoundPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const homeTo = isAuthenticated ? '/dashboard' : '/';

  return (
    <div className="app-gradient flex min-h-screen flex-col px-6 py-8">
      <Link to={homeTo} className="w-fit rounded-xl" aria-label="AIMIP home">
        <Brand />
      </Link>

      <div className="flex flex-1 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg rounded-[28px] border border-line bg-surface p-8 text-center shadow-panel sm:p-10"
        >
          <EmptyArt
            kind="search"
            className="mx-auto h-28 w-40 text-brand-600/50 dark:text-accent-400/45"
          />

          <p className="medical-label mt-6">Error 404</p>
          <h1 className="mt-2 font-display text-display-sm font-bold text-fg">Page not found</h1>
          <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-fg-muted">
            This route does not exist in the platform. It may have been moved, or the link you
            followed was incomplete.
          </p>

          <p className="mx-auto mt-4 max-w-sm truncate rounded-lg bg-surface-sunken px-3 py-2 font-mono text-[11px] text-fg-subtle">
            {pathname}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <Link to={homeTo}>
              <Button leadingIcon={<Home size={16} />}>
                {isAuthenticated ? 'Back to dashboard' : 'Back to home'}
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              leadingIcon={<ArrowLeft size={16} />}
            >
              Go back
            </Button>
          </div>

          {isAuthenticated && (
            <div className="mt-7 border-t border-line pt-5">
              <p className="text-xs text-fg-subtle">
                <span className="inline-flex items-center gap-1.5">
                  <Search size={12} aria-hidden /> Press{' '}
                  <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px]">
                    ⌘K
                  </kbd>{' '}
                  to search the workspace
                </span>
              </p>
            </div>
          )}
        </motion.div>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-fg-subtle">
        <LifeBuoy size={12} aria-hidden /> Still stuck? Contact your platform administrator.
      </p>
    </div>
  );
}
