// Shared API response types mirroring the backend schemas (docs/18_API_Design.md).

export type Role = 'user' | 'doctor' | 'admin';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface HealthResponse {
  status: string;
  version: string;
  checks: Record<string, boolean>;
}

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: unknown[];
  request_id?: string;
}
