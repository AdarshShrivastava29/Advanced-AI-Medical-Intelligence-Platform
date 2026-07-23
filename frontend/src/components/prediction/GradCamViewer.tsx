import { Download } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { downloadMedia } from '@/lib/download';
import { mediaUrl } from '@/lib/utils';
import type { GradCamUrls } from '@/types/api';

interface GradCamViewerProps {
  gradcam: GradCamUrls;
  predictionId: string;
}

const PANELS: { key: keyof GradCamUrls; label: string; hint: string }[] = [
  { key: 'original', label: 'Original', hint: 'Uploaded X-ray' },
  { key: 'heatmap', label: 'Grad-CAM', hint: 'Activation heatmap' },
  { key: 'overlay', label: 'Overlay', hint: 'Explainable regions' },
];

/** Triptych of original / heatmap / overlay Grad-CAM images with downloads. */
export function GradCamViewer({ gradcam, predictionId }: GradCamViewerProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {PANELS.map((panel) => (
          <figure key={panel.key} className="space-y-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black/40 dark:border-white/10">
              <img
                src={mediaUrl(gradcam[panel.key])}
                alt={`${panel.label} image`}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </div>
            <figcaption className="text-center">
              <p className="text-sm font-medium">{panel.label}</p>
              <p className="text-xs text-slate-500">{panel.hint}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {PANELS.map((panel) => (
          <Button
            key={panel.key}
            variant="secondary"
            size="sm"
            onClick={() => downloadMedia(gradcam[panel.key], `prediction-${predictionId}-${panel.key}.png`)}
          >
            <Download size={14} /> {panel.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
