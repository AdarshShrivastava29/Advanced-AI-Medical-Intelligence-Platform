import { motion } from 'framer-motion';
import { Activity, ShieldAlert, Share2 } from 'lucide-react';

import { GradCamViewer } from '@/components/prediction/GradCamViewer';
import { ProbabilityBreakdown } from '@/components/prediction/ProbabilityBreakdown';
import { ReportView } from '@/components/prediction/ReportView';
import { ClassBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter';
import { shareResult } from '@/lib/download';
import { percent } from '@/lib/utils';
import { useToast } from '@/store/toastStore';
import type { PredictionResponse } from '@/types/api';

interface PredictionResultProps {
  prediction: PredictionResponse;
  onRegenerateReport?: () => void;
  regenerating?: boolean;
}

/** Full prediction result: verdict, explainability, probabilities and report. */
export function PredictionResult({ prediction, onRegenerateReport, regenerating }: PredictionResultProps) {
  const toast = useToast();
  const isPneumonia = prediction.predicted_class.toUpperCase() === 'PNEUMONIA';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className={`grid h-14 w-14 place-items-center rounded-2xl ${isPneumonia ? 'bg-risk-high/10 text-risk-high' : 'bg-risk-low/10 text-risk-low'}`}>
              <Activity size={26} aria-hidden />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{prediction.predicted_class}</h2>
                <ClassBadge label={prediction.predicted_class} />
              </div>
              <p className="text-sm text-slate-500">
                Confidence {percent(prediction.confidence)} · {prediction.model_arch}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const result = await shareResult('AIMIP Prediction', `${prediction.predicted_class} (${percent(prediction.confidence)})`);
              if (result === 'copied') toast.success('Link copied to clipboard');
              else if (result === 'shared') toast.success('Shared');
            }}
          >
            <Share2 size={14} /> Share
          </Button>
        </div>

        {prediction.ood_flag && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-risk-moderate/10 p-3 text-sm text-risk-moderate">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              This image was flagged as possibly out-of-distribution (it may not be a standard chest
              X-ray). Interpret the result with extra caution.
            </span>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Explainability" subtitle="Grad-CAM localisation" />
          <GradCamViewer gradcam={prediction.gradcam} predictionId={prediction.id} />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Probability breakdown" subtitle="Softmax over classes" />
          <ProbabilityBreakdown probabilities={prediction.probabilities} predictedClass={prediction.predicted_class} />
          <div className="mt-6 border-t border-slate-200/60 pt-4 dark:border-white/10">
            <ConfidenceMeter label="Overall confidence" value={prediction.confidence} tone={isPneumonia ? 'red' : 'green'} />
          </div>
        </Card>
      </div>

      {prediction.report && (
        <Card>
          <CardHeader title="AI medical report" subtitle="Generated via the LLM provider abstraction" />
          <ReportView report={prediction.report} onRegenerate={onRegenerateReport} regenerating={regenerating} />
        </Card>
      )}
    </motion.div>
  );
}
