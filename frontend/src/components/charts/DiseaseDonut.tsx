import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { DistributionBucket } from '@/types/api';

const COLORS: Record<string, string> = { NORMAL: '#16a34a', PNEUMONIA: '#dc2626' };

/** Donut chart of predicted-class distribution. */
export function DiseaseDonut({ data }: { data: DistributionBucket[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return <p className="py-12 text-center text-sm text-slate-500">No predictions yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.label} fill={COLORS[entry.label] ?? '#0ea5e9'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.2)',
            background: 'rgba(15,23,42,0.9)',
            color: '#f1f5f9',
            fontSize: 12,
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value) => <span className="text-sm text-slate-500">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
