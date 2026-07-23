import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { Lock, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin } from '@/hooks/useAuth';
import type { ProblemDetail } from '@/types/api';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      navigate('/dashboard');
    } catch (err) {
      const detail = (err as AxiosError<ProblemDetail>).response?.data?.detail;
      setError('password', { message: detail ?? 'Invalid email or password.' });
    }
  });

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your AIMIP workspace">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          icon={<Mail size={16} />}
          placeholder="you@hospital.org"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          icon={<Lock size={16} />}
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
