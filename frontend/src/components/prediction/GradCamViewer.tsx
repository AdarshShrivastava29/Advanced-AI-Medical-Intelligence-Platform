import { AnimatePresence, motion } from 'framer-motion';
import {
  Columns2,
  Download,
  Layers,
  Maximize2,
  Minimize2,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { Button, IconButton } from '@/components/ui/Button';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { Tooltip } from '@/components/ui/Tooltip';
import { downloadMedia } from '@/lib/download';
import { cn, mediaUrl } from '@/lib/utils';
import type { GradCamUrls } from '@/types/api';

type ViewMode = 'original' | 'heatmap' | 'overlay' | 'compare';

const MODES: TabItem<ViewMode>[] = [
  { value: 'original', label: 'Original', icon: <Layers size={14} /> },
  { value: 'heatmap', label: 'Grad-CAM', icon: <Layers size={14} /> },
  { value: 'overlay', label: 'Overlay', icon: <Layers size={14} /> },
  { value: 'compare', label: 'Compare', icon: <Columns2 size={14} /> },
];

const MODE_HINT: Record<ViewMode, string> = {
  original: 'The uploaded radiograph, unmodified.',
  heatmap: 'Raw class-activation map — brighter regions drove the classification.',
  overlay: 'Activation map composited over the study at your chosen opacity.',
  compare: 'Drag the divider to wipe between the original and the overlay.',
};

const ZOOM_STEP = 0.35;
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

interface GradCamViewerProps {
  gradcam: GradCamUrls;
  predictionId: string;
}

/**
 * Diagnostic image workstation for the Grad-CAM triptych: mode tabs, a wipe
 * comparison, opacity control, zoom/pan and full-screen review.
 */
export function GradCamViewer({ gradcam, predictionId }: GradCamViewerProps) {
  const [mode, setMode] = useState<ViewMode>('overlay');
  const [opacity, setOpacity] = useState(65);
  const [wipe, setWipe] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const dragState = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Reset the transform whenever the mode changes so panning never "sticks".
  useEffect(() => {
    reset();
  }, [mode, reset]);

  // Escape leaves full-screen review.
  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [fullscreen]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state) return;
    setOffset({
      x: state.ox + (event.clientX - state.x),
      y: state.oy + (event.clientY - state.y),
    });
  };

  const endDrag = () => {
    dragState.current = null;
  };

  const stage = (
    <div
      className={cn(
        'radiology-plate relative select-none',
        zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className="relative mx-auto overflow-hidden"
        style={{ aspectRatio: '1 / 1', maxHeight: fullscreen ? '76vh' : '30rem' }}
      >
        <motion.div
          className="absolute inset-0"
          animate={{ scale: zoom, x: offset.x, y: offset.y }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        >
          {mode === 'compare' ? (
            <>
              <img
                src={mediaUrl(gradcam.overlay)}
                alt="Grad-CAM overlay"
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)` }}
              >
                <img
                  src={mediaUrl(gradcam.original)}
                  alt="Original radiograph"
                  className="absolute inset-0 h-full w-full object-contain"
                  draggable={false}
                />
              </div>
              {/* Wipe handle */}
              <div
                className="pointer-events-none absolute inset-y-0 w-0.5 bg-accent-400 shadow-[0_0_12px_rgba(91,192,235,0.8)]"
                style={{ left: `${wipe}%` }}
                aria-hidden
              >
                <span className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent-400 text-navy-950">
                  <Columns2 size={14} />
                </span>
              </div>
            </>
          ) : (
            <>
              <img
                src={mediaUrl(mode === 'heatmap' ? gradcam.heatmap : gradcam.original)}
                alt={mode === 'heatmap' ? 'Grad-CAM activation map' : 'Original radiograph'}
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
              {mode === 'overlay' && (
                <img
                  src={mediaUrl(gradcam.heatmap)}
                  alt="Grad-CAM activation overlay"
                  className="absolute inset-0 h-full w-full object-contain mix-blend-screen"
                  style={{ opacity: opacity / 100 }}
                  draggable={false}
                />
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Corner metadata, radiology-viewer style */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 text-[10px] font-medium uppercase tracking-wider text-white/55">
        <span>AIMIP · Grad-CAM</span>
        <span className="nums">{zoom.toFixed(2)}×</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3 text-[10px] font-medium uppercase tracking-wider text-white/55">
        <span>Study {predictionId.slice(0, 8)}</span>
        <span>Decision-support · not for primary diagnosis</span>
      </div>

      {zoom > 1 && (
        <span className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur-sm">
          <Move size={11} aria-hidden /> Drag to pan
        </span>
      )}
    </div>
  );

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <Tooltip content="Zoom out">
        <IconButton
          label="Zoom out"
          icon={<ZoomOut size={16} />}
          size="icon-sm"
          variant="secondary"
          disabled={zoom <= ZOOM_MIN}
          onClick={() => setZoom((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP))}
        />
      </Tooltip>
      <Tooltip content="Zoom in">
        <IconButton
          label="Zoom in"
          icon={<ZoomIn size={16} />}
          size="icon-sm"
          variant="secondary"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => setZoom((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP))}
        />
      </Tooltip>
      <Tooltip content="Reset view">
        <IconButton
          label="Reset view"
          icon={<RotateCcw size={15} />}
          size="icon-sm"
          variant="secondary"
          onClick={reset}
        />
      </Tooltip>
      <Tooltip content={fullscreen ? 'Exit full screen' : 'Full screen review'}>
        <IconButton
          label={fullscreen ? 'Exit full screen' : 'Full screen review'}
          icon={fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          size="icon-sm"
          variant="secondary"
          onClick={() => setFullscreen((value) => !value)}
        />
      </Tooltip>
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs
        items={MODES}
        value={mode}
        onChange={setMode}
        variant="pill"
        size="sm"
        aria-label="Explainability view"
        className="no-print"
      />

      {/* Rendered in exactly one place so the imagery is never duplicated for
          assistive technology while the full-screen review is open. */}
      {!fullscreen && stage}

      <p className="text-xs leading-relaxed text-fg-muted">{MODE_HINT[mode]}</p>

      {/* Mode-specific slider */}
      <AnimatePresence mode="wait">
        {(mode === 'overlay' || mode === 'compare') && (
          <motion.div
            key={mode}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="no-print overflow-hidden"
          >
            <label className="flex items-center gap-3 pt-1 text-sm">
              <span className="w-24 shrink-0 text-fg-muted">
                {mode === 'overlay' ? 'Heatmap' : 'Wipe'}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={mode === 'overlay' ? opacity : wipe}
                onChange={(event) =>
                  mode === 'overlay'
                    ? setOpacity(Number(event.target.value))
                    : setWipe(Number(event.target.value))
                }
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-sunken accent-brand-700 dark:accent-accent-400"
                aria-label={mode === 'overlay' ? 'Heatmap opacity' : 'Comparison wipe position'}
              />
              <span className="w-12 shrink-0 text-right font-semibold text-fg nums">
                {mode === 'overlay' ? opacity : wipe}%
              </span>
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {controls}
        <div className="flex flex-wrap gap-2">
          {(['original', 'heatmap', 'overlay'] as const).map((key) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              leadingIcon={<Download size={14} />}
              onClick={() => downloadMedia(gradcam[key], `study-${predictionId}-${key}.png`)}
            >
              {key === 'heatmap' ? 'Grad-CAM' : key === 'original' ? 'Original' : 'Overlay'}
            </Button>
          ))}
        </div>
      </div>

      {/* Full-screen review */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] flex flex-col bg-navy-975/95 p-4 backdrop-blur-sm sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label="Full-screen Grad-CAM review"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <Tabs
                items={MODES}
                value={mode}
                onChange={setMode}
                variant="pill"
                size="sm"
                aria-label="Explainability view"
                className="border-white/10 bg-white/5"
              />
              <IconButton
                label="Exit full screen"
                icon={<Minimize2 size={18} />}
                onClick={() => setFullscreen(false)}
                className="text-white hover:bg-white/10"
              />
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <div className="w-full max-w-4xl">{stage}</div>
            </div>
            <div className="mt-4 flex justify-center">{controls}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
