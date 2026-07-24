import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { HTMLAttributes, ReactNode, ThHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Table primitives for medical-record style listings. The wrapper owns the
 * rounded border and horizontal scroll so wide tables never break the layout.
 */
export function TableWrapper({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-line bg-surface shadow-card', className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({ children, className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('w-full min-w-[42rem] border-collapse text-sm', className)} {...props}>
      {children}
    </table>
  );
}

export function THead({ children, className }: { children: ReactNode; className?: string }) {
  return <thead className={cn('bg-surface-muted', className)}>{children}</thead>;
}

export function TBody({ children, className }: { children: ReactNode; className?: string }) {
  return <tbody className={cn('divide-y divide-line', className)}>{children}</tbody>;
}

export type SortDirection = 'asc' | 'desc' | null;

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  /** Enables the sort affordance; omit for static columns. */
  sortable?: boolean;
  direction?: SortDirection;
  onSort?: () => void;
  align?: 'left' | 'center' | 'right';
}

export function Th({
  children,
  sortable = false,
  direction = null,
  onSort,
  align = 'left',
  className,
  ...props
}: ThProps) {
  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const SortIcon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ChevronsUpDown;

  return (
    <th
      scope="col"
      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}
      className={cn(
        'whitespace-nowrap px-4 py-3 text-label font-semibold uppercase text-fg-subtle',
        alignClass,
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            'inline-flex items-center gap-1.5 rounded transition-colors hover:text-fg',
            direction && 'text-fg',
          )}
        >
          {children}
          <SortIcon size={13} aria-hidden className={cn(!direction && 'opacity-50')} />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

interface TdProps extends HTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
}

export function Td({ children, align = 'left', className, ...props }: TdProps) {
  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <td className={cn('px-4 py-3.5 align-middle text-fg', alignClass, className)} {...props}>
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(
        'transition-colors',
        interactive && 'cursor-pointer hover:bg-brand-500/[0.045]',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
  /** Label for the counted entity, e.g. "records". */
  unit?: string;
  className?: string;
}

/** Footer pagination control shared by every paged listing. */
export function Pagination({ page, pages, total, onChange, unit = 'records', className }: PaginationProps) {
  if (pages <= 1) {
    return (
      <p className={cn('px-4 py-3 text-xs text-fg-subtle', className)}>
        {total} {unit}
      </p>
    );
  }

  // Compact window of page numbers around the current page.
  const windowSize = 5;
  const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), pages - windowSize + 1));
  const visible = Array.from({ length: Math.min(windowSize, pages) }, (_, i) => start + i);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-muted px-4 py-3',
        className,
      )}
    >
      <p className="text-xs text-fg-subtle nums">
        Page {page} of {pages} · {total} {unit}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="h-8 rounded-lg px-3 text-sm font-medium text-fg-muted transition hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        {visible.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => onChange(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(
              'h-8 min-w-8 rounded-lg px-2 text-sm font-medium transition nums',
              entry === page
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-fg-muted hover:bg-surface hover:text-fg',
            )}
          >
            {entry}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          className="h-8 rounded-lg px-3 text-sm font-medium text-fg-muted transition hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
