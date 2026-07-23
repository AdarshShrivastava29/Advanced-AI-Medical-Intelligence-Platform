import { Loader2, PackageOpen, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Inline spinner. */
export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return <Loader2 className={cn('animate-spin text-brand-500', className)} size={size} aria-hidden />;
}

/** Shimmer skeleton block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

interface StateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/** Empty-state placeholder. */
export function EmptyState({ title, description, icon, action }: StateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-500/10 text-slate-400">
        {icon ?? <PackageOpen size={26} aria-hidden />}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Error-state placeholder. */
export function ErrorState({ title, description, action }: StateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-risk-high/10 text-risk-high">
        <TriangleAlert size={26} aria-hidden />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
