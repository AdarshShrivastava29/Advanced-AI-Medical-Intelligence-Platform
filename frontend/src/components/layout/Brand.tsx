import { Activity } from 'lucide-react';

/** AIMIP wordmark + logo. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 text-white shadow-sm">
        <Activity size={20} aria-hidden />
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className="font-semibold">AIMIP</p>
          <p className="text-[11px] text-slate-500">Medical Intelligence</p>
        </div>
      )}
    </div>
  );
}
