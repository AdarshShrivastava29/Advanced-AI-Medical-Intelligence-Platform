import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useLogin } from '@/hooks/useAuth';
import { ORG_NAME } from '@/lib/platform';
import type { ProblemDetail } from '@/types/api';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [resetOpen, setResetOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { remember: true } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync({ email: values.email, password: values.password });
      navigate('/dashboard');
    } catch (err) {
      const detail = (err as AxiosError<ProblemDetail>).response?.data?.detail;
      setError('password', { message: detail ?? 'Invalid email or password.' });
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to the Medical Intelligence Platform"
      footer={
        <>
          Need access to this workspace?{' '}
          <Link
            to="/register"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-accent-400"
          >
            Request an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          autoFocus
          icon={<Mail size={16} />}
          placeholder="you@hospital.org"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="space-y-2">
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            icon={<Lock size={16} />}
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-fg-muted">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-line-strong bg-surface accent-brand-700 dark:accent-accent-400"
                {...register('remember')}
              />
              Keep me signed in
            </label>
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline dark:text-accent-400"
            >
              Forgot password?
            </button>
          </div>
        </div>

        {/* Session-scope notice: tokens persist locally, so shared workstations
            need the explicit warning radiology departments expect. */}
        <p className="flex items-start gap-2 rounded-xl bg-surface-sunken px-3 py-3 text-[11px] leading-relaxed text-fg-subtle">
          <AlertCircle size={14} className="mt-px shrink-0" aria-hidden />
          On shared workstations, sign out when you finish — your session stays active on this device.
        </p>

        <Button
          type="submit"
          size="lg"
          block
          loading={login.isPending}
          trailingIcon={!login.isPending && <ArrowRight size={18} />}
        >
          {login.isPending ? 'Verifying credentials…' : 'Sign in'}
        </Button>
      </form>

      {/* Password resets are an administrator-driven process in this deployment —
          there is no self-service reset endpoint, so say so plainly. */}
      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset your password"
        description="Credential recovery is handled by your workspace administrator."
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setResetOpen(false)} data-autofocus>
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-sm leading-relaxed text-fg-muted">
          <p>
            {ORG_NAME} does not offer self-service password resets for clinical accounts. Contact
            your IT service desk or platform administrator, who can verify your identity and issue
            new credentials.
          </p>
          <Alert tone="clinical" title="Have this ready">
            Your work email, department and employee identifier — the service desk needs all three to
            confirm a clinical account.
          </Alert>
        </div>
      </Dialog>
    </AuthLayout>
  );
}
