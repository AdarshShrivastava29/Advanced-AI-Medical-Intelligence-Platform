import { motion } from 'framer-motion';
import { ArrowUpRight, MessagesSquare, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Button } from '@/components/ui/Button';
import { EcgLine } from '@/components/visuals/EcgLine';
import { NeuralNetwork } from '@/components/visuals/NeuralNetwork';
import { ThoraxArt } from '@/components/visuals/ThoraxArt';
import { ORG_NAME, ORG_UNIT } from '@/lib/platform';
import { cn } from '@/lib/utils';

export interface HeroMetric {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  /** Rendered instead of the counter when the value is not numeric. */
  display?: string;
  tone?: 'default' | 'positive' | 'warning';
}

interface DashboardHeroProps {
  greeting: string;
  subtitle: string;
  metrics: HeroMetric[];
  loading?: boolean;
}

const toneText = {
  default: 'text-white',
  positive: 'text-success-500',
  warning: 'text-warning-500',
} as const;

/**
 * Executive banner for the dashboard: who is signed in, where, what happened
 * today, and the two actions a clinician reaches for first.
 */
export function DashboardHero({ greeting, subtitle, metrics, loading = false }: DashboardHeroProps) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="clinical-hero rounded-panel elevation-4"
    >
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-accent-400/10 blur-3xl" />
        <NeuralNetwork className="absolute right-4 top-2 hidden h-44 w-72 text-accent-300/50 xl:block" />
        <div className="absolute inset-x-0 bottom-0 h-20 text-accent-300/30">
          <EcgLine cycles={9} duration={7} strokeWidth={1.4} />
        </div>
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(80% 70% at 20% 0%, #000 10%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(80% 70% at 20% 0%, #000 10%, transparent 100%)',
          }}
        />
      </div>

      <div className="relative p-6 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            <p className="text-label font-semibold uppercase text-accent-300">
              {ORG_NAME} · {ORG_UNIT}
            </p>
            <h1 className="mt-3 font-display text-display-sm font-bold text-white sm:text-display-md">
              {greeting}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/75">{subtitle}</p>
            <p className="mt-1 text-xs text-white/75">{today}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/predict">
              <Button size="lg" className="bg-white text-brand-800 shadow-md hover:bg-white/90 active:bg-white/80">
                <ScanLine size={18} aria-hidden /> New prediction
              </Button>
            </Link>
            <Link to="/assistant">
              <Button
                size="lg"
                variant="secondary"
                className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/[0.18] active:bg-white/25"
              >
                <MessagesSquare size={18} aria-hidden /> Ask assistant
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-white/12 pt-6 sm:gap-x-10 lg:flex lg:flex-wrap lg:items-end">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 lg:min-w-[9rem]">
              <p className="truncate text-[11px] font-medium uppercase tracking-wider text-white/75">
                {metric.label}
              </p>
              <p
                className={cn(
                  'mt-2 font-display text-2xl font-bold leading-none sm:text-[1.75rem]',
                  toneText[metric.tone ?? 'default'],
                )}
              >
                {loading ? (
                  <span className="inline-block h-6 w-16 animate-pulse rounded bg-white/15" />
                ) : metric.display !== undefined ? (
                  metric.display
                ) : (
                  <AnimatedCounter
                    value={metric.value}
                    decimals={metric.decimals}
                    suffix={metric.suffix}
                  />
                )}
              </p>
            </div>
          ))}

          <Link
            to="/analytics"
            className="ml-auto hidden items-center gap-2 self-end text-sm font-medium text-accent-300 transition hover:text-white lg:inline-flex"
          >
            Full analytics <ArrowUpRight size={16} aria-hidden />
          </Link>
        </div>
      </div>

      {/* Anatomy motif, large screens only */}
      <div
        className="pointer-events-none absolute -bottom-6 right-8 hidden h-52 w-52 text-white/12 2xl:block"
        aria-hidden
      >
        <ThoraxArt scan={false} />
      </div>
    </motion.section>
  );
}
