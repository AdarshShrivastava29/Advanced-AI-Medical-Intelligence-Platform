import { memo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { BAND_RAMP, useChartTheme } from '@/components/charts/chartTheme';
import type { DistributionBucket } from '@/types/api';

/** Bar chart of prediction confidence bands (sequential ramp: low → high). */
export const ConfidenceBars = memo(function ConfidenceBars({
  data,
  height = 264,
}: {
  data: DistributionBucket[];
  height?: number;
}) {
  const theme = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 6"
          stroke={theme.grid}
          strokeOpacity={theme.gridOpacity}
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: theme.axis }}
          tickLine={false}
          axisLine={false}
          dy={8}
        />
        <YAxis
          allowDecimals={false}
          width={40}
          tick={{ fontSize: 11, fill: theme.axis }}
          tickLine={false}
          axisLine={false}
          dx={-4}
        />
        <Tooltip
          cursor={{ fill: theme.cursor, radius: 6 }}
          content={<ChartTooltip unit="studies" seriesLabel="Studies" />}
        />
        <Bar
          dataKey="count"
          radius={[6, 6, 2, 2]}
          maxBarSize={64}
          animationDuration={750}
          animationEasing="ease-out"
        >
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={BAND_RAMP[index % BAND_RAMP.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});
