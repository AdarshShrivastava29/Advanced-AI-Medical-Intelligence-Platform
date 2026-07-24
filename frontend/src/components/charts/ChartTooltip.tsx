import type { TooltipProps } from 'recharts';

import { cn } from '@/lib/utils';

interface ChartTooltipProps extends TooltipProps<number, string> {
  /** Suffix appended to each value, e.g. "studies". */
  unit?: string;
  /** Overrides the series name shown beside the swatch. */
  seriesLabel?: string;
}

/**
 * Shared tooltip for every chart. Rendering real DOM (rather than Recharts'
 * `contentStyle`) keeps the surface, border, shadow and type scale identical to
 * the rest of the product and gives it correct dark-mode colours for free.
 */
export function ChartTooltip({ active, payload, label, unit, seriesLabel }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className={cn(
        'pointer-events-none min-w-[9rem] rounded-xl border border-line bg-surface px-3 py-2 elevation-3',
      )}
    >
      {label !== undefined && (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
          {label}
        </p>
      )}
      <ul className="space-y-1">
        {payload.map((entry, index) => (
          <li
            key={`${entry.dataKey}-${index}`}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-2 text-fg-muted">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color ?? entry.payload?.fill }}
                aria-hidden
              />
              {seriesLabel ?? entry.name}
            </span>
            <span className="font-semibold text-fg nums">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              {unit ? ` ${unit}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
