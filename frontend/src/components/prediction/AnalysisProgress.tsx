import { motion } from 'framer-motion';
import { Check, FileText, ScanEye, Server, UploadCloud, type LucideIcon } from 'lucide-react';

import { ProgressBar } from '@/components/ui/Progress';
import { ClinicalLoader } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';

interface Stage {
  id: string;
  label: string;
  detail: string;
  Icon: LucideIcon;
}

const STAGES: Stage[] = [
  { id: 'upload', label: 'Transferring study', detail: 'Encrypted upload to the inference service', Icon: UploadCloud },
  { id: 'inference', label: 'Running inference', detail: 'Classifying the radiograph', Icon: Server },
  { id: 'gradcam', label: 'Computing Grad-CAM', detail: 'Localising the activation regions', Icon: ScanEye },
  { id: 'report', label: 'Drafting report', detail: 'Grounding findings in your literature', Icon: FileText },
];

/**
 * Pipeline view for an in-flight analysis. Upload progress is real (reported by
 * Axios); the later stages are shown as sequential-but-indeterminate because the
 * backend returns a single response rather than per-stage events.
 */
export function AnalysisProgress({ uploadProgress }: { uploadProgress: number }) {
  const uploading = uploadProgress < 100;
  // Once the upload completes, the server is working through the remaining
  // stages — mark the first as active rather than claiming per-stage timing.
  const activeIndex = uploading ? 0 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-line bg-surface-muted p-6 sm:p-6"
    >
      <div className="flex items-center gap-4">
        <ClinicalLoader size={48} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-fg">
            {uploading ? 'Transferring study…' : 'Analysing radiograph…'}
          </p>
          <p className="mt-0.5 text-sm text-fg-muted">
            {uploading
              ? `${uploadProgress}% uploaded — keep this tab open.`
              : 'Inference, explainability and report generation are running.'}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ProgressBar
          value={uploadProgress}
          indeterminate={!uploading}
          size="sm"
          label="Analysis progress"
        />
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {STAGES.map((stage, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li
              key={stage.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 transition-colors duration-300',
                active
                  ? 'border-brand-600/30 bg-brand-600/[0.06] dark:border-accent-400/30 dark:bg-accent-400/[0.07]'
                  : 'border-line bg-surface',
              )}
            >
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                  done
                    ? 'bg-success-500/12 text-success-600 dark:text-success-400'
                    : active
                      ? 'bg-brand-600/12 text-brand-700 dark:bg-accent-400/12 dark:text-accent-300'
                      : 'bg-surface-sunken text-fg-subtle',
                )}
                aria-hidden
              >
                {done ? <Check size={16} /> : <stage.Icon size={16} className={active ? 'animate-pulse' : ''} />}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'truncate text-sm font-medium',
                    active || done ? 'text-fg' : 'text-fg-subtle',
                  )}
                >
                  {stage.label}
                </p>
                <p className="truncate text-[11px] text-fg-subtle">{stage.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
}
