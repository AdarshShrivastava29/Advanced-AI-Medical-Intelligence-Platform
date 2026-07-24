import { motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';

import { cn } from '@/lib/utils';

// Deterministic layout — no Math.random, so the field is identical on every
// render and between server/client.
const PARTICLES = [
  { x: 12, y: 18, r: 2.5, delay: 0, drift: 14 },
  { x: 28, y: 62, r: 1.6, delay: 1.4, drift: -10 },
  { x: 44, y: 26, r: 2, delay: 2.6, drift: 12 },
  { x: 58, y: 74, r: 1.4, delay: 0.8, drift: -16 },
  { x: 71, y: 34, r: 2.8, delay: 3.2, drift: 10 },
  { x: 83, y: 58, r: 1.8, delay: 1.9, drift: -12 },
  { x: 92, y: 22, r: 1.5, delay: 2.2, drift: 15 },
  { x: 19, y: 84, r: 2.2, delay: 3.8, drift: -9 },
  { x: 65, y: 12, r: 1.7, delay: 0.4, drift: 13 },
  { x: 37, y: 92, r: 1.9, delay: 2.9, drift: -14 },
];

/** Slow-drifting particulate wash used behind hero panels. */
export const ParticleField = memo(function ParticleField({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn('h-full w-full', className)}
      aria-hidden
      role="presentation"
    >
      {PARTICLES.map((particle) => (
        <motion.circle
          key={`${particle.x}-${particle.y}`}
          cx={particle.x}
          cy={particle.y}
          r={particle.r / 4}
          fill="currentColor"
          initial={{ opacity: 0.2 }}
          animate={
            reduceMotion
              ? { opacity: 0.28 }
              : { opacity: [0.12, 0.5, 0.12], cy: [particle.y, particle.y + particle.drift / 6, particle.y] }
          }
          transition={
            reduceMotion
              ? undefined
              : { duration: 9, repeat: Infinity, ease: 'easeInOut', delay: particle.delay }
          }
        />
      ))}
    </svg>
  );
});
