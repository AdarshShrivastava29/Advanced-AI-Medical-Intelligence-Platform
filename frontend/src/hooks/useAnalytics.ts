import { useQuery } from '@tanstack/react-query';

import * as api from '@/lib/api/analytics';
import { fetchReadiness } from '@/lib/health';

/** Full analytics summary (overview + trends + distributions). */
export function useAnalyticsSummary(days = 30) {
  return useQuery({
    queryKey: ['analytics', 'summary', days],
    queryFn: () => api.getSummary(days),
  });
}

/** Recent prediction activity. */
export function useRecentActivity(limit = 5) {
  return useQuery({
    queryKey: ['analytics', 'recent', limit],
    queryFn: () => api.getRecentActivity(limit),
  });
}

/** Backend readiness (system status widget). */
export function useReadiness() {
  return useQuery({
    queryKey: ['readiness'],
    queryFn: fetchReadiness,
    refetchInterval: 20_000,
  });
}
