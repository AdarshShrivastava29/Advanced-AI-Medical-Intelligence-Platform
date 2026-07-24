import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  CircleAlert,
  Cpu,
  LogOut,
  Menu as MenuIcon,
  ScanLine,
  Search,
  Settings,
  ShieldAlert,
  User as UserIcon,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Brand } from '@/components/layout/Brand';
import { labelForPath, NAV_ITEMS } from '@/components/layout/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/components/ui/Menu';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Tooltip } from '@/components/ui/Tooltip';
import { useActiveModel, useSystemAlerts, useSystemStatus, type SystemState } from '@/hooks/usePlatform';
import { ORG_NAME, ROLE_LABEL } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const statusTone: Record<SystemState, string> = {
  operational: 'bg-success-500',
  degraded: 'bg-warning-500',
  offline: 'bg-danger-500',
  unknown: 'bg-fg-subtle',
};

/** Build the breadcrumb trail from the current pathname. */
function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const match = NAV_ITEMS.find((item) => item.to === pathname);
  if (match) return [{ label: match.label }];

  // Detail routes: parent section + record label.
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const parent = NAV_ITEMS.find((item) => item.to === `/${segments[0]}`);
    return [
      { label: parent?.label ?? labelForPath(`/${segments[0]}`), to: `/${segments[0]}` },
      { label: 'Record details' },
    ];
  }
  return [{ label: labelForPath(pathname) }];
}

interface TopbarProps {
  onOpenDrawer: () => void;
  onOpenSearch: () => void;
  onSignOut: () => void;
}

/**
 * Premium top navigation: breadcrumbs, global search, live platform telemetry
 * (system health + active inference model), notifications and the user menu.
 */
export function Topbar({ onOpenDrawer, onOpenSearch, onSignOut }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const status = useSystemStatus();
  const model = useActiveModel();
  const alerts = useSystemAlerts();
  const crumbs = useBreadcrumbs();
  const navigate = useNavigate();

  return (
    <header className="glass-chrome sticky top-0 z-40 border-b">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* Mobile: menu + compact brand */}
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open navigation menu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-fg-muted transition hover:bg-surface-sunken hover:text-fg lg:hidden"
        >
          <MenuIcon size={20} aria-hidden />
        </button>
        <div className="lg:hidden">
          <Brand compact />
        </div>

        {/* Desktop: breadcrumbs */}
        <div className="hidden min-w-0 flex-1 lg:block">
          <Breadcrumbs items={crumbs} />
        </div>

        {/* Global search */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="ml-auto hidden h-9 w-64 items-center gap-3 rounded-xl border border-line bg-surface px-3 text-sm text-fg-subtle shadow-sm transition hover:border-line-strong hover:text-fg-muted md:flex xl:w-80"
        >
          <Search size={16} aria-hidden />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-line px-2 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Open search"
          className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-fg-muted transition hover:bg-surface-sunken hover:text-fg md:hidden"
        >
          <Search size={18} aria-hidden />
        </button>

        {/* Platform telemetry */}
        <div className="hidden items-center gap-2 xl:flex">
          <Tooltip
            content={
              model.arch
                ? `Inference model: ${model.arch}`
                : 'No prediction has run yet — model resolves on first scan'
            }
          >
            <span className="flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-medium text-fg-muted">
              <Cpu size={14} className="text-brand-600 dark:text-brand-300" aria-hidden />
              <span className="max-w-[9rem] truncate">{model.arch ?? 'Model idle'}</span>
            </span>
          </Tooltip>

          <Link
            to="/settings"
            aria-label={`System status: ${status.label}`}
            className="flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition hover:border-line-strong hover:text-fg"
          >
            <span className="relative flex h-2 w-2" aria-hidden>
              {status.state === 'operational' && (
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success-500" />
              )}
              <span className={cn('relative inline-flex h-2 w-2 rounded-full', statusTone[status.state])} />
            </span>
            <span className="nums">
              {status.total > 0 ? `${status.healthy}/${status.total}` : '—'}
            </span>
          </Link>
        </div>

        {/* Quick action */}
        <Tooltip content="New prediction">
          <Button
            size="icon-sm"
            variant="subtle"
            onClick={() => navigate('/predict')}
            aria-label="Start a new prediction"
            className="hidden sm:inline-flex"
          >
            <ScanLine size={18} aria-hidden />
          </Button>
        </Tooltip>

        {/* Notifications */}
        <Menu
          label="Notifications"
          width="w-80"
          trigger={() => (
            <span className="relative grid h-9 w-9 place-items-center rounded-lg text-fg-muted transition hover:bg-surface-sunken hover:text-fg">
              <Bell size={18} aria-hidden />
              {alerts.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface nums">
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
              <span className="sr-only">
                {alerts.length > 0 ? `${alerts.length} notifications` : 'No notifications'}
              </span>
            </span>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>System notifications</MenuLabel>
              {alerts.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-fg-muted">
                  Nothing needs your attention.
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {alerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => {
                        close();
                        if (alert.to) navigate(alert.to);
                      }}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-surface-sunken"
                    >
                      <span
                        className={cn(
                          'mt-0.5 shrink-0',
                          alert.tone === 'danger' ? 'text-danger-500' : 'text-warning-500',
                        )}
                      >
                        {alert.tone === 'danger' ? (
                          <CircleAlert size={16} aria-hidden />
                        ) : (
                          <ShieldAlert size={16} aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium capitalize text-fg">{alert.title}</span>
                        <span className="block text-xs leading-relaxed text-fg-muted">{alert.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <MenuSeparator />
              <MenuItem icon={<Activity size={16} />} onClick={() => { close(); navigate('/settings'); }}>
                View system diagnostics
              </MenuItem>
            </>
          )}
        </Menu>

        <ThemeToggle className="hidden sm:grid" />

        {/* User menu */}
        {user && (
          <Menu
            label="Account menu"
            trigger={(open) => (
              <span className="flex items-center gap-2 rounded-xl border border-line bg-surface py-1 pl-1 pr-2 transition hover:border-line-strong">
                <Avatar name={user.full_name} size="xs" />
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block max-w-[9rem] truncate text-xs font-semibold leading-tight text-fg">
                    {user.full_name}
                  </span>
                  <span className="block text-[10px] leading-tight text-fg-subtle">
                    {ROLE_LABEL[user.role] ?? user.role}
                  </span>
                </span>
                <ChevronDown
                  size={14}
                  aria-hidden
                  className={cn('shrink-0 text-fg-subtle transition-transform', open && 'rotate-180')}
                />
              </span>
            )}
          >
            {(close) => (
              <>
                <div className="flex items-center gap-3 px-3 py-3">
                  <Avatar name={user.full_name} size="md" online />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">{user.full_name}</p>
                    <p className="truncate text-xs text-fg-subtle">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 pb-3">
                  <Badge tone={user.role === 'admin' ? 'violet' : 'brand'} size="sm">
                    {ROLE_LABEL[user.role] ?? user.role}
                  </Badge>
                  <Badge tone="slate" size="sm">
                    <Building2 size={12} aria-hidden />
                    {ORG_NAME}
                  </Badge>
                </div>
                <MenuSeparator />
                <MenuItem icon={<UserIcon size={16} />} onClick={() => { close(); navigate('/profile'); }}>
                  Profile
                </MenuItem>
                <MenuItem icon={<Settings size={16} />} onClick={() => { close(); navigate('/settings'); }}>
                  Settings
                </MenuItem>
                <MenuSeparator />
                <MenuItem tone="danger" icon={<LogOut size={16} />} onClick={() => { close(); onSignOut(); }}>
                  Sign out
                </MenuItem>
              </>
            )}
          </Menu>
        )}
      </div>

      {/* Mobile breadcrumb strip */}
      <div className="border-t border-line px-4 py-2 lg:hidden">
        <Breadcrumbs items={crumbs} />
      </div>
    </header>
  );
}
