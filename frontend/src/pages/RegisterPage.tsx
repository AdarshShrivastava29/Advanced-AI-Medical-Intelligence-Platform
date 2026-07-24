import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { useLogin, useRegister } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useToast } from '@/store/toastStore';
import type { ProblemDetail } from '@/types/api';

const schema = z.object({
  full_name: z.string().min(1, 'Your name is required').max(120),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  terms: z.literal(true, {
    errorMap: () => ({ message: 'Please accept the clinical-use terms to continue' }),
  }),
});
type FormValues = z.infer<typeof schema>;

const STEPS = ['Identity', 'Credentials', 'Confirm'];

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const registerUser = useRegister();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const fullName = watch('full_name') ?? '';
  const email = watch('email') ?? '';
  const password = watch('password') ?? '';
  const terms = watch('terms');

  // Progress reflects how much of the single-screen form is genuinely complete.
  const completed = [Boolean(fullName && email), password.length >= 8, Boolean(terms)];
  const activeStep = completed.findIndex((done) => !done);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerUser.mutateAsync({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
      });
      await login.mutateAsync({ email: values.email, password: values.password });
      toast.success('Account created');
      navigate('/dashboard');
    } catch (err) {
      const detail = (err as AxiosError<ProblemDetail>).response?.data?.detail;
      setError('email', { message: detail ?? 'Registration failed.' });
    }
  });

  const busy = registerUser.isPending || login.isPending;

  return (
    <AuthLayout
      title="Request access"
      subtitle="Create your Medical Intelligence Platform account"
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-accent-400"
          >
            Sign in
          </Link>
        </>
      }
    >
      {/* Onboarding progress */}
      <ol className="mb-6 flex items-center gap-2" aria-label="Registration progress">
        {STEPS.map((step, index) => {
          const done = completed[index];
          const active = index === activeStep;
          return (
            <li key={step} className="flex flex-1 flex-col gap-2">
              <span
                className={cn(
                  'h-1 rounded-full transition-colors duration-300',
                  done ? 'bg-brand-700 dark:bg-accent-400' : active ? 'bg-brand-300' : 'bg-line',
                )}
              />
              <span
                className={cn(
                  'text-[11px] font-medium transition-colors',
                  done || active ? 'text-fg' : 'text-fg-subtle',
                )}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          autoComplete="name"
          icon={<User size={16} />}
          placeholder="Dr. Jane Doe"
          error={errors.full_name?.message}
          {...register('full_name')}
        />
        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          icon={<Mail size={16} />}
          placeholder="you@hospital.org"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="space-y-3">
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            icon={<Lock size={16} />}
            placeholder="Create a strong password"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrength value={password} />
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-sunken px-3 py-3 text-[12px] leading-relaxed text-fg-muted">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong bg-surface accent-brand-700 dark:accent-accent-400"
              aria-invalid={Boolean(errors.terms)}
              {...register('terms')}
            />
            <span>
              I understand AIMIP provides clinical decision-support only, is not a medical device,
              and that every output requires review by a qualified clinician before use.
            </span>
          </label>
          {errors.terms && (
            <p className="mt-2 text-xs font-medium text-danger-600 dark:text-danger-400">{errors.terms.message}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          block
          loading={busy}
          trailingIcon={!busy && <ArrowRight size={18} />}
        >
          {busy ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
