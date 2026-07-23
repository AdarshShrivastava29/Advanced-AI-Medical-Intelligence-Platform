import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { TrendPoint } from '@/types/api';

/** Area chart of daily prediction counts. */
export function TrendChart({ data }: { data: TrendPoint[] }) {
  const compact = data.map((d) => ({ ...d, day: d.date.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={compact} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={32} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.2)',
            background: 'rgba(15,23,42,0.9)',
            color: '#f1f5f9',
            fontSize: 12,
          }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Area type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
