import { motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';

import { cn } from '@/lib/utils';

/**
 * Line-art thorax: rib cage, bronchial tree and both lungs, drawn as a single
 * stroked illustration so it inherits `currentColor`. The lungs breathe and a
 * scan line sweeps the field — the visual shorthand for "AI is reading this
 * chest X-ray".
 */
export const ThoraxArt = memo(function ThoraxArt({ className, scan = true }: { className?: string; scan?: boolean }) {
  const reduceMotion = useReducedMotion();
  const breathe = reduceMotion
    ? {}
    : {
        animate: { scale: [1, 1.025, 1], opacity: [0.9, 1, 0.9] },
        transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' as const },
      };

  return (
    <svg
      viewBox="0 0 240 240"
      className={cn('h-full w-full', className)}
      fill="none"
      aria-hidden
      role="presentation"
    >
      <defs>
        <linearGradient id="thorax-scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.5" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <clipPath id="thorax-clip">
          <rect x="24" y="30" width="192" height="184" rx="16" />
        </clipPath>
      </defs>

      <g clipPath="url(#thorax-clip)">
        {/* Rib cage */}
        <g stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.35" strokeLinecap="round">
          {[0, 1, 2, 3, 4].map((index) => {
            const y = 76 + index * 22;
            const spread = 62 + index * 8;
            return (
              <g key={index}>
                <path d={`M118 ${y - 6} C ${118 - spread * 0.55} ${y - 10}, ${118 - spread} ${y + 10}, ${118 - spread * 0.9} ${y + 34}`} />
                <path d={`M122 ${y - 6} C ${122 + spread * 0.55} ${y - 10}, ${122 + spread} ${y + 10}, ${122 + spread * 0.9} ${y + 34}`} />
              </g>
            );
          })}
        </g>

        {/* Lungs */}
        <motion.g
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transformOrigin: '120px 130px' }}
          {...breathe}
        >
          <path d="M112 74 C 92 78, 68 100, 62 134 C 57 162, 66 186, 84 190 C 100 194, 110 180, 112 158 Z" />
          <path d="M128 74 C 148 78, 172 100, 178 134 C 183 162, 174 186, 156 190 C 140 194, 130 180, 128 158 Z" />
        </motion.g>

        {/* Trachea + bronchi */}
        <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M120 44 L120 92" />
          <path d="M120 92 L102 112" />
          <path d="M120 92 L138 112" />
          <path d="M102 112 L92 124 M102 112 L108 128" strokeWidth="1.7" strokeOpacity="0.7" />
          <path d="M138 112 L148 124 M138 112 L132 128" strokeWidth="1.7" strokeOpacity="0.7" />
        </g>

        {/* Diagnostic scan sweep */}
        {scan && !reduceMotion && (
          <motion.rect
            x="24"
            y="30"
            width="192"
            height="26"
            fill="url(#thorax-scan)"
            initial={{ y: 20 }}
            animate={{ y: [20, 196, 20] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </g>

      {/* Framing viewport */}
      <rect
        x="24"
        y="30"
        width="192"
        height="184"
        rx="16"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeOpacity="0.3"
      />
      {/* Corner registration marks — the radiology-viewer cue */}
      <g stroke="currentColor" strokeWidth="2" strokeOpacity="0.55" strokeLinecap="round">
        <path d="M34 52 L34 40 L46 40" />
        <path d="M194 40 L206 40 L206 52" />
        <path d="M206 192 L206 204 L194 204" />
        <path d="M46 204 L34 204 L34 192" />
      </g>
    </svg>
  );
});
