import {
  BarChart3,
  BookOpen,
  History,
  LayoutDashboard,
  MessagesSquare,
  ScanLine,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  /** Short caption shown in the expanded sidebar. */
  description?: string;
  /** Marks routes whose children should keep the parent highlighted. */
  matchPrefix?: string;
}

export interface NavSection {
  /** Section caption; omitted for the primary group. */
  title?: string;
  items: NavItem[];
}

/** Primary sidebar navigation, grouped the way a clinical workflow reads. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Clinical',
    items: [
      { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, description: 'Overview & activity' },
      { to: '/predict', label: 'New Prediction', Icon: ScanLine, description: 'Analyse a chest X-ray' },
      { to: '/history', label: 'History', Icon: History, description: 'Patient scan records', matchPrefix: '/history' },
    ],
  },
  {
    title: 'Knowledge',
    items: [
      { to: '/assistant', label: 'Knowledge Assistant', Icon: MessagesSquare, description: 'Grounded medical Q&A' },
      { to: '/documents', label: 'Documents', Icon: BookOpen, description: 'Indexed literature' },
      { to: '/analytics', label: 'Analytics', Icon: BarChart3, description: 'Performance insights' },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/settings', label: 'Settings', Icon: Settings, description: 'Theme & diagnostics' },
      { to: '/profile', label: 'Profile', Icon: User, description: 'Your account' },
    ],
  },
];

/** Flat list of every navigable destination (used by search and breadcrumbs). */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

/** Resolve the breadcrumb label for a pathname, falling back to the segment. */
export function labelForPath(pathname: string): string {
  const match = NAV_ITEMS.find((item) => item.to === pathname);
  if (match) return match.label;
  const segment = pathname.split('/').filter(Boolean).pop() ?? '';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
