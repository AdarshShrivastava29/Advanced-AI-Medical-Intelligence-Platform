import { motion } from 'framer-motion';
import { ChevronRight, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge, ClassBadge } from '@/components/ui/Badge';
import { cn, percent, timeAgo } from '@/lib/utils';
import type { PredictionListItem } from '@/types/api';

/**
 * Vertical case timeline for recent studies. Reads like a worklist entry:
 * finding, confidence, model and elapsed time, with OOD cases called out.
 */
export function ActivityTimeline({ items }: { items: PredictionListItem[] }) {
  return (
    <ol className="relative space-y-1">
      {/* Spine */}
      <span className="absolute bottom-4 left-[0.9375rem] top-4 w-px bg-line" aria-hidden />

      {items.map((item, index) => {
        const isPneumonia = item.predicted_class.toUpperCase() === 'PNEUMONIA';
        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              to={`/history/${item.id}`}
              className="group relative flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-sunken"
            >
              {/* Node */}
              <span
                className={cn(
                  'relative z-10 mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-surface transition-transform duration-300 group-hover:scale-110',
                  isPneumonia
                    ? 'bg-danger-500/12 text-danger-600 dark:text-danger-500'
                    : 'bg-success-500/12 text-success-600 dark:text-success-500',
                )}
                aria-hidden
              >
                <span className="h-2 w-2 rounded-full bg-current" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ClassBadge label={item.predicted_class} size="sm" />
                  <span className="text-sm font-semibold text-fg nums">
                    {percent(item.confidence)}
                  </span>
                  {item.ood_flag && (
                    <Badge tone="amber" size="sm">
                      <ShieldAlert size={11} aria-hidden /> OOD
                    </Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-fg-subtle">
                  {item.model_arch} · {timeAgo(item.created_at)}
                </p>
              </div>

              <ChevronRight
                size={16}
                aria-hidden
                className="mt-2 shrink-0 text-fg-subtle opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
              />
            </Link>
          </motion.li>
        );
      })}
    </ol>
  );
}
