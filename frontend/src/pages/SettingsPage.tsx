import { Moon, Palette, Server, Sun } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { useReadiness } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/themeStore';

export function SettingsPage() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const readiness = useReadiness();

  const themes = [
    { value: 'light' as const, label: 'Light', icon: <Sun size={18} /> },
    { value: 'dark' as const, label: 'Dark', icon: <Moon size={18} /> },
  ];

  return (
    <PageTransition>
      <PageHeader title="Settings" description="Personalise your workspace." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Appearance" subtitle="Choose your theme" icon={<Palette size={20} />} />
          <div className="grid grid-cols-2 gap-3">
            {themes.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition',
                  theme === option.value
                    ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300'
                    : 'border-slate-200 text-slate-500 hover:border-brand-300 dark:border-white/10',
                )}
                aria-pressed={theme === option.value}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="System" subtitle="Live backend connectivity" icon={<Server size={20} />} />
          {readiness.isLoading ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : (
            <ul className="space-y-2">
              {Object.entries(readiness.data?.checks ?? {}).map(([component, healthy]) => (
                <li key={component} className="flex items-center justify-between rounded-lg bg-white/40 px-3 py-2 text-sm dark:bg-white/5">
                  <span className="capitalize">{component.replace('_', ' ')}</span>
                  <Badge tone={healthy ? 'green' : 'red'}>{healthy ? 'healthy' : 'down'}</Badge>
                </li>
              ))}
              <li className="flex items-center justify-between px-3 py-2 text-sm text-slate-500">
                <span>API version</span>
                <span className="tabular-nums">{readiness.data?.version ?? '—'}</span>
              </li>
            </ul>
          )}
        </Card>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        AIMIP provides clinical decision-support only and is not a medical device.
      </p>
    </PageTransition>
  );
}
