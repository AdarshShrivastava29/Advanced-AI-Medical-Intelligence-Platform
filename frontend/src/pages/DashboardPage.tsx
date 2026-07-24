import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  CircleAlert,
  Cpu,
  Gauge,
  Layers,
  MessagesSquare,
  ScanLine,
  Server,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { TrendChart } from '@/components/charts/TrendChart';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { DashboardHero, type HeroMetric } from '@/components/dashboard/DashboardHero';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, Skeleton, SkeletonCard } from '@/components/ui/Feedback';
import { PageTransition } from '@/components/ui/PageTransition';
import { StatCard } from '@/components/ui/StatCard';
import { useAnalyticsSummary, useReadiness, useRecentActivity } from '@/hooks/useAnalytics';
import { useActiveModel, useSystemStatus } from '@/hooks/usePlatform';
import { percent } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const WINDOW_DAYS = 14;

const QUICK_ACTIONS: { to: string; label: string; hint: string; Icon: LucideIcon }[] = [
  { to: '/predict', label: 'Analyse a scan', hint: 'Upload a chest X-ray', Icon: ScanLine },
  { to: '/assistant', label: 'Knowledge assistant', hint: 'Grounded medical Q&A', Icon: MessagesSquare },
  { to: '/documents', label: 'Knowledge base', hint: 'Manage indexed literature', Icon: BookOpen },
  { to: '/analytics', label: 'Analytics', hint: 'Performance over time', Icon: BarChart3 },
];

function greetingFor(name: string | undefined): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${period}, ${name.split(' ')[0]}` : period;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const summary = useAnalyticsSummary(WINDOW_DAYS);
  const recent = useRecentActivity(6);
  const readiness = useReadiness();
  const status = useSystemStatus();
  const model = useActiveModel();

  const overview = summary.data?.overview;
  const trends = summary.data?.trends ?? [];
  const series = trends.map((point) => point.count);

  // Today's volume is the final point of the trend window; the previous point
  // gives an honest day-over-day delta.
  const todayCount = trends.at(-1)?.count ?? 0;
  const yesterdayCount = trends.at(-2)?.count ?? 0;
  const dayDelta =
    yesterdayCount > 0 ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 : undefined;

  const heroMetrics: HeroMetric[] = [
    { label: `Studies (${WINDOW_DAYS}d)`, value: trends.reduce((sum, point) => sum + point.count, 0) },
    { label: 'Analysed today', value: todayCount },
    {
      label: 'Mean confidence',
      value: (overview?.average_confidence ?? 0) * 100,
      decimals: 1,
      suffix: '%',
    },
    {
      label: 'Platform status',
      value: 0,
      display: status.total > 0 ? `${status.healthy}/${status.total}` : '—',
      tone:
        status.state === 'operational' ? 'positive' : status.state === 'unknown' ? 'default' : 'warning',
    },
  ];

  const meanConfidence = overview?.average_confidence ?? 0;

  return (
    <PageTransition className="space-y-8">
      <DashboardHero
        greeting={greetingFor(user?.full_name)}
        subtitle="Your medical intelligence workspace — imaging throughput, model behaviour and platform health at a glance."
        metrics={heroMetrics}
        loading={summary.isLoading}
      />

      {/* ---------------- KPI row ---------------- */}
      <section aria-label="Key metrics">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {summary.isLoading ? (
            Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
          ) : (
            <>
              <StatCard
                label="Total studies"
                value={overview?.total_predictions ?? 0}
                icon={<Layers size={20} />}
                series={series}
                trendLabel="Cumulative, all time"
                delay={0}
              />
              <StatCard
                label="Analysed today"
                value={todayCount}
                icon={<ScanLine size={20} />}
                tone="teal"
                trend={dayDelta}
                trendLabel="vs. yesterday"
                delay={0.04}
              />
              <StatCard
                label="Mean confidence"
                value={percent(meanConfidence, 1)}
                icon={<Gauge size={20} />}
                tone={meanConfidence >= 0.85 ? 'green' : meanConfidence >= 0.7 ? 'amber' : 'red'}
                trendLabel="Across all studies"
                delay={0.08}
              />
              <StatCard
                label="Pneumonia flagged"
                value={overview?.pneumonia_count ?? 0}
                icon={<Activity size={20} />}
                tone="red"
                trendLabel={
                  overview && overview.total_predictions > 0
                    ? `${percent(overview.pneumonia_count / overview.total_predictions, 0)} of all studies`
                    : 'Awaiting first study'
                }
                delay={0.12}
              />
              <StatCard
                label="Needs review"
                value={overview?.ood_count ?? 0}
                icon={<ShieldAlert size={20} />}
                tone="amber"
                trendLabel="Out-of-distribution uploads"
                delay={0.16}
              />
              <StatCard
                label="Services healthy"
                value={status.total > 0 ? `${status.healthy}/${status.total}` : '—'}
                icon={<Server size={20} />}
                tone={status.state === 'operational' ? 'green' : 'amber'}
                trendLabel={status.version ? `API v${status.version}` : status.label}
                delay={0.2}
              />
            </>
          )}
        </div>
      </section>

      {/* ---------------- Volume + insights ---------------- */}
      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            eyebrow="Imaging throughput"
            title="Study volume"
            subtitle={`Daily analysed scans over the last ${WINDOW_DAYS} days`}
            icon={<BarChart3 size={18} />}
            action={
              <Link to="/analytics">
                <Button variant="ghost" size="sm">
                  View analytics
                </Button>
              </Link>
            }
            divided
          />
          {summary.isLoading ? <Skeleton className="h-64 rounded-xl" /> : <TrendChart data={trends} />}
        </Card>

        <Card>
          <CardHeader
            eyebrow="Model observations"
            title="AI insights"
            subtitle={`Derived from the last ${WINDOW_DAYS} days`}
            icon={<Sparkles size={18} />}
            divided
          />
          {summary.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <InsightsPanel summary={summary.data} days={WINDOW_DAYS} />
          )}
        </Card>
      </section>

      {/* ---------------- Worklist + platform ---------------- */}
      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            eyebrow="Worklist"
            title="Recent studies"
            subtitle="Your latest analysed scans"
            icon={<Stethoscope size={18} />}
            action={
              <Link to="/history">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            }
            divided
          />
          {recent.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : recent.data && recent.data.length > 0 ? (
            <ActivityTimeline items={recent.data} />
          ) : (
            <EmptyState
              art="scan"
              title="No studies analysed yet"
              description="Upload your first chest X-ray to see classification, Grad-CAM explainability and a drafted clinical report."
              action={
                <Link to="/predict">
                  <Button leadingIcon={<ScanLine size={16} />}>Analyse a scan</Button>
                </Link>
              }
              hint="PNG or JPEG · up to 10 MB"
            />
          )}
        </Card>

        <div className="space-y-6">
          {/* Inference stack */}
          <Card>
            <CardHeader eyebrow="Inference stack" title="Active model" icon={<Brain size={18} />} divided />
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-fg-muted">Architecture</dt>
                <dd className="flex items-center gap-2 font-medium text-fg">
                  <Cpu size={14} className="text-brand-700 dark:text-accent-300" aria-hidden />
                  {model.arch ?? '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-fg-muted">API version</dt>
                <dd className="font-medium text-fg nums">{status.version ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-fg-muted">Analysis window</dt>
                <dd className="font-medium text-fg">{WINDOW_DAYS} days</dd>
              </div>
            </dl>
          </Card>

          {/* Platform health */}
          <Card>
            <CardHeader
              eyebrow="Platform"
              title="System health"
              subtitle={status.label}
              icon={<Server size={18} />}
              divided
            />
            {readiness.isLoading ? (
              <Skeleton className="h-28 rounded-xl" />
            ) : (
              <ul className="space-y-2">
                {Object.entries(readiness.data?.checks ?? {}).map(([component, healthy]) => (
                  <li
                    key={component}
                    className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2 text-sm"
                  >
                    <span className="truncate capitalize text-fg-muted">
                      {component.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={
                        healthy
                          ? 'flex items-center gap-2 text-xs font-medium text-success-600 dark:text-success-400'
                          : 'flex items-center gap-2 text-xs font-medium text-danger-600 dark:text-danger-400'
                      }
                    >
                      {healthy ? (
                        <CheckCircle2 size={14} aria-hidden />
                      ) : (
                        <CircleAlert size={14} aria-hidden />
                      )}
                      {healthy ? 'Healthy' : 'Down'}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {overview && overview.ood_count > 0 && (
              <Link
                to="/history"
                className="mt-4 flex items-start gap-3 rounded-xl border border-warning-500/25 bg-warning-500/[0.07] p-3 text-sm text-warning-700 transition hover:bg-warning-500/[0.12] dark:text-warning-400"
              >
                <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  {overview.ood_count} upload{overview.ood_count === 1 ? '' : 's'} flagged
                  out-of-distribution — review before clinical use.
                </span>
              </Link>
            )}
          </Card>
        </div>
      </section>

      {/* ---------------- Quick actions ---------------- */}
      <section aria-label="Quick actions">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.to} to={action.to} className="group rounded-2xl">
              <Card interactive className="flex h-full items-center gap-4" padding="sm">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-700 ring-1 ring-inset ring-brand-600/15 transition-transform duration-300 group-hover:scale-105 dark:bg-accent-400/10 dark:text-accent-300 dark:ring-accent-400/20"
                  aria-hidden
                >
                  <action.Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-fg">{action.label}</span>
                  <span className="block truncate text-xs text-fg-subtle">{action.hint}</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Regulatory reminder, kept visible on the primary landing screen. */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
        <Badge tone="slate" size="sm">
          Decision-support
        </Badge>
        <span>Not a medical device. Every AI output requires clinician review before use.</span>
      </div>
    </PageTransition>
  );
}
