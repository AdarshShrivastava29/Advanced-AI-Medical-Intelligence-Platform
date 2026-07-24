import { AnimatePresence, motion } from 'framer-motion';
import { Building2, ChevronLeft, LogOut, ShieldCheck } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import { Brand } from '@/components/layout/Brand';
import { NAV_SECTIONS, type NavItem } from '@/components/layout/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { useSystemStatus, type SystemState } from '@/hooks/usePlatform';
import { ORG_NAME, ORG_UNIT, ROLE_LABEL } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const statusDot: Record<SystemState, string> = {
  operational: 'bg-success-500',
  degraded: 'bg-warning-500',
  offline: 'bg-danger-500',
  unknown: 'bg-fg-subtle',
};

/** Determines whether a nav item owns the current route (incl. child routes). */
function isItemActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.to) return true;
  return Boolean(item.matchPrefix && pathname.startsWith(`${item.matchPrefix}/`));
}

interface SidebarNavProps {
  collapsed: boolean;
  onNavigate?: () => void;
  /** Counts keyed by route — currently only the alert badge on History. */
  badges?: Record<string, number>;
}

function SidebarNav({ collapsed, onNavigate, badges = {} }: SidebarNavProps) {
  const { pathname } = useLocation();

  return (
    <nav className="flex flex-col gap-6" aria-label="Primary">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title ?? 'primary'}>
          {section.title && !collapsed && (
            <p className="medical-label mb-2 px-3">{section.title}</p>
          )}
          {section.title && collapsed && <div className="mx-3 mb-2 h-px bg-line" aria-hidden />}

          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = isItemActive(item, pathname);
              const count = badges[item.to] ?? 0;
              const link = (
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center rounded-xl text-sm font-medium transition-[transform,box-shadow,border-color,background-color,color,opacity] duration-200 ease-premium',
                    collapsed ? 'h-11 w-11 justify-center' : 'gap-3 px-3 py-3',
                    active
                      ? 'bg-brand-600/10 text-brand-700 ring-1 ring-inset ring-brand-600/15 dark:bg-accent-400/[0.10] dark:text-accent-200 dark:ring-accent-400/20'
                      : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
                  )}
                >
                  {/* Active rail marker */}
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-700 dark:bg-accent-400"
                      aria-hidden
                    />
                  )}
                  <item.Icon
                    size={18}
                    className={cn(
                      'shrink-0 transition-transform duration-200 group-hover:scale-110',
                      active ? 'text-brand-700 dark:text-accent-300' : 'text-fg-subtle group-hover:text-fg',
                    )}
                    aria-hidden
                  />
                  {!collapsed && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {count > 0 && (
                        <Badge tone="amber" size="sm" className="shrink-0">
                          {count}
                        </Badge>
                      )}
                    </>
                  )}
                  {collapsed && count > 0 && (
                    <span
                      className="absolute right-1 top-1 h-2 w-2 rounded-full bg-warning-500 ring-2 ring-surface"
                      aria-hidden
                    />
                  )}
                </NavLink>
              );

              return (
                <li key={item.to} className={cn(collapsed && 'flex justify-center')}>
                  {collapsed ? (
                    <Tooltip side="right" content={item.label}>
                      {link}
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  onSignOut: () => void;
  badges?: Record<string, number>;
  /** Mobile drawer omits the collapse control and uses an opaque surface. */
  variant?: 'desktop' | 'drawer';
}

/**
 * Enterprise sidebar: tenant branding, grouped navigation, live system status
 * and the signed-in clinician. Collapses to a 76px icon rail on desktop.
 */
export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
  onSignOut,
  badges,
  variant = 'desktop',
}: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const status = useSystemStatus();
  const isCollapsed = variant === 'drawer' ? false : collapsed;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Brand + organisation */}
      <div className={cn('shrink-0 border-b border-line', isCollapsed ? 'px-3 py-4' : 'px-6 py-4')}>
        <div
          className={cn(
            'flex gap-2',
            isCollapsed ? 'flex-col items-center' : 'items-center justify-between',
          )}
        >
          <Brand compact={isCollapsed} />
          {variant === 'desktop' && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!isCollapsed}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-fg-subtle transition hover:bg-surface-sunken hover:text-fg"
            >
              <motion.span
                animate={{ rotate: isCollapsed ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="grid place-items-center"
              >
                <ChevronLeft size={16} aria-hidden />
              </motion.span>
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface-sunken px-3 py-3 ring-1 ring-inset ring-line">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300">
                  <Building2 size={16} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-fg">{ORG_NAME}</p>
                  <p className="truncate text-[11px] text-fg-subtle">{ORG_UNIT}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className={cn('min-h-0 flex-1 overflow-y-auto py-6', isCollapsed ? 'px-3' : 'px-6')}>
        <SidebarNav collapsed={isCollapsed} onNavigate={onNavigate} badges={badges} />
      </div>

      {/* System status */}
      <div className={cn('shrink-0 border-t border-line', isCollapsed ? 'px-3 py-3' : 'px-6 py-4')}>
        {isCollapsed ? (
          <Tooltip side="right" content={status.label}>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-sunken">
              <span className={cn('h-2 w-2 rounded-full', statusDot[status.state])} aria-hidden />
              <span className="sr-only">{status.label}</span>
            </span>
          </Tooltip>
        ) : (
          <div className="rounded-xl bg-surface-sunken px-3 py-3 ring-1 ring-inset ring-line">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                {status.state === 'operational' && (
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success-500" />
                )}
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', statusDot[status.state])} />
              </span>
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-fg">{status.label}</p>
            </div>
            <p className="mt-1 pl-4 text-[11px] text-fg-subtle nums">
              {status.total > 0 ? `${status.healthy}/${status.total} services` : 'Awaiting probe'}
              {status.version && ` · v${status.version}`}
            </p>
          </div>
        )}
      </div>

      {/* Clinician profile */}
      {user && (
        <div className={cn('shrink-0 border-t border-line', isCollapsed ? 'px-3 py-3' : 'px-6 py-4')}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip side="right" content={user.full_name}>
                <Avatar name={user.full_name} size="sm" online />
              </Tooltip>
              <Tooltip side="right" content="Sign out">
                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out"
                  className="grid h-9 w-9 place-items-center rounded-lg text-fg-subtle transition hover:bg-danger-500/10 hover:text-danger-600 dark:hover:text-danger-400"
                >
                  <LogOut size={18} aria-hidden />
                </button>
              </Tooltip>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Avatar name={user.full_name} size="md" online />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{user.full_name}</p>
                  <p className="truncate text-[11px] text-fg-subtle">{user.email}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge tone={user.role === 'admin' ? 'violet' : 'brand'} size="sm">
                  <ShieldCheck size={12} aria-hidden />
                  {ROLE_LABEL[user.role] ?? user.role}
                </Badge>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-danger-500/10 hover:text-danger-600 dark:hover:text-danger-400"
              >
                <LogOut size={16} aria-hidden /> Sign out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
