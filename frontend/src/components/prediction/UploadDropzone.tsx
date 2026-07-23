import { motion } from 'framer-motion';
import { ImageUp, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const ACCEPTED = ['image/png', 'image/jpeg'];
const MAX_BYTES = 10 * 1024 * 1024;

interface UploadDropzoneProps {
  onSelect: (file: File) => void;
  preview: string | null;
  onClear: () => void;
  disabled?: boolean;
}

/** Drag-and-drop image upload with preview and validation. */
export function UploadDropzone({ onSelect, preview, onClear, disabled }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) {
        setError('Please upload a PNG or JPEG image.');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError('File exceeds the 10 MB limit.');
        return;
      }
      setError(null);
      onSelect(file);
    },
    [onSelect],
  );

  if (preview) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        <img src={preview} alt="Selected chest X-ray preview" className="max-h-80 w-full object-contain bg-slate-900/5 dark:bg-black/40" />
        {!disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove image"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-slate-900/60 text-white backdrop-blur hover:bg-slate-900/80"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <motion.div
        whileHover={{ scale: disabled ? 1 : 1.005 }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFile(e.dataTransfer.files?.[0]);
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload a chest X-ray image"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition',
          dragging
            ? 'border-brand-500 bg-brand-500/5'
            : 'border-slate-300 hover:border-brand-400 dark:border-white/15',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-500">
          <ImageUp size={26} aria-hidden />
        </span>
        <div>
          <p className="font-medium">Drop a chest X-ray here, or click to browse</p>
          <p className="mt-1 text-sm text-slate-500">PNG or JPEG, up to 10 MB</p>
        </div>
        <Button type="button" variant="secondary" size="sm" disabled={disabled}>
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </motion.div>
      {error && <p className="mt-2 text-sm text-risk-high">{error}</p>}
    </div>
  );
}
