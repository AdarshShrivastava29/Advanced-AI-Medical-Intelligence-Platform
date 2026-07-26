import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { useAuthStore } from '@/store/authStore';
import type { TokenResponse } from '@/types/api';

// Central Axios client. A request interceptor attaches the bearer token; a
// response interceptor transparently refreshes an expired access token once
// (single-flight) and retries the original request (see docs/08_Frontend_Architecture.md).

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Single-flight refresh: concurrent 401s share one refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) {
    return null;
  }
  try {
    const response = await axios.post<TokenResponse>(`${baseURL}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    setTokens(response.data.access_token, response.data.refresh_token);
    return response.data.access_token;
  } catch {
    clear();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isUnauthorized = error.response?.status === 401;
    const isRefreshCall = original?.url?.includes('/auth/refresh');

    if (isUnauthorized && original && !original._retry && !isRefreshCall) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;
      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);
