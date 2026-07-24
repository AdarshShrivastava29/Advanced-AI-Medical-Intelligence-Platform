import { LifeBuoy, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyArt, type EmptyArtKind } from '@/components/visuals/EmptyArt';
import { cn } from '@/lib/utils';

/** Inline spinner. */
export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return <Loader2 className={cn('animate-spin text-brand-600', className)} size={size} aria-hidden />;
}

/**
 * Medical-themed indeterminate loader: a pulse ring around a sweeping trace.
 * Used where a bare spinner would feel generic (inference, ingestion).
 */
export function ClinicalLoader({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('relative grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/25" />
      <span className="absolute inset-0 rounded-full border border-brand-500/30" />
      <svg viewBox="0 0 48 48" className="h-1/2 w-1/2 text-brand-600 dark:text-accent-400" fill="none">
        <path
          d="M2 26h8l4-12 6 22 5-16 4 6h17"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-pulse"
        />
      </svg>
    </span>
  );
}

/** Full-panel loading indicator with an optional caption. */
export function LoadingPanel({
  label = 'Loading…',
  detail,
  className,
}: {
  label?: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16', className)} role="status">
      <ClinicalLoader />
      <div className="text-center">
        <p className="text-sm font-medium text-fg">{label}</p>
        {detail && <p className="mt-1 text-xs text-fg-muted">{detail}</p>}
      </div>
    </div>
  );
}

/** Shimmer skeleton block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

/** Multi-line text placeholder with a naturally ragged last line. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** Card-shaped placeholder matching the standard surface geometry. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('surface-card p-5 sm:p-6', className)} aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

/** Row placeholder for tables and record lists. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 rounded-xl" />
      ))}
    </div>
  );
}

interface StateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

interface EmptyStateProps extends StateProps {
  /** Line-art illustration; falls back to the generic records drawing. */
  art?: EmptyArtKind;
  /** Supporting hint rendered under the action (e.g. an accepted-format note). */
  hint?: ReactNode;
}

/** Empty-state placeholder with a medical line illustration. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  art = 'records',
  hint,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-5 px-6 py-14 text-center', className)}
    >
      {icon ? (
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-surface-sunken text-fg-subtle ring-1 ring-inset ring-line">
          {icon}
        </span>
      ) : (
        <EmptyArt kind={art} className="h-28 w-40 text-brand-600/60 dark:text-accent-400/50" />
      )}
      <div className="max-w-sm">
        <p className="font-display text-base font-semibold text-fg">{title}</p>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {action}
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

interface ErrorStateProps extends StateProps {
  /** Renders a standard "Try again" button when provided. */
  onRetry?: () => void;
  /** Technical detail (request id, message) shown in a muted code block. */
  detail?: string;
  /** Adds a "Contact support" affordance next to retry. */
  supportHref?: string;
}

/** Error-state placeholder with retry, detail and support affordances. */
export function ErrorState({
  title,
  description,
  action,
  onRetry,
  detail,
  supportHref,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-5 px-6 py-14 text-center', className)}
      role="alert"
    >
      <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-danger-500/10 text-danger-600 ring-1 ring-inset ring-danger-500/20 dark:text-danger-500">
        <TriangleAlert size={28} aria-hidden />
      </span>
      <div className="max-w-md">
        <p className="font-display text-base font-semibold text-fg">{title}</p>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{description}</p>}
        {detail && (
          <p className="mx-auto mt-3 max-w-sm truncate rounded-lg bg-surface-sunken px-3 py-2 font-mono text-[11px] text-fg-subtle">
            {detail}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {action ??
          (onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry} leadingIcon={<RefreshCw size={15} />}>
              Try again
            </Button>
          ))}
        {supportHref && (
          <a
            href={supportHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-fg-muted transition hover:bg-surface-sunken hover:text-fg"
          >
            <LifeBuoy size={15} aria-hidden /> Contact support
          </a>
        )}
      </div>
    </div>
  );
}
