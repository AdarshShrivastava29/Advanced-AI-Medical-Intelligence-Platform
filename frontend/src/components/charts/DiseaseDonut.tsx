import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { SERIES, useChartTheme } from '@/components/charts/chartTheme';
import { EmptyArt } from '@/components/visuals/EmptyArt';
import { percent } from '@/lib/utils';
import type { DistributionBucket } from '@/types/api';

const COLORS: Record<string, string> = {
  NORMAL: SERIES.normal,
  PNEUMONIA: SERIES.pneumonia,
};

/**
 * Donut of predicted-class distribution with a centred total and a custom
 * legend — Recharts' default legend is too cramped for clinical labels.
 */
export function DiseaseDonut({ data, height = 264 }: { data: DistributionBucket[]; height?: number }) {
  const theme = useChartTheme();
  const total = data.reduce((sum, bucket) => sum + bucket.count, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <EmptyArt kind="analytics" className="h-20 w-28 text-brand-600/50 dark:text-accent-400/40" />
        <p className="text-sm text-fg-muted">No studies in this window yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2.5}
              stroke="none"
              animationDuration={800}
            >
              {data.map((entry) => (
                <Cell key={entry.label} fill={COLORS[entry.label] ?? SERIES.primaryLight} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={theme.tooltip}
              labelStyle={theme.tooltipLabel}
              formatter={(value: number, name: string) => [
                `${value} · ${percent(value / total, 0)}`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Centred total */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="font-display text-3xl font-bold leading-none text-fg nums">{total}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
              Studies
            </p>
          </div>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {data.map((bucket) => (
          <li key={bucket.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[bucket.label] ?? SERIES.primaryLight }}
              aria-hidden
            />
            <span className="text-fg-muted">{bucket.label}</span>
            <span className="font-semibold text-fg nums">{percent(bucket.count / total, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
