import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  /** Omit on the final (current) crumb. */
  to?: string;
}

/** Breadcrumb trail for the topbar and page headers. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex items-center gap-2 text-sm text-fg-subtle">
        <li className="flex items-center">
          <Link
            to="/dashboard"
            aria-label="Dashboard home"
            className="grid h-6 w-6 place-items-center rounded-lg text-fg-subtle transition hover:bg-surface-sunken hover:text-fg"
          >
            <Home size={14} aria-hidden />
          </Link>
        </li>
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <li aria-hidden className="text-fg-subtle/60">
                <ChevronRight size={14} />
              </li>
              <li className="min-w-0">
                {crumb.to && !isLast ? (
                  <Link
                    to={crumb.to}
                    className="truncate rounded px-0.5 transition hover:text-fg hover:underline underline-offset-4"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="truncate font-medium text-fg" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
