import { motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';

import { cn } from '@/lib/utils';

// A 4-3-3-2 topology: enough structure to read as a network, sparse enough to
// stay elegant behind text. Coordinates are laid out on a 320×220 canvas.
const LAYERS: { x: number; ys: number[] }[] = [
  { x: 34, ys: [34, 88, 142, 196] },
  { x: 128, ys: [58, 112, 166] },
  { x: 222, ys: [58, 112, 166] },
  { x: 292, ys: [86, 140] },
];

const EDGES = LAYERS.flatMap((layer, layerIndex) => {
  const next = LAYERS[layerIndex + 1];
  if (!next) return [];
  return layer.ys.flatMap((y1) =>
    next.ys.map((y2) => ({ x1: layer.x, y1, x2: next.x, y2, key: `${layerIndex}-${y1}-${y2}` })),
  );
});

const NODES = LAYERS.flatMap((layer, layerIndex) =>
  layer.ys.map((y) => ({ x: layer.x, y, key: `${layerIndex}-${y}`, layerIndex })),
);

/**
 * Decorative inference-graph visualisation. Edges pulse in a slow travelling
 * wave to suggest a forward pass without ever competing with foreground copy.
 */
export const NeuralNetwork = memo(function NeuralNetwork({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      viewBox="0 0 320 220"
      className={cn('h-full w-full', className)}
      fill="none"
      aria-hidden
      role="presentation"
    >
      <g stroke="currentColor" strokeWidth={0.75}>
        {EDGES.map((edge, index) => (
          <motion.line
            key={edge.key}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            initial={{ opacity: 0.1 }}
            animate={reduceMotion ? { opacity: 0.16 } : { opacity: [0.08, 0.34, 0.08] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: (index % 9) * 0.22 }
            }
          />
        ))}
      </g>

      <g fill="currentColor">
        {NODES.map((node, index) => (
          <motion.circle
            key={node.key}
            cx={node.x}
            cy={node.y}
            r={4}
            initial={{ opacity: 0.4 }}
            animate={reduceMotion ? { opacity: 0.55 } : { opacity: [0.35, 0.95, 0.35], r: [3.6, 4.6, 3.6] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: node.layerIndex * 0.5 + (index % 4) * 0.12 }
            }
          />
        ))}
      </g>
    </svg>
  );
});
