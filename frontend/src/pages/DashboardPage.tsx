import { Activity, BarChart3, CheckCircle2, CircleAlert, Layers, ScanLine, ShieldAlert, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

import { TrendChart } from '@/components/charts/TrendChart';
import { ClassBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { StatCard } from '@/components/ui/StatCard';
import { useAnalyticsSummary, useReadiness, useRecentActivity } from '@/hooks/useAnalytics';
import { percent, timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const summary = useAnalyticsSummary(14);
  const recent = useRecentActivity(5);
  const readiness = useReadiness();
  const overview = summary.data?.overview;

  return (
    <PageTransition>
      <PageHeader
        title={`Welcome${user ? `, ${user.full_name.split(' ')[0]}` : ''}`}
        description="Your medical intelligence workspace at a glance."
        action={
          <Link to="/predict">
            <Button><ScanLine size={18} /> New prediction</Button>
          </Link>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <StatCard label="Total predictions" value={overview?.total_predictions ?? 0} icon={<Layers size={22} />} delay={0} />
            <StatCard label="Pneumonia flagged" value={overview?.pneumonia_count ?? 0} icon={<Activity size={22} />} tone="red" delay={0.05} />
            <StatCard label="Normal" value={overview?.normal_count ?? 0} icon={<CheckCircle2 size={22} />} tone="green" delay={0.1} />
            <StatCard
              label="Avg confidence"
              value={percent(overview?.average_confidence ?? 0, 0)}
              icon={<Target size={22} />}
              tone="amber"
              delay={0.15}
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader title="Prediction activity" subtitle="Last 14 days" icon={<BarChart3 size={20} />} />
          {summary.isLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <TrendChart data={summary.data?.trends ?? []} />
          )}
        </Card>

        {/* System status */}
        <Card>
          <CardHeader title="System status" subtitle="Live backend health" />
          <ul className="space-y-2">
            {readiness.isLoading && <Skeleton className="h-24 rounded-xl" />}
            {readiness.data &&
              Object.entries(readiness.data.checks).map(([component, healthy]) => (
                <li key={component} className="flex items-center justify-between rounded-lg bg-white/40 px-3 py-2 text-sm dark:bg-white/5">
                  <span className="capitalize">{component.replace('_', ' ')}</span>
                  {healthy ? (
                    <span className="flex items-center gap-1 text-risk-low"><CheckCircle2 size={15} /> healthy</span>
                  ) : (
                    <span className="flex items-center gap-1 text-risk-high"><CircleAlert size={15} /> down</span>
                  )}
                </li>
              ))}
          </ul>
          {overview && overview.ood_count > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-risk-moderate/10 p-3 text-sm text-risk-moderate">
              <ShieldAlert size={16} /> {overview.ood_count} out-of-distribution upload(s) flagged.
            </div>
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="mt-6">
        <CardHeader
          title="Recent predictions"
          subtitle="Your latest scans"
          action={<Link to="/history" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>}
        />
        {recent.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : recent.data && recent.data.length > 0 ? (
          <ul className="divide-y divide-slate-200/60 dark:divide-white/10">
            {recent.data.map((item) => (
              <li key={item.id}>
                <Link to={`/history/${item.id}`} className="flex items-center justify-between gap-3 py-3 transition hover:opacity-80">
                  <div className="flex items-center gap-3">
                    <ClassBadge label={item.predicted_class} />
                    <span className="text-sm text-slate-500">{percent(item.confidence)} confidence</span>
                  </div>
                  <span className="text-xs text-slate-400">{timeAgo(item.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No predictions yet"
            description="Run your first chest X-ray analysis to see it here."
            action={<Link to="/predict"><Button size="sm">Start now</Button></Link>}
          />
        )}
      </Card>
    </PageTransition>
  );
}
