import {
  Activity,
  BarChart3,
  CheckCircle2,
  Gauge,
  Layers,
  PieChart,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

import { ConfidenceBars } from '@/components/charts/ConfidenceBars';
import { DiseaseDonut } from '@/components/charts/DiseaseDonut';
import { TrendChart } from '@/components/charts/TrendChart';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorState, Skeleton, SkeletonCard } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { StatCard } from '@/components/ui/StatCard';
import { Segmented } from '@/components/ui/Switch';
import { useAnalyticsSummary } from '@/hooks/useAnalytics';
import { percent } from '@/lib/utils';

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
] as const;

type RangeValue = (typeof RANGES)[number]['value'];

export function AnalyticsPage() {
  const [range, setRange] = useState<RangeValue>('30');
  const days = Number(range);
  const { data, isLoading, isError, refetch } = useAnalyticsSummary(days);

  const overview = data?.overview;
  const trends = data?.trends ?? [];
  const windowTotal = trends.reduce((sum, point) => sum + point.count, 0);
  const busiest = trends.reduce((peak, point) => (point.count > peak ? point.count : peak), 0);
  const dailyMean = trends.length > 0 ? windowTotal / trends.length : 0;

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Department performance"
        title="Analytics"
        description="Imaging throughput, classification mix and model confidence across your studies."
        meta={
          <Badge tone="slate" size="sm">
            Window: last {days} days
          </Badge>
        }
        action={
          <Segmented
            options={RANGES.map((option) => ({ value: option.value, label: option.label }))}
            value={range}
            onChange={setRange}
            label="Analysis window"
            size="sm"
          />
        }
      />

      {isError ? (
        <Card>
          <ErrorState
            title="Analytics are unavailable"
            description="The analytics service did not respond. Your studies are unaffected — this view will recover automatically once the service is reachable."
            onRetry={() => void refetch()}
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {/* ---------------- Headline KPIs ---------------- */}
          <section aria-label="Headline metrics">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
              ) : (
                <>
                  <StatCard
                    label="Total studies"
                    value={overview?.total_predictions ?? 0}
                    icon={<Layers size={21} />}
                    series={trends.map((point) => point.count)}
                    trendLabel="All time"
                  />
                  <StatCard
                    label="Pneumonia flagged"
                    value={overview?.pneumonia_count ?? 0}
                    icon={<Activity size={21} />}
                    tone="red"
                    trendLabel={
                      overview && overview.total_predictions > 0
                        ? `${percent(overview.pneumonia_count / overview.total_predictions, 0)} of studies`
                        : '—'
                    }
                    delay={0.05}
                  />
                  <StatCard
                    label="Normal studies"
                    value={overview?.normal_count ?? 0}
                    icon={<CheckCircle2 size={21} />}
                    tone="green"
                    trendLabel={
                      overview && overview.total_predictions > 0
                        ? `${percent(overview.normal_count / overview.total_predictions, 0)} of studies`
                        : '—'
                    }
                    delay={0.1}
                  />
                  <StatCard
                    label="Out-of-distribution"
                    value={overview?.ood_count ?? 0}
                    icon={<ShieldAlert size={21} />}
                    tone="amber"
                    trendLabel="Require manual review"
                    delay={0.15}
                  />
                </>
              )}
            </div>
          </section>

          {/* ---------------- Throughput ---------------- */}
          <Card>
            <CardHeader
              eyebrow="Throughput"
              title="Study volume over time"
              subtitle={`Daily analysed radiographs across the last ${days} days`}
              icon={<TrendingUp size={19} />}
              divided
            />

            {isLoading ? (
              <Skeleton className="h-72 rounded-xl" />
            ) : (
              <>
                <TrendChart data={trends} height={300} />

                <dl className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
                  <div>
                    <dt className="medical-label">Studies in window</dt>
                    <dd className="mt-1 font-display text-2xl font-bold text-fg">
                      <AnimatedCounter value={windowTotal} />
                    </dd>
                  </div>
                  <div>
                    <dt className="medical-label">Daily average</dt>
                    <dd className="mt-1 font-display text-2xl font-bold text-fg">
                      <AnimatedCounter value={dailyMean} decimals={1} />
                    </dd>
                  </div>
                  <div>
                    <dt className="medical-label">Peak day</dt>
                    <dd className="mt-1 font-display text-2xl font-bold text-fg">
                      <AnimatedCounter value={busiest} />
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </Card>

          {/* ---------------- Distributions ---------------- */}
          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader
                eyebrow="Case mix"
                title="Classification distribution"
                subtitle="Normal versus pneumonia across all studies"
                icon={<PieChart size={19} />}
                divided
              />
              {isLoading ? (
                <Skeleton className="h-72 rounded-xl" />
              ) : (
                <DiseaseDonut data={data?.disease_distribution ?? []} height={280} />
              )}
            </Card>

            <Card>
              <CardHeader
                eyebrow="Model behaviour"
                title="Confidence distribution"
                subtitle={
                  overview
                    ? `Mean ${percent(overview.average_confidence, 1)} across ${overview.total_predictions} studies`
                    : 'Confidence bands across all studies'
                }
                icon={<Gauge size={19} />}
                divided
              />
              {isLoading ? (
                <Skeleton className="h-72 rounded-xl" />
              ) : (
                <>
                  <ConfidenceBars data={data?.confidence_distribution ?? []} height={280} />
                  <p className="mt-4 rounded-lg bg-surface-muted p-3 text-xs leading-relaxed text-fg-muted">
                    A distribution weighted toward the upper bands indicates a decisive model. Mass in
                    the lower bands means more borderline studies — prioritise those for review.
                  </p>
                </>
              )}
            </Card>
          </div>

          {/* ---------------- Methodology ---------------- */}
          <Card>
            <CardHeader
              eyebrow="Methodology"
              title="How these figures are calculated"
              icon={<BarChart3 size={19} />}
              divided
            />
            <ul className="grid gap-4 text-xs leading-relaxed text-fg-muted sm:grid-cols-3">
              {[
                [
                  'Scope',
                  'Every metric is scoped to the studies visible to your account — no cross-tenant aggregation.',
                ],
                [
                  'Confidence',
                  'The mean of each study’s winning-class probability, not an accuracy measurement.',
                ],
                [
                  'Out-of-distribution',
                  'Studies the detector flagged as unlike its training data; their predictions are unreliable.',
                ],
              ].map(([title, body]) => (
                <li key={title} className="rounded-xl bg-surface-muted p-4">
                  <p className="medical-label mb-1.5">{title}</p>
                  <p>{body}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </PageTransition>
  );
}
