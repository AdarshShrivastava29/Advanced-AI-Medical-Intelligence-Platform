import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

/** One cardiac cycle: baseline → P wave → QRS complex → T wave. */
const CYCLE = 'l14 0 l4 -6 l4 12 l5 -34 l5 46 l5 -24 l4 6 l12 0 l6 -9 l7 9 l19 0';

/** Repeat the cycle across the viewBox so the trace fills any width. */
function tracePath(cycles: number): string {
  return `M0 60 ${Array.from({ length: cycles }, () => CYCLE).join(' ')}`;
}

interface EcgLineProps {
  /** Stroke colour; defaults to `currentColor` so it inherits from the parent. */
  color?: string;
  className?: string;
  /** Number of cardiac cycles drawn across the SVG. */
  cycles?: number;
  /** Seconds per full sweep of the trace. */
  duration?: number;
  strokeWidth?: number;
}

/**
 * Animated ECG trace. The stroke is drawn progressively via `pathLength`, which
 * reads as a live monitor rather than a decorative squiggle. Falls back to a
 * static, fully-drawn line when the user prefers reduced motion.
 */
export function EcgLine({
  color = 'currentColor',
  className,
  cycles = 6,
  duration = 5,
  strokeWidth = 2,
}: EcgLineProps) {
  const reduceMotion = useReducedMotion();
  const path = tracePath(cycles);

  return (
    <svg
      viewBox={`0 0 ${cycles * 85} 120`}
      preserveAspectRatio="none"
      className={cn('h-full w-full', className)}
      fill="none"
      aria-hidden
      role="presentation"
    >
      {/* Ghost trace so the line never reads as "missing" mid-sweep. */}
      <path d={path} stroke={color} strokeWidth={strokeWidth} strokeOpacity={0.16} strokeLinecap="round" />
      <motion.path
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
        animate={reduceMotion ? { pathLength: 1 } : { pathLength: [0, 1] }}
        transition={
          reduceMotion ? undefined : { duration, repeat: Infinity, ease: 'linear', repeatDelay: 0.2 }
        }
      />
    </svg>
  );
}
