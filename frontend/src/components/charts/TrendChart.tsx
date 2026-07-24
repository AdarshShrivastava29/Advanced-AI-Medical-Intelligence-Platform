import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { SERIES, useChartTheme } from '@/components/charts/chartTheme';
import type { TrendPoint } from '@/types/api';

/** Area chart of daily prediction counts. */
export function TrendChart({ data, height = 264 }: { data: TrendPoint[]; height?: number }) {
  const theme = useChartTheme();
  const compact = data.map((point) => ({
    ...point,
    day: new Date(point.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={compact} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES.primaryLight} stopOpacity={0.28} />
            <stop offset="100%" stopColor={SERIES.primaryLight} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="4 6"
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
          contentStyle={theme.tooltip}
          labelStyle={theme.tooltipLabel}
          cursor={{ stroke: theme.grid, strokeWidth: 1, strokeDasharray: '4 4' }}
          formatter={(value: number) => [value, 'Studies']}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={SERIES.primary}
          strokeWidth={2.25}
          fill="url(#trendFill)"
          activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: SERIES.primary }}
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
