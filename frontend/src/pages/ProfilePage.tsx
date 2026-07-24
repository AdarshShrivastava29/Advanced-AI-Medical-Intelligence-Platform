import {
  Activity,
  CalendarClock,
  CheckCircle2,
  Layers,
  LogOut,
  Mail,
  Shield,
  ShieldCheck,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { useAnalyticsSummary } from '@/hooks/useAnalytics';
import { useLogout, useMe } from '@/hooks/useAuth';
import { ORG_NAME, ORG_UNIT, ROLE_LABEL } from '@/lib/platform';
import { cn, formatDate, percent } from '@/lib/utils';
import { useToast } from '@/store/toastStore';

const roleTone = { admin: 'violet', doctor: 'brand', user: 'teal' } as const;

const SECURITY_NOTES: [string, string][] = [
  ['Current session', 'This browser holds an active token. Sign out on shared workstations.'],
  ['Token rotation', 'Access tokens refresh automatically; refresh tokens rotate on use.'],
  ['Audit trail', 'Study creation and report generation are recorded server-side.'],
];

export function ProfilePage() {
  const { data: user, isLoading } = useMe();
  const summary = useAnalyticsSummary(365);
  const logout = useLogout();
  const navigate = useNavigate();
  const toast = useToast();

  const overview = summary.data?.overview;

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out');
    navigate('/login');
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Identity, workspace membership and lifetime activity on this platform."
      />

      {isLoading || !user ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl xl:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {/* ---------------- Identity ---------------- */}
          <Card padding="none" className="overflow-hidden xl:col-span-2">
            <div className="clinical-hero px-6 pb-14 pt-8 sm:px-8">
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent-400/15 blur-3xl" />
              </div>
              <div className="relative">
                <p className="text-label font-semibold uppercase text-accent-300">
                  {ORG_NAME} · {ORG_UNIT}
                </p>
                <h2 className="mt-2 font-display text-display-sm font-bold text-white">
                  {user.full_name}
                </h2>
                <p className="mt-1 text-sm text-white/75">{user.email}</p>
              </div>
            </div>

            <div className="px-6 sm:px-8">
              {/* Avatar overlaps the banner edge */}
              <div className="-mt-10 flex items-end gap-4">
                <Avatar name={user.full_name} size="lg" online className="ring-4 ring-surface" />
                <div className="flex flex-wrap items-center gap-2 pb-1">
                  <Badge tone={roleTone[user.role]} size="sm">
                    <ShieldCheck size={12} aria-hidden /> {ROLE_LABEL[user.role] ?? user.role}
                  </Badge>
                  <Badge tone={user.is_active ? 'green' : 'red'} size="sm" dot>
                    {user.is_active ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              <dl className="mt-6 grid gap-6 border-t border-line py-6 sm:grid-cols-2">
                <Detail Icon={Mail} label="Work email" value={user.email} />
                <Detail Icon={Shield} label="Access level" value={ROLE_LABEL[user.role] ?? user.role} />
                <Detail Icon={CalendarClock} label="Member since" value={formatDate(user.created_at)} />
                <Detail
                  Icon={UserCircle}
                  label="Last sign-in"
                  value={user.last_login ? formatDate(user.last_login) : 'This session'}
                />
              </dl>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-muted px-6 py-4 sm:px-8">
              <p className="text-xs leading-relaxed text-fg-subtle">
                Profile details are managed by your platform administrator.
              </p>
              <Button
                variant="danger"
                size="sm"
                onClick={handleLogout}
                leadingIcon={<LogOut size={16} />}
              >
                Sign out
              </Button>
            </div>
          </Card>

          {/* ---------------- Activity ---------------- */}
          <div className="space-y-6">
            <Card>
              <CardHeader
                eyebrow="Lifetime activity"
                title="Your contribution"
                subtitle="All studies analysed under this account"
                icon={<Activity size={18} />}
                divided
              />
              <div className="space-y-3">
                <Metric
                  Icon={Layers}
                  label="Studies analysed"
                  value={overview?.total_predictions ?? 0}
                  tone="brand"
                />
                <Metric
                  Icon={Activity}
                  label="Pneumonia flagged"
                  value={overview?.pneumonia_count ?? 0}
                  tone="red"
                />
                <Metric
                  Icon={CheckCircle2}
                  label="Normal studies"
                  value={overview?.normal_count ?? 0}
                  tone="green"
                />
              </div>

              {overview && overview.total_predictions > 0 && (
                <p className="mt-4 rounded-lg bg-surface-muted p-3 text-xs leading-relaxed text-fg-muted">
                  Mean model confidence across your studies is{' '}
                  <strong className="font-semibold text-fg">
                    {percent(overview.average_confidence, 1)}
                  </strong>
                  .
                </p>
              )}
            </Card>

            <Card>
              <CardHeader
                eyebrow="Security"
                title="Session & access"
                icon={<Shield size={18} />}
                divided
              />
              <ul className="space-y-3 text-xs leading-relaxed text-fg-muted">
                {SECURITY_NOTES.map(([title, body]) => (
                  <li key={title} className="flex gap-3">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-700 dark:bg-accent-400"
                      aria-hidden
                    />
                    <span>
                      <strong className="font-semibold text-fg">{title}.</strong> {body}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </PageTransition>
  );
}

function Detail({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-sunken text-fg-subtle"
        aria-hidden
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <dt className="medical-label">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-medium text-fg">{value}</dd>
      </div>
    </div>
  );
}

const metricTone = {
  brand: 'bg-brand-600/10 text-brand-700 dark:bg-accent-400/10 dark:text-accent-300',
  red: 'bg-danger-500/10 text-danger-600 dark:text-danger-400',
  green: 'bg-success-500/10 text-success-600 dark:text-success-400',
} as const;

function Metric({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: LucideIcon;
  label: string;
  value: number;
  tone: keyof typeof metricTone;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-4 py-3">
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', metricTone[tone])}
          aria-hidden
        >
          <Icon size={16} />
        </span>
        <span className="truncate text-sm text-fg-muted">{label}</span>
      </span>
      <span className="shrink-0 font-display text-xl font-bold text-fg">
        <AnimatedCounter value={value} />
      </span>
    </div>
  );
}
