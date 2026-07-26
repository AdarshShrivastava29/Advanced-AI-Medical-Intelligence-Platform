import { apiClient } from '@/lib/apiClient';
import type { AnalyticsSummary, PredictionListItem } from '@/types/api';

// Analytics API calls (docs/18_API_Design.md).

export async function getSummary(days = 30): Promise<AnalyticsSummary> {
  const { data } = await apiClient.get<AnalyticsSummary>('/analytics/summary', {
    params: { days },
  });
  return data;
}

export async function getRecentActivity(limit = 5): Promise<PredictionListItem[]> {
  const { data } = await apiClient.get<PredictionListItem[]>('/analytics/recent-activity', {
    params: { limit },
  });
  return data;
}
