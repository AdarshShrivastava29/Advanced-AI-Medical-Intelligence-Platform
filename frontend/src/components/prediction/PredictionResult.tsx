import { motion } from 'framer-motion';
import {
  Activity,
  Brain,
  CheckCircle2,
  Clock,
  Cpu,
  FileText,
  Gauge,
  ScanEye,
  Share2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

import { GradCamViewer } from '@/components/prediction/GradCamViewer';
import { ProbabilityBreakdown } from '@/components/prediction/ProbabilityBreakdown';
import { ReportView } from '@/components/prediction/ReportView';
import { Alert } from '@/components/ui/Alert';
import { Badge, RiskBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { RadialGauge } from '@/components/ui/Progress';
import { shareResult } from '@/lib/download';
import { cn, formatDate, percent } from '@/lib/utils';
import { useToast } from '@/store/toastStore';
import type { PredictionResponse, RiskLevel } from '@/types/api';

interface PredictionResultProps {
  prediction: PredictionResponse;
  onRegenerateReport?: () => void;
  regenerating?: boolean;
}

/**
 * Derive a display risk level when no report exists. The report's own
 * `risk_level` always wins when present — this is only a UI fallback.
 */
function fallbackRisk(prediction: PredictionResponse): RiskLevel {
  const isPneumonia = prediction.predicted_class.toUpperCase() === 'PNEUMONIA';
  if (!isPneumonia) return 'low';
  return prediction.confidence >= 0.85 ? 'high' : 'moderate';
}

/** Full study result: verdict, confidence, explainability and clinical report. */
export function PredictionResult({
  prediction,
  onRegenerateReport,
  regenerating,
}: PredictionResultProps) {
  const toast = useToast();
  const isPneumonia = prediction.predicted_class.toUpperCase() === 'PNEUMONIA';
  const risk = prediction.report?.risk_level ?? fallbackRisk(prediction);
  const gaugeTone = isPneumonia ? 'red' : 'green';

  const metadata = [
    { Icon: Cpu, label: 'Model', value: prediction.model_arch },
    { Icon: Brain, label: 'Version', value: prediction.model_version },
    { Icon: Clock, label: 'Analysed', value: formatDate(prediction.created_at) },
    { Icon: FileText, label: 'Study ID', value: prediction.id.slice(0, 12).toUpperCase() },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      {/* ---------------- Verdict banner ---------------- */}
      <Card padding="none" className="overflow-hidden">
        <div
          className={cn(
            'h-1',
            isPneumonia ? 'bg-gradient-to-r from-danger-500 to-danger-600' : 'bg-gradient-to-r from-success-500 to-success-600',
          )}
          aria-hidden
        />

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          {/* Confidence gauge */}
          <div className="flex justify-center lg:justify-start">
            <RadialGauge value={prediction.confidence} tone={gaugeTone} size={132} thickness={9}>
              <div>
                <p className="font-display text-2xl font-bold leading-none text-fg nums">
                  {percent(prediction.confidence, 0)}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                  Confidence
                </p>
              </div>
            </RadialGauge>
          </div>

          {/* Verdict */}
          <div className="min-w-0 text-center lg:text-left">
            <p className="medical-label">Classification result</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <span
                className={cn(
                  'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
                  isPneumonia
                    ? 'bg-danger-500/12 text-danger-600 dark:text-danger-400'
                    : 'bg-success-500/12 text-success-600 dark:text-success-400',
                )}
                aria-hidden
              >
                {isPneumonia ? <Activity size={20} /> : <CheckCircle2 size={20} />}
              </span>
              <h2 className="font-display text-display-sm font-bold text-fg">
                {prediction.predicted_class}
              </h2>
              <RiskBadge level={risk} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">
              {isPneumonia
                ? 'Findings consistent with pneumonia were localised in this study. Correlate clinically and confirm against the activation map below.'
                : 'No pneumonia pattern was detected in this study. Review the activation map to confirm the model attended to lung fields.'}
            </p>

            <dl className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-3 lg:justify-start">
              {metadata.map((entry) => (
                <div key={entry.label} className="flex items-center gap-2 text-xs">
                  <entry.Icon size={14} className="shrink-0 text-fg-subtle" aria-hidden />
                  <dt className="text-fg-subtle">{entry.label}:</dt>
                  <dd className="font-medium text-fg">{entry.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Actions */}
          <div className="flex flex-row justify-center gap-2 lg:flex-col">
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Share2 size={14} />}
              onClick={async () => {
                const result = await shareResult(
                  'AIMIP study result',
                  `${prediction.predicted_class} (${percent(prediction.confidence)})`,
                );
                if (result === 'copied') toast.success('Link copied to clipboard');
                else if (result === 'shared') toast.success('Shared');
                else toast.error('Sharing was cancelled');
              }}
            >
              Share
            </Button>
            <Badge tone={prediction.ood_flag ? 'amber' : 'green'} size="sm" className="justify-center">
              {prediction.ood_flag ? (
                <>
                  <ShieldAlert size={12} aria-hidden /> In review
                </>
              ) : (
                <>
                  <ShieldCheck size={12} aria-hidden /> In distribution
                </>
              )}
            </Badge>
          </div>
        </div>

        {prediction.ood_flag && (
          <div className="border-t border-line px-6 pb-6 sm:px-8">
            <Alert
              tone="warning"
              title="Out-of-distribution study"
              className="mt-6"
            >
              This image sits outside the model&apos;s training distribution — it may not be a standard
              frontal chest radiograph. Treat the classification and confidence above as unreliable
              until a clinician has reviewed the source image.
            </Alert>
          </div>
        )}
      </Card>

      {/* ---------------- Explainability + probabilities ---------------- */}
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            eyebrow="Explainability"
            title="Grad-CAM localisation"
            subtitle="Where the model looked when it made this call"
            icon={<ScanEye size={18} />}
            divided
          />
          <GradCamViewer gradcam={prediction.gradcam} predictionId={prediction.id} />
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader
              eyebrow="Model output"
              title="Class probabilities"
              subtitle="Softmax distribution across classes"
              icon={<Gauge size={18} />}
              divided
            />
            <ProbabilityBreakdown
              probabilities={prediction.probabilities}
              predictedClass={prediction.predicted_class}
            />

            <div className="mt-6 rounded-xl bg-surface-muted p-4">
              <p className="medical-label mb-2">How to read this</p>
              <p className="text-xs leading-relaxed text-fg-muted">
                Probabilities are the model&apos;s calibrated belief across classes, not a diagnosis.
                A narrow margin between classes indicates a borderline study that warrants closer
                review.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Governance" title="Review checklist" icon={<ShieldCheck size={18} />} divided />
            <ul className="space-y-3 text-sm">
              {[
                'Confirm the activation map covers lung fields, not artefacts or annotations.',
                'Correlate the finding with presentation, history and prior imaging.',
                'Record your assessment in the reporting system of record.',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-700 dark:bg-accent-400"
                    aria-hidden
                  />
                  <span className="leading-relaxed text-fg-muted">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* ---------------- Clinical report ---------------- */}
      {prediction.report ? (
        <Card>
          <CardHeader
            eyebrow="Clinical documentation"
            title="AI-drafted report"
            subtitle="Grounded in your indexed medical literature"
            icon={<FileText size={18} />}
            divided
            className="no-print"
          />
          <ReportView
            report={prediction.report}
            onRegenerate={onRegenerateReport}
            regenerating={regenerating}
            studyId={prediction.id}
            modelLabel={`${prediction.model_arch} · ${prediction.model_version}`}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader
            eyebrow="Clinical documentation"
            title="Report unavailable"
            subtitle="No narrative report was generated for this study"
            icon={<FileText size={18} />}
            divided
          />
          <Alert tone="clinical">
            The classification and Grad-CAM output above are complete. A narrative report was not
            produced — this usually means the reporting provider was unavailable at analysis time.
            {onRegenerateReport && ' You can generate one now.'}
          </Alert>
          {onRegenerateReport && (
            <div className="mt-4">
              <Button size="sm" onClick={onRegenerateReport} loading={regenerating}>
                Generate report
              </Button>
            </div>
          )}
        </Card>
      )}
    </motion.div>
  );
}
