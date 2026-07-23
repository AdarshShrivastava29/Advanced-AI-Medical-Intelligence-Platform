import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Spinner } from '@/components/ui/Feedback';
import { useAuthStore } from '@/store/authStore';

// Code-split every page so each route loads its own chunk.
const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PredictionPage = lazy(() => import('@/pages/PredictionPage').then((m) => ({ default: m.PredictionPage })));
const PredictionDetailsPage = lazy(() =>
  import('@/pages/PredictionDetailsPage').then((m) => ({ default: m.PredictionDetailsPage })),
);
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

function PageFallback() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner size={28} />
    </div>
  );
}

/** Redirect authenticated users away from guest-only pages (login/register). */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Protected app */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/predict" element={<PredictionPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<PredictionDetailsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
