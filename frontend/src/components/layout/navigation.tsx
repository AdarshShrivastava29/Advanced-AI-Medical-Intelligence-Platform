import { BarChart3, History, LayoutDashboard, ScanLine, Settings, User } from 'lucide-react';
import type { ReactNode } from 'react';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

/** Primary sidebar navigation items for the authenticated app. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/predict', label: 'New Prediction', icon: <ScanLine size={18} /> },
  { to: '/history', label: 'History', icon: <History size={18} /> },
  { to: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  { to: '/profile', label: 'Profile', icon: <User size={18} /> },
];
