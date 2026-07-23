import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { UserResponse } from '@/types/api';

// Client-side auth state (UI state) held in Zustand and persisted to localStorage.
// Server state (queries) is handled separately by TanStack Query — see
// docs/08_Frontend_Architecture.md.
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserResponse | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: UserResponse | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      clear: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
    }),
    { name: 'aimip-auth' },
  ),
);
