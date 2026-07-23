import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';

import { fetchReadiness } from '@/lib/health';

// Phase 1 system-status page: verifies the frontend is wired to the backend and
// renders the readiness of each backend dependency. Demonstrates the loading,
// error and empty states mandated by docs/21_UI_UX_Guidelines.md. This is an
// infrastructure/status view, not a business feature page.
export function FoundationStatusPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['readiness'],
    queryFn: fetchReadiness,
    refetchInterval: 15_000,
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold">Platform Foundation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Phase 1 infrastructure is online. This status view confirms the frontend
          can reach the backend and reports each dependency&apos;s readiness.
        </p>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Backend readiness
        </h2>

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={18} aria-hidden />
            <span className="text-sm">Checking backend…</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 text-risk-high">
            <CircleAlert size={18} aria-hidden />
            <span className="text-sm">
              Backend unreachable. Start the API with{' '}
              <code className="rounded bg-black/10 px-1">uvicorn app.main:app</code>.
            </span>
          </div>
        )}

        {data && (
          <ul className="space-y-2">
            {Object.entries(data.checks).map(([component, healthy]) => (
              <li
                key={component}
                className="flex items-center justify-between rounded-lg bg-white/40 px-4 py-2 dark:bg-white/5"
              >
                <span className="text-sm capitalize">{component.replace('_', ' ')}</span>
                {healthy ? (
                  <span className="flex items-center gap-1 text-sm text-risk-low">
                    <CheckCircle2 size={16} aria-hidden /> healthy
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-risk-high">
                    <CircleAlert size={16} aria-hidden /> unavailable
                  </span>
                )}
              </li>
            ))}
            {Object.keys(data.checks).length === 0 && (
              <li className="text-sm text-slate-500">No components reported.</li>
            )}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-400">
        AIMIP provides clinical decision-support only and is not a medical device.
      </p>
    </motion.section>
  );
}
