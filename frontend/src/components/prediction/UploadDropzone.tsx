import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, FileImage, ImageUp, Maximize2, TriangleAlert, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Button, IconButton } from '@/components/ui/Button';
import { ThoraxArt } from '@/components/visuals/ThoraxArt';
import { cn } from '@/lib/utils';

const ACCEPTED = ['image/png', 'image/jpeg'];
const MAX_BYTES = 10 * 1024 * 1024;

interface UploadDropzoneProps {
  onSelect: (file: File) => void;
  preview: string | null;
  onClear: () => void;
  disabled?: boolean;
  /** Metadata for the selected file, shown in the preview strip. */
  file?: File | null;
  /** Opens the full-screen preview; omit to hide the control. */
  onExpand?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Drag-and-drop study upload with preview, validation and quality readout. */
export function UploadDropzone({
  onSelect,
  preview,
  onClear,
  disabled,
  file,
  onExpand,
}: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (candidate: File | undefined) => {
      if (!candidate) return;
      if (!ACCEPTED.includes(candidate.type)) {
        setError('Unsupported format. Upload a PNG or JPEG chest radiograph.');
        return;
      }
      if (candidate.size > MAX_BYTES) {
        setError(`File is ${formatBytes(candidate.size)} — the limit is 10 MB.`);
        return;
      }
      setError(null);
      onSelect(candidate);
    },
    [onSelect],
  );

  // ---------------- Selected state ----------------
  if (preview) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3"
      >
        <div className="radiology-plate group relative">
          <img
            src={preview}
            alt="Selected chest radiograph, ready for analysis"
            className="mx-auto max-h-[26rem] w-full object-contain"
          />

          {/* Viewer overlay chrome */}
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" aria-hidden />
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-black/55 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
            <CheckCircle2 size={12} className="text-success-500" aria-hidden />
            Study loaded
          </div>

          <div className="absolute right-3 top-3 flex gap-2">
            {onExpand && (
              <button
                type="button"
                onClick={onExpand}
                aria-label="View full screen"
                className="grid h-8 w-8 place-items-center rounded-lg bg-black/55 text-white/90 backdrop-blur-sm transition hover:bg-black/75"
              >
                <Maximize2 size={16} aria-hidden />
              </button>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove image"
                className="grid h-8 w-8 place-items-center rounded-lg bg-black/55 text-white/90 backdrop-blur-sm transition hover:bg-danger-600"
              >
                <X size={16} aria-hidden />
              </button>
            )}
          </div>
        </div>

        {file && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-muted px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600/10 text-brand-700 dark:bg-accent-400/10 dark:text-accent-300">
                <FileImage size={16} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{file.name}</p>
                <p className="text-xs text-fg-subtle nums">
                  {formatBytes(file.size)} · {file.type.replace('image/', '').toUpperCase()}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-success-500/10 px-3 py-1 text-xs font-medium text-success-600 dark:text-success-400">
              <CheckCircle2 size={12} aria-hidden /> Format validated
            </span>
          </div>
        )}
      </motion.div>
    );
  }

  // ---------------- Empty state ----------------
  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload a chest X-ray image"
        aria-disabled={disabled}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) handleFile(event.dataTransfer.files?.[0]);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-[transform,box-shadow,border-color,background-color,color,opacity] duration-300 ease-premium sm:py-16',
          dragging
            ? 'border-brand-600 bg-brand-600/[0.06] dark:border-accent-400 dark:bg-accent-400/[0.08]'
            : 'border-line-strong hover:border-brand-500 hover:bg-surface-muted',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        {/* Ambient anatomy watermark */}
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.055] dark:opacity-[0.09]"
          aria-hidden
        >
          <ThoraxArt className="h-[22rem] w-[22rem] text-brand-700 dark:text-accent-400" scan={false} />
        </div>

        <motion.span
          animate={dragging ? { scale: 1.08, y: -4 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="relative grid h-16 w-16 place-items-center rounded-2xl bg-brand-600/10 text-brand-700 ring-1 ring-inset ring-brand-600/15 dark:bg-accent-400/10 dark:text-accent-300 dark:ring-accent-400/20"
        >
          <ImageUp size={28} aria-hidden />
        </motion.span>

        <div className="relative max-w-sm">
          <p className="font-display text-base font-semibold text-fg">
            {dragging ? 'Release to load the study' : 'Drop a chest radiograph here'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Or browse your workstation. The image is analysed immediately — classification, Grad-CAM
            localisation and a drafted report.
          </p>
        </div>

        <Button type="button" variant="secondary" disabled={disabled} className="relative">
          Choose file
        </Button>

        <p className="relative text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
          PNG or JPEG · max 10 MB · single frame
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          tabIndex={-1}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-danger-500/25 bg-danger-500/[0.07] p-3 text-sm text-danger-700 dark:text-danger-400">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span className="flex-1">{error}</span>
              <IconButton
                label="Dismiss"
                icon={<X size={14} />}
                size="icon-sm"
                onClick={() => setError(null)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
