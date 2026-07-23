import { Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { FoundationStatusPage } from '@/pages/FoundationStatusPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Phase 1 route shell. Business feature pages (Dashboard, Prediction, etc.) are
// added in later phases — see docs/00_Project_Roadmap.md.
export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<FoundationStatusPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
