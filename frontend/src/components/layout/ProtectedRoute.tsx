import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';

/** Redirects unauthenticated users to the login page, preserving the target. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
