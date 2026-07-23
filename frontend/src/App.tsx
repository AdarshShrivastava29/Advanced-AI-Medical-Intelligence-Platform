import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/Toaster';

// Root component: error boundary -> providers -> router (+ global toaster).
export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
        <Toaster />
      </AppProviders>
    </ErrorBoundary>
  );
}
