import { QueryClient } from '@tanstack/react-query';

// Shared TanStack Query client for all server-state fetching.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
