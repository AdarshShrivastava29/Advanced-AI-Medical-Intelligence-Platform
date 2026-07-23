import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { Lock, Mail, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin, useRegister } from '@/hooks/useAuth';
import { useToast } from '@/store/toastStore';
import type { ProblemDetail } from '@/types/api';

const schema = z.object({
  full_name: z.string().min(1, 'Your name is required').max(120),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const registerUser = useRegister();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerUser.mutateAsync(values);
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
    <AuthLayout title="Create your account" subtitle="Start analysing chest X-rays in minutes">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Input
          label="Full name"
          icon={<User size={16} />}
          placeholder="Dr. Jane Doe"
          error={errors.full_name?.message}
          {...register('full_name')}
        />
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
          autoComplete="new-password"
          icon={<Lock size={16} />}
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
