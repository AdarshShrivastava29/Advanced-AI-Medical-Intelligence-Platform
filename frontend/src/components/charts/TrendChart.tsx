import { memo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { SERIES, useChartTheme } from '@/components/charts/chartTheme';
import type { TrendPoint } from '@/types/api';

/** Area chart of daily prediction counts. */
export const TrendChart = memo(function TrendChart({
  data,
  height = 264,
}: {
  data: TrendPoint[];
  height?: number;
}) {
  const theme = useChartTheme();
  const compact = data.map((point) => ({
    ...point,
    day: new Date(point.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={compact} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES.primaryLight} stopOpacity={0.26} />
            <stop offset="70%" stopColor={SERIES.primaryLight} stopOpacity={0.04} />
            <stop offset="100%" stopColor={SERIES.primaryLight} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Horizontal rules only — vertical grid lines add noise, not meaning. */}
        <CartesianGrid
          strokeDasharray="3 6"
          stroke={theme.grid}
          strokeOpacity={theme.gridOpacity}
          vertical={false}
        />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: theme.axis }}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
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
          content={<ChartTooltip unit="studies" seriesLabel="Analysed" />}
          cursor={{ stroke: theme.grid, strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={SERIES.primary}
          strokeWidth={2.25}
          fill="url(#trendFill)"
          activeDot={{ r: 4, strokeWidth: 2, stroke: theme.tooltipSurface, fill: SERIES.primary }}
          animationDuration={850}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
