import { apiOrigin } from '@/lib/utils';
import type { HealthResponse } from '@/types/api';

// Health probes live outside the versioned API prefix. We target the backend
// origin derived from VITE_API_BASE_URL so this works when the API is on a
// different host (e.g. frontend on Netlify, backend on Render). When the base is
// relative it resolves to a same-origin path (dev Vite proxy / nginx).
export async function fetchReadiness(): Promise<HealthResponse> {
  const response = await fetch(`${apiOrigin()}/health/ready`);
  if (!response.ok && response.status !== 503) {
    throw new Error(`Readiness probe failed with status ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
}
