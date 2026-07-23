import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

import { Brand } from '@/components/layout/Brand';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Split-screen layout for the login/register pages. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="app-gradient grid min-h-screen lg:grid-cols-2">
      {/* Marketing panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-teal-600" />
        <div className="absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link to="/" className="w-fit">
            <span className="text-lg font-semibold">AIMIP</span>
          </Link>
          <div className="max-w-md">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-bold leading-tight"
            >
              Explainable AI for chest X-ray intelligence.
            </motion.h2>
            <p className="mt-4 text-white/80">
              Upload a scan, get an instant classification with Grad-CAM explainability and a
              provider-driven medical report — all clinical decision-support, reviewed by you.
            </p>
          </div>
          <p className="text-xs text-white/60">Not a medical device. For decision-support only.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <Brand />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
