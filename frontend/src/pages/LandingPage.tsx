import { motion } from 'framer-motion';
import { ArrowRight, Brain, FileText, ScanLine, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/store/authStore';

const FEATURES = [
  { icon: <ScanLine size={22} />, title: 'Chest X-ray classification', body: 'DenseNet/EfficientNet transfer-learning with calibrated confidence and probabilities.' },
  { icon: <Brain size={22} />, title: 'Explainable AI', body: 'Grad-CAM heatmaps and overlays show exactly where the model is looking.' },
  { icon: <FileText size={22} />, title: 'AI medical reports', body: 'Structured, provider-driven Markdown reports you can review, copy and export.' },
  { icon: <ShieldCheck size={22} />, title: 'Safety-first', body: 'Out-of-distribution detection and a clear decision-support disclaimer throughout.' },
];

export function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const primaryHref = isAuthenticated ? '/dashboard' : '/register';

  return (
    <div className="app-gradient min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to={primaryHref}>
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl overflow-hidden px-6 pb-20 pt-16 text-center">
        <div className="absolute left-1/2 top-0 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-400/20 blur-3xl" />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-sm text-brand-600 dark:text-brand-300">
            <Sparkles size={14} /> Advanced AI Medical Intelligence
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Explainable chest X-ray intelligence,{' '}
            <span className="bg-gradient-to-r from-brand-500 to-teal-500 bg-clip-text text-transparent">
              from upload to report
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-500">
            AIMIP classifies chest X-rays, explains its reasoning with Grad-CAM, and drafts a
            professional medical report — clinical decision-support, always reviewed by you.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to={primaryHref}>
              <Button size="lg">
                Start a prediction <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">Sign in</Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className="glass-card p-6"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-500">
              {feature.icon}
            </span>
            <h3 className="mt-4 font-semibold">{feature.title}</h3>
            <p className="mt-1.5 text-sm text-slate-500">{feature.body}</p>
          </motion.div>
        ))}
      </section>

      <footer className="border-t border-white/40 py-8 text-center text-sm text-slate-500 dark:border-white/10">
        <p>AIMIP is a clinical decision-support tool and is not a medical device.</p>
      </footer>
    </div>
  );
}
