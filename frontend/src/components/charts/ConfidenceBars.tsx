import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { DistributionBucket } from '@/types/api';

const BAND_COLORS = ['#94a3b8', '#38bdf8', '#0ea5e9', '#0369a1'];

/** Bar chart of prediction confidence bands. */
export function ConfidenceBars({ data }: { data: DistributionBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={32} />
        <Tooltip
          cursor={{ fill: 'rgba(148,163,184,0.1)' }}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.2)',
            background: 'rgba(15,23,42,0.9)',
            color: '#f1f5f9',
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={BAND_COLORS[index % BAND_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
