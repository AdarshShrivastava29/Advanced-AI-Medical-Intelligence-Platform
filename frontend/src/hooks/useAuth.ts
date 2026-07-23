import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as authApi from '@/lib/api/auth';
import { useAuthStore } from '@/store/authStore';

/** Query the current authenticated user (enabled only when a token exists). */
export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await authApi.fetchMe();
      setUser(user);
      return user;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}

/** Login mutation: stores tokens, then hydrates the user profile. */
export function useLogin() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token);
      const user = await authApi.fetchMe();
      setUser(user);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

/** Registration mutation. */
export function useRegister() {
  return useMutation({ mutationFn: authApi.register });
}

/** Returns a logout handler that revokes the refresh token and clears state. */
export function useLogout() {
  const queryClient = useQueryClient();
  return async () => {
    const { refreshToken, clear } = useAuthStore.getState();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      clear();
      queryClient.clear();
    }
  };
}
