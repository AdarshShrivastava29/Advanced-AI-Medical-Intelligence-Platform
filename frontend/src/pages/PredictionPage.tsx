import { AnimatePresence, motion } from 'framer-motion';
import { Brain, RotateCcw, ScanLine, ShieldCheck, Sparkles, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { AnalysisProgress } from '@/components/prediction/AnalysisProgress';
import { PredictionResult } from '@/components/prediction/PredictionResult';
import { UploadDropzone } from '@/components/prediction/UploadDropzone';
import { Alert } from '@/components/ui/Alert';
import { Badge, ClassBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { useRecentActivity } from '@/hooks/useAnalytics';
import { useActiveModel, useSystemStatus } from '@/hooks/usePlatform';
import { useCreatePrediction } from '@/hooks/usePredictions';
import { percent, timeAgo } from '@/lib/utils';
import { useToast } from '@/store/toastStore';

const PIPELINE = [
  {
    step: '01',
    title: 'Load the study',
    body: 'Drop a frontal chest radiograph. Format and size are validated before transfer.',
  },
  {
    step: '02',
    title: 'Model inference',
    body: 'The classifier returns a predicted class with a calibrated probability distribution.',
  },
  {
    step: '03',
    title: 'Explain & report',
    body: 'Grad-CAM localises the decision and a structured report is drafted for your review.',
  },
];

export function PredictionPage() {
  const toast = useToast();
  const { mutateAsync, data, isPending, uploadProgress, reset } = useCreatePrediction();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const recent = useRecentActivity(4);
  const model = useActiveModel();
  const status = useSystemStatus();

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const analyze = async () => {
    if (!file) return;
    try {
      await mutateAsync(file);
    } catch {
      toast.error('Analysis failed. Please try another image.');
    }
  };

  const startOver = () => {
    setFile(null);
    reset();
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Diagnostic workflow"
        title={data ? 'Study result' : 'New study analysis'}
        description={
          data
            ? 'Classification, explainability and the drafted clinical report for this radiograph.'
            : 'Upload a chest radiograph to run classification, Grad-CAM localisation and an AI-drafted report.'
        }
        meta={
          <>
            <Badge tone="brand" size="sm">
              <Brain size={12} aria-hidden /> {model.arch ?? 'Model idle'}
            </Badge>
            <Badge tone={status.state === 'operational' ? 'green' : 'amber'} size="sm" dot>
              {status.label}
            </Badge>
            <Badge tone="slate" size="sm">
              <ShieldCheck size={12} aria-hidden /> Decision-support only
            </Badge>
          </>
        }
        action={
          data && (
            <Button variant="secondary" onClick={startOver} leadingIcon={<RotateCcw size={16} />}>
              Analyse another study
            </Button>
          )
        }
      />

      <AnimatePresence mode="wait">
        {!data ? (
          <motion.div
            key="upload"
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid gap-6 xl:grid-cols-5"
          >
            {/* ---- Upload panel ---- */}
            <Card className="xl:col-span-3">
              <CardHeader
                eyebrow="Step 1"
                title="Load the radiograph"
                subtitle="PNG or JPEG · up to 10 MB"
                icon={<ScanLine size={18} />}
                divided
              />

              <UploadDropzone
                onSelect={setFile}
                preview={preview}
                file={file}
                onClear={() => setFile(null)}
                onExpand={() => setExpanded(true)}
                disabled={isPending}
              />

              <AnimatePresence>
                {isPending && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6">
                      <AnalysisProgress uploadProgress={uploadProgress} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
                <p className="text-xs leading-relaxed text-fg-subtle">
                  Images are processed for analysis only and are never used to retrain the model.
                </p>
                <Button
                  size="lg"
                  onClick={analyze}
                  disabled={!file}
                  loading={isPending}
                  leadingIcon={!isPending && <Sparkles size={18} />}
                >
                  {isPending ? 'Analysing…' : 'Run analysis'}
                </Button>
              </div>
            </Card>

            {/* ---- Side rail ---- */}
            <div className="space-y-6 xl:col-span-2">
              <Card>
                <CardHeader
                  eyebrow="How it works"
                  title="Analysis pipeline"
                  icon={<Brain size={18} />}
                  divided
                />
                <ol className="relative space-y-6">
                  <span className="absolute bottom-3 left-[0.9375rem] top-3 w-px bg-line" aria-hidden />
                  {PIPELINE.map((entry) => (
                    <li key={entry.step} className="relative flex gap-4">
                      <span className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600/10 text-[11px] font-bold text-brand-700 ring-4 ring-surface dark:bg-accent-400/10 dark:text-accent-300">
                        {entry.step}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-semibold text-fg">{entry.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-fg-muted">{entry.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <Alert tone="clinical" className="mt-6">
                  Outputs are advisory. A qualified clinician must review every study before it
                  informs care.
                </Alert>
              </Card>

              <Card>
                <CardHeader
                  eyebrow="Worklist"
                  title="Recent studies"
                  icon={<Clock size={18} />}
                  action={
                    <Link to="/history">
                      <Button variant="ghost" size="sm">
                        All
                      </Button>
                    </Link>
                  }
                  divided
                />
                {recent.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 rounded-xl" />
                    ))}
                  </div>
                ) : recent.data && recent.data.length > 0 ? (
                  <ul className="space-y-1">
                    {recent.data.map((item) => (
                      <li key={item.id}>
                        <Link
                          to={`/history/${item.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-surface-sunken"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <ClassBadge label={item.predicted_class} size="sm" />
                            <span className="text-sm font-medium text-fg nums">
                              {percent(item.confidence, 0)}
                            </span>
                          </div>
                          <span className="shrink-0 text-xs text-fg-subtle">
                            {timeAgo(item.created_at)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    art="scan"
                    title="No prior studies"
                    description="Your analysed radiographs will be listed here for quick recall."
                    className="py-8"
                  />
                )}
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <PredictionResult prediction={data} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen pre-analysis preview */}
      <Dialog
        open={expanded && Boolean(preview)}
        onClose={() => setExpanded(false)}
        title="Study preview"
        description={file?.name}
        size="xl"
      >
        {preview && (
          <div className="radiology-plate">
            <img
              src={preview}
              alt="Full-size preview of the selected chest radiograph"
              className="mx-auto max-h-[70vh] w-full object-contain"
            />
          </div>
        )}
      </Dialog>
    </PageTransition>
  );
}
