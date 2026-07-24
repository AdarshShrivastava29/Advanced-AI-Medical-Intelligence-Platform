import { useId, memo } from 'react';

import { cn } from '@/lib/utils';

interface SparklineProps {
  /** Raw series values; rendered left-to-right. */
  data: number[];
  /** Stroke/fill colour — any CSS colour, defaults to `currentColor`. */
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Dependency-free mini trend line for KPI tiles. Recharts is reserved for the
 * full analytics charts; a 40px sparkline does not justify its render cost.
 */
export const Sparkline = memo(function Sparkline({
  data,
  color = 'currentColor',
  width = 96,
  height = 32,
  className,
}: SparklineProps) {
  const gradientId = useId();
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  // Inset by 2px top/bottom so the stroke is never clipped at the extremes.
  const points = data.map((value, index) => {
    const x = index * stepX;
    const y = height - 2 - ((value - min) / span) * (height - 4);
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${line} ${width},${height} 0,${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className={cn('overflow-visible', className)}
      role="presentation"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
});
