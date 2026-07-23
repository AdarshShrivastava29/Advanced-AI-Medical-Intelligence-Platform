import { CalendarClock, LogOut, Mail, Shield, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { useLogout, useMe } from '@/hooks/useAuth';
import { useAnalyticsSummary } from '@/hooks/useAnalytics';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/store/toastStore';

const roleTone = { admin: 'red', doctor: 'brand', user: 'green' } as const;

export function ProfilePage() {
  const { data: user, isLoading } = useMe();
  const summary = useAnalyticsSummary(365);
  const logout = useLogout();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out');
    navigate('/login');
  };

  return (
    <PageTransition>
      <PageHeader title="Profile" description="Your account details." />

      {isLoading || !user ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500 text-2xl font-bold text-white">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
              <div>
                <h2 className="text-xl font-bold">{user.full_name}</h2>
                <Badge tone={roleTone[user.role]}>{user.role.toUpperCase()}</Badge>
              </div>
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-slate-400" />
                <dt className="w-28 text-slate-500">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-slate-400" />
                <dt className="w-28 text-slate-500">Status</dt>
                <dd className="font-medium">{user.is_active ? 'Active' : 'Disabled'}</dd>
              </div>
              <div className="flex items-center gap-3">
                <CalendarClock size={16} className="text-slate-400" />
                <dt className="w-28 text-slate-500">Member since</dt>
                <dd className="font-medium">{formatDate(user.created_at)}</dd>
              </div>
              {user.last_login && (
                <div className="flex items-center gap-3">
                  <UserCircle size={16} className="text-slate-400" />
                  <dt className="w-28 text-slate-500">Last login</dt>
                  <dd className="font-medium">{formatDate(user.last_login)}</dd>
                </div>
              )}
            </dl>

            <div className="mt-8 border-t border-slate-200/60 pt-4 dark:border-white/10">
              <Button variant="danger" onClick={handleLogout}>
                <LogOut size={16} /> Sign out
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Lifetime activity" subtitle="All-time totals" />
            <div className="space-y-4">
              <Stat label="Predictions" value={summary.data?.overview.total_predictions ?? 0} />
              <Stat label="Pneumonia flagged" value={summary.data?.overview.pneumonia_count ?? 0} />
              <Stat label="Normal" value={summary.data?.overview.normal_count ?? 0} />
            </div>
          </Card>
        </div>
      )}
    </PageTransition>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/40 px-4 py-3 dark:bg-white/5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-lg font-bold tabular-nums">{value}</span>
    </div>
  );
}
