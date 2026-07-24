import {
  Activity,
  Brain,
  Building2,
  CheckCircle2,
  CircleAlert,
  Cpu,
  Database,
  Monitor,
  Moon,
  Palette,
  Server,
  ShieldCheck,
  Sun,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { Switch } from '@/components/ui/Switch';
import { useReadiness } from '@/hooks/useAnalytics';
import { useActiveModel, useSystemStatus } from '@/hooks/usePlatform';
import { APP_VERSION, CLINICAL_DISCLAIMER, ORG_NAME, ORG_UNIT } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/store/layoutStore';
import { useThemeStore } from '@/store/themeStore';

const THEMES = [
  { value: 'light' as const, label: 'Light', hint: 'Reading rooms with ambient light', Icon: Sun },
  { value: 'dark' as const, label: 'Dark', hint: 'Dimmed reporting workstations', Icon: Moon },
];

const GOVERNANCE: [string, string][] = [
  ['Intended use', 'Decision-support for chest radiograph triage. Not a diagnostic device.'],
  ['Human oversight', 'Every classification and report requires clinician review before use.'],
  ['Data handling', 'Uploaded images are processed for analysis only and never used for retraining.'],
];

export function SettingsPage() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);
  const readiness = useReadiness();
  const status = useSystemStatus();
  const model = useActiveModel();

  const checks = readiness.data?.checks ?? {};

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Appearance, platform diagnostics and the deployment this workspace is bound to."
        meta={
          <Badge tone={status.state === 'operational' ? 'green' : 'amber'} size="sm" dot>
            {status.label}
          </Badge>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ---------------- Appearance ---------------- */}
        <Card>
          <CardHeader
            eyebrow="Appearance"
            title="Display theme"
            subtitle="Applies to this device only"
            icon={<Palette size={18} />}
            divided
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {THEMES.map((option) => {
              const active = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-[transform,box-shadow,border-color,background-color,color,opacity] duration-200 ease-premium',
                    active
                      ? 'border-brand-600 bg-brand-600/[0.06] ring-1 ring-brand-600/20 dark:border-accent-400 dark:bg-accent-400/[0.08] dark:ring-accent-400/25'
                      : 'border-line hover:border-line-strong hover:bg-surface-muted',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-9 w-9 place-items-center rounded-lg',
                      active
                        ? 'bg-brand-600/12 text-brand-700 dark:bg-accent-400/12 dark:text-accent-300'
                        : 'bg-surface-sunken text-fg-subtle',
                    )}
                    aria-hidden
                  >
                    <option.Icon size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-fg">{option.label}</span>
                    <span className="block text-xs text-fg-muted">{option.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-line pt-6">
            <Switch
              checked={sidebarCollapsed}
              onChange={setSidebarCollapsed}
              label="Compact navigation"
              description="Collapse the sidebar to an icon rail to maximise the reading area."
            />
          </div>
        </Card>

        {/* ---------------- Deployment ---------------- */}
        <Card>
          <CardHeader
            eyebrow="Deployment"
            title="This workspace"
            subtitle="Tenant and release information"
            icon={<Building2 size={18} />}
            divided
          />
          <dl className="space-y-2">
            <Row label="Organisation" value={ORG_NAME} Icon={Building2} />
            <Row label="Service line" value={ORG_UNIT} Icon={Activity} />
            <Row label="Frontend release" value={`v${APP_VERSION}`} Icon={Monitor} />
            <Row label="API version" value={status.version ?? '—'} Icon={Server} />
          </dl>
        </Card>

        {/* ---------------- Inference stack ---------------- */}
        <Card>
          <CardHeader
            eyebrow="AI stack"
            title="Inference & retrieval"
            subtitle="Reported by the backend"
            icon={<Brain size={18} />}
            divided
          />
          <dl className="space-y-2">
            <Row
              label="Classification model"
              value={model.arch ?? 'Resolves on first study'}
              Icon={Cpu}
            />
            <Row
              label="Vector store"
              value={
                'vector_db' in checks ? (checks.vector_db ? 'Connected' : 'Unavailable') : 'Not reported'
              }
              Icon={Database}
            />
            <Row label="Explainability" value="Grad-CAM localisation" Icon={Activity} />
          </dl>

          <p className="mt-4 rounded-lg bg-surface-muted p-3 text-xs leading-relaxed text-fg-muted">
            Provider selection, embedding models and vector-store binding are managed server-side by
            your platform administrator. This panel reports what the backend is currently using.
          </p>
        </Card>

        {/* ---------------- Diagnostics ---------------- */}
        <Card>
          <CardHeader
            eyebrow="Diagnostics"
            title="Service health"
            subtitle="Live readiness probe, refreshed every 20 seconds"
            icon={<Server size={18} />}
            divided
          />
          {readiness.isLoading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : (
            <ul className="space-y-2">
              {Object.entries(checks).map(([component, healthy]) => (
                <li
                  key={component}
                  className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-3 text-sm"
                >
                  <span className="truncate capitalize text-fg-muted">
                    {component.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={cn(
                      'flex shrink-0 items-center gap-2 text-xs font-medium',
                      healthy
                        ? 'text-success-600 dark:text-success-400'
                        : 'text-danger-600 dark:text-danger-400',
                    )}
                  >
                    {healthy ? (
                      <CheckCircle2 size={14} aria-hidden />
                    ) : (
                      <CircleAlert size={14} aria-hidden />
                    )}
                    {healthy ? 'Healthy' : 'Unavailable'}
                  </span>
                </li>
              ))}
              {Object.keys(checks).length === 0 && (
                <li className="rounded-lg bg-surface-muted px-3 py-3 text-sm text-fg-muted">
                  No component checks were reported.
                </li>
              )}
            </ul>
          )}
        </Card>

        {/* ---------------- Governance ---------------- */}
        <Card className="xl:col-span-2">
          <CardHeader
            eyebrow="Governance"
            title="Clinical safety & compliance"
            icon={<ShieldCheck size={18} />}
            divided
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {GOVERNANCE.map(([title, body]) => (
              <div key={title} className="rounded-xl bg-surface-muted p-4">
                <p className="medical-label mb-2">{title}</p>
                <p className="text-xs leading-relaxed text-fg-muted">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-fg-subtle">{CLINICAL_DISCLAIMER}</p>
        </Card>
      </div>
    </PageTransition>
  );
}

function Row({ label, value, Icon }: { label: string; value: string; Icon: LucideIcon }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-3 text-sm">
      <dt className="flex min-w-0 items-center gap-2 text-fg-muted">
        <Icon size={14} className="shrink-0 text-fg-subtle" aria-hidden />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="shrink-0 truncate text-right font-medium text-fg">{value}</dd>
    </div>
  );
}
