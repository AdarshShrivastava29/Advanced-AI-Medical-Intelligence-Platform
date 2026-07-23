import { AnimatePresence, motion } from 'framer-motion';
import { Brain, ScanLine, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PredictionResult } from '@/components/prediction/PredictionResult';
import { UploadDropzone } from '@/components/prediction/UploadDropzone';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { useCreatePrediction } from '@/hooks/usePredictions';
import { useToast } from '@/store/toastStore';

export function PredictionPage() {
  const toast = useToast();
  const { mutateAsync, data, isPending, uploadProgress, reset } = useCreatePrediction();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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
      toast.error('Prediction failed. Please try another image.');
    }
  };

  const startOver = () => {
    setFile(null);
    reset();
  };

  return (
    <PageTransition>
      <PageHeader
        title="New Prediction"
        description="Upload a chest X-ray to run classification, Grad-CAM and an AI report."
        action={data && <Button variant="secondary" onClick={startOver}>New scan</Button>}
      />

      <AnimatePresence mode="wait">
        {!data ? (
          <motion.div key="upload" exit={{ opacity: 0 }} className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Upload X-ray" subtitle="PNG or JPEG, up to 10 MB" icon={<ScanLine size={20} />} />
              <UploadDropzone
                onSelect={setFile}
                preview={preview}
                onClear={() => setFile(null)}
                disabled={isPending}
              />
              <div className="mt-6 flex justify-end">
                <Button size="lg" onClick={analyze} disabled={!file} loading={isPending}>
                  <Sparkles size={18} /> Analyze
                </Button>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="How it works" subtitle="Three steps" icon={<Brain size={20} />} />
              <ol className="space-y-4">
                {[
                  ['Upload', 'Drop a chest X-ray image into the panel.'],
                  ['Analyze', 'The model classifies the scan and computes Grad-CAM.'],
                  ['Review', 'Read the explainable heatmap and AI-drafted report.'],
                ].map(([title, body], index) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500/10 text-sm font-semibold text-brand-500">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-slate-500">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <AnimatePresence>
                {isPending && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 space-y-2 border-t border-slate-200/60 pt-4 dark:border-white/10"
                  >
                    <div className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-300">
                      <Sparkles size={16} className="animate-pulse" />
                      {uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : 'Running inference & Grad-CAM…'}
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                      <motion.div
                        className="h-full rounded-full bg-brand-500"
                        animate={{ width: uploadProgress < 100 ? `${uploadProgress}%` : '100%' }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="result">
            <PredictionResult prediction={data} />
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
