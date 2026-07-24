import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Presentation-only chrome state (sidebar collapse). Kept separate from the
// auth/theme stores so it never participates in session or data flow.
interface LayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    { name: 'aimip-layout' },
  ),
);
