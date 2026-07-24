import { motion } from 'framer-motion';
import { Activity, Gauge, ShieldAlert, TrendingUp, type LucideIcon } from 'lucide-react';

import { cn, percent } from '@/lib/utils';
import type { AnalyticsSummary } from '@/types/api';

type InsightTone = 'brand' | 'green' | 'amber';

interface Insight {
  id: string;
  Icon: LucideIcon;
  tone: InsightTone;
  title: string;
  body: string;
}

const toneClasses: Record<InsightTone, string> = {
  brand: 'bg-brand-600/10 text-brand-700 dark:bg-accent-400/10 dark:text-accent-300',
  green: 'bg-success-500/10 text-success-600 dark:text-success-500',
  amber: 'bg-warning-500/10 text-warning-600 dark:text-warning-500',
};

/**
 * Derives plain-language observations from the analytics payload. Every line is
 * computed from data already on screen — nothing is inferred or invented.
 */
function buildInsights(summary: AnalyticsSummary | undefined, days: number): Insight[] {
  if (!summary) return [];
  const { overview, trends } = summary;
  const insights: Insight[] = [];

  if (overview.total_predictions === 0) return insights;

  const pneumoniaRate = overview.pneumonia_count / overview.total_predictions;
  insights.push({
    id: 'rate',
    Icon: Activity,
    tone: pneumoniaRate >= 0.5 ? 'amber' : 'brand',
    title: `${percent(pneumoniaRate, 0)} of studies flagged pneumonia`,
    body: `${overview.pneumonia_count} of ${overview.total_predictions} analysed scans returned a pneumonia classification.`,
  });

  insights.push({
    id: 'confidence',
    Icon: Gauge,
    tone: overview.average_confidence >= 0.85 ? 'green' : 'amber',
    title: `Mean confidence ${percent(overview.average_confidence, 1)}`,
    body:
      overview.average_confidence >= 0.85
        ? 'The model is decisive across this cohort — few borderline cases.'
        : 'A softer average suggests more borderline studies; prioritise manual review.',
  });

  const busiest = trends.reduce<{ date: string; count: number } | null>(
    (peak, point) => (!peak || point.count > peak.count ? point : peak),
    null,
  );
  if (busiest && busiest.count > 0) {
    insights.push({
      id: 'peak',
      Icon: TrendingUp,
      tone: 'brand',
      title: `Peak volume: ${busiest.count} scan${busiest.count === 1 ? '' : 's'}`,
      body: `Busiest day in the last ${days} days was ${new Date(busiest.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}.`,
    });
  }

  if (overview.ood_count > 0) {
    insights.push({
      id: 'ood',
      Icon: ShieldAlert,
      tone: 'amber',
      title: `${overview.ood_count} out-of-distribution upload${overview.ood_count === 1 ? '' : 's'}`,
      body: 'These fell outside the training distribution — treat their predictions as unreliable until reviewed.',
    });
  }

  return insights;
}

interface InsightsPanelProps {
  summary: AnalyticsSummary | undefined;
  days: number;
}

/** AI observations panel derived from the current analytics window. */
export function InsightsPanel({ summary, days }: InsightsPanelProps) {
  const insights = buildInsights(summary, days);

  if (insights.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-fg-muted">
        Observations appear once you have analysed your first scan.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {insights.map((insight, index) => (
        <motion.li
          key={insight.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="flex gap-3 rounded-xl border border-line bg-surface-muted p-3.5"
        >
          <span
            className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', toneClasses[insight.tone])}
            aria-hidden
          >
            <insight.Icon size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug text-fg">{insight.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">{insight.body}</p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
