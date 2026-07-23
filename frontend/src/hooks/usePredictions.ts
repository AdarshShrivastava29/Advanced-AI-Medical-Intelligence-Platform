import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { AxiosProgressEvent } from 'axios';

import * as api from '@/lib/api/predictions';

/** Create-prediction mutation with upload-progress tracking. */
export function useCreatePrediction() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: (file: File) =>
      api.createPrediction(file, (event: AxiosProgressEvent) => {
        if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['history'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onSettled: () => setUploadProgress(0),
  });

  return { ...mutation, uploadProgress };
}

/** Fetch a single prediction by id. */
export function usePrediction(id: string | undefined) {
  return useQuery({
    queryKey: ['prediction', id],
    queryFn: () => api.getPrediction(id as string),
    enabled: Boolean(id),
  });
}

/** Paginated prediction history. */
export function useHistory(page: number, size = 12) {
  return useQuery({
    queryKey: ['history', page, size],
    queryFn: () => api.getHistory(page, size),
  });
}

/** Regenerate a prediction's report. */
export function useRegenerateReport(predictionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.regenerateReport(predictionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prediction', predictionId] }),
  });
}
