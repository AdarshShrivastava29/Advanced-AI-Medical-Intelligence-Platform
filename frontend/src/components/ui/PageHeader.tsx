import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Small uppercase caption above the title (e.g. section name). */
  eyebrow?: string;
  /** Optional in-page breadcrumb trail. */
  breadcrumbs?: Crumb[];
  /** Metadata chips rendered under the description. */
  meta?: ReactNode;
  className?: string;
}

/** Consistent page title block with eyebrow, breadcrumbs, meta chips and actions. */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  breadcrumbs,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn('mb-7', className)}
    >
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className="mb-3" />}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow && <p className="medical-label mb-1.5">{eyebrow}</p>}
          <h1 className="text-display-sm font-bold text-fg sm:text-[2rem]">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">{description}</p>
          )}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {action && <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
    </motion.div>
  );
}
