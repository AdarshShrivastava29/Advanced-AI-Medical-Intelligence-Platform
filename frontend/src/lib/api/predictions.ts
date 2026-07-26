import type { AxiosProgressEvent } from 'axios';

import { apiClient } from '@/lib/apiClient';
import type { Page, PredictionListItem, PredictionResponse, ReportResponse } from '@/types/api';

// Prediction + report API calls (docs/18_API_Design.md).

export async function createPrediction(
  file: File,
  onUploadProgress?: (event: AxiosProgressEvent) => void,
): Promise<PredictionResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<PredictionResponse>('/predict', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return data;
}

export async function getPrediction(id: string): Promise<PredictionResponse> {
  const { data } = await apiClient.get<PredictionResponse>(`/predict/${id}`);
  return data;
}

export async function getHistory(page = 1, size = 12): Promise<Page<PredictionListItem>> {
  const { data } = await apiClient.get<Page<PredictionListItem>>('/history', {
    params: { page, size },
  });
  return data;
}

export async function getReport(predictionId: string): Promise<ReportResponse> {
  const { data } = await apiClient.get<ReportResponse>(`/reports/${predictionId}`);
  return data;
}

export async function regenerateReport(predictionId: string): Promise<ReportResponse> {
  const { data } = await apiClient.post<ReportResponse>(`/reports/${predictionId}/regenerate`);
  return data;
}
