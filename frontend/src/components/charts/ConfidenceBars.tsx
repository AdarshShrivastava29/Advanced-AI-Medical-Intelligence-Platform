import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { BAND_RAMP, useChartTheme } from '@/components/charts/chartTheme';
import type { DistributionBucket } from '@/types/api';

/** Bar chart of prediction confidence bands (sequential ramp: low → high). */
export function ConfidenceBars({ data, height = 264 }: { data: DistributionBucket[]; height?: number }) {
  const theme = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="4 6"
          stroke={theme.grid}
          strokeOpacity={theme.gridOpacity}
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: theme.axis }}
          tickLine={false}
          axisLine={false}
          dy={6}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: theme.axis }}
          tickLine={false}
          axisLine={false}
          width={38}
        />
        <Tooltip
          cursor={{ fill: theme.cursor }}
          contentStyle={theme.tooltip}
          labelStyle={theme.tooltipLabel}
          formatter={(value: number) => [value, 'Studies']}
        />
        <Bar dataKey="count" radius={[6, 6, 2, 2]} animationDuration={800} maxBarSize={72}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={BAND_RAMP[index % BAND_RAMP.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
