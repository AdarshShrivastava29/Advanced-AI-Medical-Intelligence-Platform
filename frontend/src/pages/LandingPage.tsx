import { motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Database,
  FileText,
  Gauge,
  ScanLine,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { EcgLine } from '@/components/visuals/EcgLine';
import { NeuralNetwork } from '@/components/visuals/NeuralNetwork';
import { ParticleField } from '@/components/visuals/ParticleField';
import { ThoraxArt } from '@/components/visuals/ThoraxArt';
import { CLINICAL_DISCLAIMER, ORG_NAME } from '@/lib/platform';
import { useAuthStore } from '@/store/authStore';

const CAPABILITIES: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: ScanLine,
    title: 'Chest radiograph classification',
    body: 'Transfer-learned convolutional models return a predicted class with a calibrated probability distribution.',
  },
  {
    Icon: Brain,
    title: 'Visual explainability',
    body: 'Grad-CAM localisation shows precisely which region drove the decision — reviewable, not a black box.',
  },
  {
    Icon: FileText,
    title: 'Structured clinical reporting',
    body: 'Findings, assessment and recommendations drafted as a print-ready hospital document.',
  },
  {
    Icon: Database,
    title: 'Grounded knowledge assistant',
    body: 'Answers retrieved from your own indexed literature, returned with page-level citations.',
  },
  {
    Icon: ShieldCheck,
    title: 'Out-of-distribution guarding',
    body: 'Studies unlike the training data are flagged so an unreliable prediction is never mistaken for a confident one.',
  },
  {
    Icon: Gauge,
    title: 'Departmental analytics',
    body: 'Throughput, case mix and confidence distribution across every study your team has analysed.',
  },
];

const WORKFLOW = [
  ['01', 'Load the study', 'Drop a frontal chest radiograph from your workstation.'],
  ['02', 'Model inference', 'Classification and probabilities returned in seconds.'],
  ['03', 'Explain & report', 'Grad-CAM overlay plus a structured report for clinician sign-off.'],
];

export function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const primaryHref = isAuthenticated ? '/dashboard' : '/register';

  return (
    <div className="app-gradient min-h-screen">
      {/* ---------------- Header ---------------- */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Brand tagline={ORG_NAME} />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to={primaryHref}>
            <Button size="sm">{isAuthenticated ? 'Open workspace' : 'Request access'}</Button>
          </Link>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-6">
        <div className="clinical-hero rounded-panel px-6 py-14 elevation-4 sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -right-24 -top-20 h-96 w-96 rounded-full bg-accent-400/12 blur-3xl" />
            <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-clinical-400/10 blur-3xl" />
            <ParticleField className="absolute inset-0 text-white" />
            <NeuralNetwork className="absolute -right-4 top-10 hidden h-72 w-[28rem] text-accent-300/45 lg:block" />
            <div className="absolute inset-x-0 bottom-0 h-28 text-accent-300/30">
              <EcgLine cycles={10} duration={7} strokeWidth={1.4} />
            </div>
            <div
              className="absolute inset-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
                maskImage: 'radial-gradient(70% 65% at 30% 25%, #000 10%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(70% 65% at 30% 25%, #000 10%, transparent 100%)',
              }}
            />
          </div>

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.35fr_1fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/85">
                <Sparkles size={14} aria-hidden /> AI Medical Intelligence Platform
              </span>

              <h1 className="mt-6 max-w-2xl font-display text-display-md font-bold leading-tight text-white sm:text-display-lg">
                Chest radiograph intelligence
                <span className="block text-accent-300">radiologists can defend.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75">
                AIMIP classifies chest X-rays, localises its reasoning with Grad-CAM, and drafts a
                structured clinical report grounded in your own literature — decision-support that
                shows its work, every time.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={primaryHref}>
                  <Button
                    size="lg"
                    className="bg-white text-brand-800 shadow-md hover:bg-white/90"
                    trailingIcon={<ArrowRight size={18} />}
                  >
                    {isAuthenticated ? 'Open your workspace' : 'Request access'}
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/[0.18]"
                  >
                    Sign in
                  </Button>
                </Link>
              </div>

              <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/12 pt-6">
                {[
                  ['Explainability', 'Grad-CAM on every study'],
                  ['Grounding', 'Citations, not hallucinations'],
                  ['Oversight', 'Clinician sign-off required'],
                ].map(([term, detail]) => (
                  <div key={term}>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-accent-300">
                      {term}
                    </dt>
                    <dd className="mt-1 text-sm text-white/75">{detail}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto hidden h-80 w-80 text-accent-300/75 lg:block"
            >
              <ThoraxArt />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- Capabilities ---------------- */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-10 max-w-2xl">
          <p className="medical-label">Platform capabilities</p>
          <h2 className="mt-3 font-display text-display-sm font-bold text-fg">
            Built for the reading room, not the demo reel.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Every output is traceable to an image region or a cited passage, and every study carries
            the guardrails a clinical deployment needs.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((capability, index) => (
            <motion.article
              key={capability.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.42, delay: (index % 3) * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="surface-card lift p-6"
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600/10 text-brand-700 ring-1 ring-inset ring-brand-600/15 dark:bg-accent-400/10 dark:text-accent-300 dark:ring-accent-400/20"
                aria-hidden
              >
                <capability.Icon size={20} />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold text-fg">{capability.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{capability.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ---------------- Workflow ---------------- */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="surface-card p-8 sm:p-10">
          <div className="max-w-2xl">
            <p className="medical-label">Clinical workflow</p>
            <h2 className="mt-3 font-display text-display-sm font-bold text-fg">
              Three steps, fully auditable.
            </h2>
          </div>

          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {WORKFLOW.map(([step, title, body]) => (
              <li key={step} className="relative">
                <span className="font-display text-4xl font-bold text-brand-600/20 dark:text-accent-400/25">
                  {step}
                </span>
                <h3 className="mt-2 font-display text-base font-semibold text-fg">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-8">
            <Link to={primaryHref}>
              <Button trailingIcon={<ArrowRight size={16} />}>
                {isAuthenticated ? 'Open your workspace' : 'Request access'}
              </Button>
            </Link>
            <p className="text-xs text-fg-subtle">Access is provisioned by your platform administrator.</p>
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <Brand tagline={ORG_NAME} />
          <p className="max-w-xl text-xs leading-relaxed text-fg-subtle">{CLINICAL_DISCLAIMER}</p>
        </div>
      </footer>
    </div>
  );
}
