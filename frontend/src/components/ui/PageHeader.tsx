import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Consistent page title block. */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
