import { motion } from 'framer-motion';
import { Activity, Brain, Lock, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Brand, BrandMark } from '@/components/layout/Brand';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { EcgLine } from '@/components/visuals/EcgLine';
import { NeuralNetwork } from '@/components/visuals/NeuralNetwork';
import { ParticleField } from '@/components/visuals/ParticleField';
import { ThoraxArt } from '@/components/visuals/ThoraxArt';
import { APP_VERSION, CLINICAL_DISCLAIMER, ORG_NAME } from '@/lib/platform';

const CAPABILITIES = [
  {
    Icon: Brain,
    title: 'Explainable classification',
    body: 'Grad-CAM localisation shows which region drove every prediction.',
  },
  {
    Icon: Activity,
    title: 'Grounded reporting',
    body: 'Structured findings drafted only from your own indexed literature.',
  },
  {
    Icon: ShieldCheck,
    title: 'Governed by design',
    body: 'Out-of-distribution detection and clinician-in-the-loop review.',
  },
];

/**
 * Entrance choreography. One shared curve and one shared distance across the
 * whole screen — the hero copy leads, the capability cards follow, and the
 * credential card settles on a spring so it feels placed rather than dropped.
 */
const EASE = [0.22, 1, 0.36, 1] as const;

const RISE = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const SCALE_IN = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASE } },
};

const HERO_GROUP = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const CARD_GROUP = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.28 } },
};

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Rendered under the card, above the legal footer (e.g. "Create one"). */
  footer?: ReactNode;
}

/**
 * Split-screen authentication shell: a deep-navy clinical hero on the left
 * (55%) and the floating credential card on the right (45%). The hero collapses
 * entirely below `lg` so small screens get a focused, single-column form.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[55fr_45fr]">
      {/* ---------------- Hero panel ---------------- */}
      <aside className="clinical-hero hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        {/* Atmosphere layers */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-24 top-8 h-[26rem] w-[26rem] rounded-full bg-accent-400/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-clinical-400/10 blur-3xl" />
          <ParticleField className="absolute inset-0 text-white" />
          <NeuralNetwork className="absolute -right-10 top-24 h-72 w-[26rem] text-accent-300/70" />
          <div className="absolute inset-x-0 bottom-0 h-40 text-accent-300/40">
            <EcgLine cycles={7} duration={6} strokeWidth={1.6} />
          </div>
          {/* Fine diagnostic grid, masked to a soft vignette */}
          <div
            className="absolute inset-0 opacity-[0.10]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(70% 60% at 40% 40%, #000 20%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(70% 60% at 40% 40%, #000 20%, transparent 100%)',
            }}
          />
        </div>

        <div className="relative flex items-center justify-between">
          <Link to="/" className="w-fit rounded-xl" aria-label="AIMIP home">
            <Brand inverted tagline={ORG_NAME} />
          </Link>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80">
            Clinical decision-support
          </span>
        </div>

        <motion.div
          variants={HERO_GROUP}
          initial="hidden"
          animate="visible"
          className="relative grid grid-cols-[1fr_auto] items-center gap-8 py-10"
        >
          <div className="max-w-xl">
            <motion.h2
              variants={RISE}
              className="font-display text-display-md font-bold leading-tight text-white xl:text-display-lg"
            >
              Medical intelligence
              <span className="block text-accent-300">radiologists can defend.</span>
            </motion.h2>
            <motion.p
              variants={RISE}
              className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-white/75"
            >
              Chest X-ray classification with visual explainability, provider-independent reporting
              and a review trail your department can stand behind.
            </motion.p>
          </div>

          <motion.div
            variants={SCALE_IN}
            className="hidden h-56 w-56 shrink-0 text-accent-300/80 xl:block"
          >
            <ThoraxArt />
          </motion.div>
        </motion.div>

        <motion.ul
          variants={CARD_GROUP}
          initial="hidden"
          animate="visible"
          className="relative grid gap-4 sm:grid-cols-3"
        >
          {CAPABILITIES.map((capability) => (
            <motion.li
              key={capability.title}
              variants={RISE}
              className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm"
            >
              <capability.Icon size={18} className="text-accent-300" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-white">{capability.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">{capability.body}</p>
            </motion.li>
          ))}
        </motion.ul>
      </aside>

      {/* ---------------- Credential panel ---------------- */}
      <main className="relative flex min-h-screen flex-col px-6 py-6 sm:px-8 lg:px-10">
        {/* Mobile atmosphere so the form never sits on a blank page. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 lg:hidden" aria-hidden>
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute -left-10 top-10 h-48 w-48 rounded-full bg-clinical-500/10 blur-3xl" />
        </div>

        <div className="relative flex items-center justify-between">
          <div className="lg:hidden">
            <Brand tagline={ORG_NAME} />
          </div>
          <div className="hidden lg:block" aria-hidden />
          <ThemeToggle />
        </div>

        <div className="relative flex flex-1 items-center justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26, mass: 0.9, delay: 0.06 }}
            className="w-full max-w-[26rem]"
          >
            <div className="rounded-[28px] border border-line bg-surface p-8 elevation-4 sm:p-8">
              <div className="flex flex-col items-start">
                <BrandMark size="lg" />
                <h1 className="mt-6 font-display text-[1.75rem] font-bold leading-tight text-fg">
                  {title}
                </h1>
                <p className="mt-2 text-sm text-fg-muted">{subtitle}</p>
              </div>

              <div className="mt-8">{children}</div>

              <div className="mt-8 border-t border-line pt-6">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-medium text-fg-subtle">
                  <span className="inline-flex items-center gap-2">
                    <Lock size={12} aria-hidden /> TLS 1.3 encrypted
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck size={12} aria-hidden /> HIPAA-aligned controls
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Activity size={12} aria-hidden /> Audit logged
                  </span>
                </div>
              </div>
            </div>

            {footer && <div className="mt-6 text-center text-sm text-fg-muted">{footer}</div>}
          </motion.div>
        </div>

        <footer className="relative space-y-2 text-center">
          <p className="mx-auto max-w-md text-[11px] leading-relaxed text-fg-subtle">
            {CLINICAL_DISCLAIMER}
          </p>
          <p className="text-[11px] text-fg-subtle">
            © {new Date().getFullYear()} {ORG_NAME} · AIMIP v{APP_VERSION}
          </p>
        </footer>
      </main>
    </div>
  );
}
