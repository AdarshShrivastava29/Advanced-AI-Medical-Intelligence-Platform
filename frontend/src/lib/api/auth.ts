import { apiClient } from '@/lib/apiClient';
import type { TokenResponse, UserResponse } from '@/types/api';

// Auth API calls (docs/19_Authentication.md).

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends Credentials {
  full_name: string;
}

export async function login(payload: Credentials): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', payload);
  return data;
}

export async function register(payload: RegisterPayload): Promise<UserResponse> {
  const { data } = await apiClient.post<UserResponse>('/auth/register', payload);
  return data;
}

export async function fetchMe(): Promise<UserResponse> {
  const { data } = await apiClient.get<UserResponse>('/auth/me');
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refresh_token: refreshToken });
}
