import { Activity } from 'lucide-react';
import { Outlet } from 'react-router-dom';

// Persistent application shell (header + content outlet). Navigation for feature
// areas is added alongside those pages in later phases.
export function AppShell() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-teal-400/10 dark:from-slate-950 dark:via-slate-900 dark:to-brand-900/20">
      <header className="sticky top-0 z-10 border-b border-white/10 backdrop-blur-glass">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white">
            <Activity size={20} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">AIMIP</p>
            <p className="text-xs text-slate-500">AI Medical Intelligence Platform</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
