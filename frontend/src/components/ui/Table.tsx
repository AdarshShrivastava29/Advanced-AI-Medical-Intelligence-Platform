import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import type { HTMLAttributes, ReactNode, ThHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Table primitives for medical-record listings. The wrapper owns the rounded
 * border, the horizontal scroll and the vertical scroll region that makes the
 * header stick, so a wide table never breaks the page layout.
 */
export function TableWrapper({
  children,
  className,
  /** Caps the scroll region so `THead` can stick while the body scrolls. */
  maxHeight,
  /** Pinned below the scroll region — pagination belongs here, not inside it. */
  footer,
}: {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  footer?: ReactNode;
}) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-line bg-surface elevation-1', className)}>
      <div className="overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
        {children}
      </div>
      {footer}
    </div>
  );
}

export function Table({ children, className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn('w-full min-w-[46rem] border-separate border-spacing-0 text-sm', className)}
      {...props}
    >
      {children}
    </table>
  );
}

/**
 * Sticky header. `border-separate` on the table plus a bottom border on each
 * cell keeps the hairline visible while the header is pinned — a `border-b` on
 * the row itself collapses away under `position: sticky`.
 */
export function THead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead
      className={cn('sticky top-0 z-10 bg-surface-muted [&_th]:border-b [&_th]:border-line', className)}
    >
      {children}
    </thead>
  );
}

interface TBodyProps {
  children: ReactNode;
  className?: string;
  /** Subtle zebra striping for dense record lists. */
  striped?: boolean;
}

export function TBody({ children, className, striped = false }: TBodyProps) {
  return (
    <tbody
      className={cn(
        '[&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-line',
        striped && '[&_tr:nth-child(even)_td]:bg-surface-muted/60',
        className,
      )}
    >
      {children}
    </tbody>
  );
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

const alignClass = (align: 'left' | 'center' | 'right') =>
  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

export function Th({
  children,
  sortable = false,
  direction = null,
  onSort,
  align = 'left',
  className,
  ...props
}: ThProps) {
  const SortIcon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ChevronsUpDown;

  return (
    <th
      scope="col"
      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}
      className={cn(
        'whitespace-nowrap px-4 py-3 text-label font-semibold uppercase text-fg-subtle',
        alignClass(align),
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            'group/sort -mx-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:text-fg',
            align === 'right' && 'flex-row-reverse',
            direction && 'text-fg',
          )}
        >
          {children}
          <SortIcon
            size={12}
            aria-hidden
            className={cn(
              'shrink-0 transition-opacity',
              direction ? 'opacity-100' : 'opacity-40 group-hover/sort:opacity-70',
            )}
          />
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
  return (
    <td
      className={cn('px-4 py-3 align-middle text-fg transition-colors', alignClass(align), className)}
      {...props}
    >
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
        'group/row',
        // Hover lives on the cells so it survives zebra striping and the sticky
        // header's stacking context.
        interactive &&
          'cursor-pointer [&_td]:hover:bg-brand-600/[0.05] dark:[&_td]:hover:bg-accent-400/[0.06]',
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
      <p className={cn('border-t border-line px-4 py-3 text-xs text-fg-subtle nums', className)}>
        {total} {unit}
      </p>
    );
  }

  // Compact window of page numbers centred on the current page.
  const windowSize = Math.min(5, pages);
  const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), pages - windowSize + 1));
  const visible = Array.from({ length: windowSize }, (_, index) => start + index);

  const stepClass =
    'grid h-8 w-8 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface hover:text-fg disabled:pointer-events-none disabled:opacity-40';

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
          aria-label="Previous page"
          className={stepClass}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        {visible.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => onChange(entry)}
            aria-current={entry === page ? 'page' : undefined}
            aria-label={`Page ${entry}`}
            className={cn(
              'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm font-medium transition-colors nums',
              entry === page
                ? 'bg-brand-700 text-white elevation-1'
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
          aria-label="Next page"
          className={stepClass}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
