import { useMemo } from 'react';

import { useAnalyticsSummary, useReadiness, useRecentActivity } from '@/hooks/useAnalytics';

export type SystemState = 'operational' | 'degraded' | 'offline' | 'unknown';

export interface SystemStatus {
  state: SystemState;
  label: string;
  healthy: number;
  total: number;
  /** Components reporting unhealthy, for the notification feed. */
  failing: string[];
  version: string | null;
  isLoading: boolean;
}

/**
 * Roll the `/health/ready` component checks up into a single chrome-level
 * status. Purely derived — no new endpoint is introduced.
 */
export function useSystemStatus(): SystemStatus {
  const readiness = useReadiness();

  return useMemo(() => {
    const checks = readiness.data?.checks ?? {};
    const entries = Object.entries(checks);
    const failing = entries.filter(([, healthy]) => !healthy).map(([name]) => name);
    const healthy = entries.length - failing.length;

    let state: SystemState = 'unknown';
    if (readiness.isError) state = 'offline';
    else if (entries.length > 0) state = failing.length === 0 ? 'operational' : 'degraded';

    const label =
      state === 'operational'
        ? 'All systems operational'
        : state === 'degraded'
          ? `${failing.length} service${failing.length === 1 ? '' : 's'} degraded`
          : state === 'offline'
            ? 'Backend unreachable'
            : 'Checking status…';

    return {
      state,
      label,
      healthy,
      total: entries.length,
      failing,
      version: readiness.data?.version ?? null,
      isLoading: readiness.isLoading,
    };
  }, [readiness.data, readiness.isError, readiness.isLoading]);
}

/**
 * The inference model currently producing predictions, read from the most
 * recent prediction record (the only place the backend exposes it).
 */
export function useActiveModel(): { arch: string | null; isLoading: boolean } {
  const recent = useRecentActivity(5);
  return {
    arch: recent.data?.[0]?.model_arch ?? null,
    isLoading: recent.isLoading,
  };
}

export type AlertTone = 'warning' | 'danger' | 'info';

export interface SystemAlert {
  id: string;
  tone: AlertTone;
  title: string;
  detail: string;
  /** Route to open when the alert is clicked. */
  to?: string;
}

/**
 * Notification feed derived from signals the platform already tracks:
 * unhealthy backend components and out-of-distribution uploads. Nothing is
 * fabricated — an empty feed means there is genuinely nothing to report.
 */
export function useSystemAlerts(): SystemAlert[] {
  const status = useSystemStatus();
  const summary = useAnalyticsSummary(14);
  const recent = useRecentActivity(5);

  return useMemo(() => {
    const alerts: SystemAlert[] = [];

    for (const component of status.failing) {
      alerts.push({
        id: `health-${component}`,
        tone: 'danger',
        title: `${component.replace(/_/g, ' ')} unavailable`,
        detail: 'A backend dependency failed its readiness check.',
        to: '/settings',
      });
    }

    const oodCount = summary.data?.overview.ood_count ?? 0;
    if (oodCount > 0) {
      alerts.push({
        id: 'ood-total',
        tone: 'warning',
        title: `${oodCount} out-of-distribution upload${oodCount === 1 ? '' : 's'}`,
        detail: 'These scans fell outside the training distribution and need review.',
        to: '/history',
      });
    }

    for (const item of recent.data ?? []) {
      if (!item.ood_flag) continue;
      alerts.push({
        id: `ood-${item.id}`,
        tone: 'warning',
        title: 'Recent scan flagged out-of-distribution',
        detail: `${item.predicted_class} · review before clinical use.`,
        to: `/history/${item.id}`,
      });
    }

    return alerts;
  }, [status.failing, summary.data, recent.data]);
}
