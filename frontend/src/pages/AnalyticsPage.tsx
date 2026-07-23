import { Activity, CheckCircle2, Layers, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { ConfidenceBars } from '@/components/charts/ConfidenceBars';
import { DiseaseDonut } from '@/components/charts/DiseaseDonut';
import { TrendChart } from '@/components/charts/TrendChart';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { StatCard } from '@/components/ui/StatCard';
import { useAnalyticsSummary } from '@/hooks/useAnalytics';
import { cn, percent } from '@/lib/utils';

const RANGES = [7, 30, 90] as const;

export function AnalyticsPage() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { data, isLoading, isError } = useAnalyticsSummary(days);
  const overview = data?.overview;

  return (
    <PageTransition>
      <PageHeader
        title="Analytics"
        description="Live insights aggregated from your predictions."
        action={
          <div className="flex rounded-xl border border-slate-200 p-0.5 dark:border-white/10">
            {RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setDays(range)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                  days === range ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-100',
                )}
              >
                {range}d
              </button>
            ))}
          </div>
        }
      />

      {isError ? (
        <ErrorState title="Could not load analytics" description="Please try again shortly." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
            ) : (
              <>
                <StatCard label="Total predictions" value={overview?.total_predictions ?? 0} icon={<Layers size={22} />} />
                <StatCard label="Pneumonia" value={overview?.pneumonia_count ?? 0} icon={<Activity size={22} />} tone="red" delay={0.05} />
                <StatCard label="Normal" value={overview?.normal_count ?? 0} icon={<CheckCircle2 size={22} />} tone="green" delay={0.1} />
                <StatCard label="OOD flagged" value={overview?.ood_count ?? 0} icon={<ShieldAlert size={22} />} tone="amber" delay={0.15} />
              </>
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Prediction trend" subtitle={`Last ${days} days`} />
              {isLoading ? <Skeleton className="h-64 rounded-xl" /> : <TrendChart data={data?.trends ?? []} />}
            </Card>
            <Card>
              <CardHeader title="Class distribution" subtitle="Normal vs pneumonia" />
              {isLoading ? <Skeleton className="h-64 rounded-xl" /> : <DiseaseDonut data={data?.disease_distribution ?? []} />}
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader
              title="Confidence distribution"
              subtitle={`Average ${percent(overview?.average_confidence ?? 0, 0)} across ${overview?.total_predictions ?? 0} predictions`}
            />
            {isLoading ? <Skeleton className="h-64 rounded-xl" /> : <ConfidenceBars data={data?.confidence_distribution ?? []} />}
          </Card>
        </>
      )}
    </PageTransition>
  );
}
