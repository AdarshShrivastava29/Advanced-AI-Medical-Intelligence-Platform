import { cn } from '@/lib/utils';

const markSizes = { sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-11 w-11' } as const;

/**
 * AIMIP logo mark: a medical cross fused with an ECG trace, drawn as SVG so it
 * stays crisp at every size and inherits the brand gradient.
 */
export function BrandMark({ size = 'md', className }: { size?: keyof typeof markSizes; className?: string }) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 via-brand-700 to-clinical-700 text-white shadow-sm shadow-brand-900/25',
        markSizes[size],
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[60%] w-[60%]">
        {/* Medical cross */}
        <path
          d="M9.6 3.4h4.8v5.2h5.2v4.8h-5.2v5.2H9.6v-5.2H4.4V8.6h5.2V3.4Z"
          fill="currentColor"
          fillOpacity="0.22"
        />
        {/* ECG trace */}
        <path
          d="M2.5 12.4h4l1.9-4.2 2.6 8 2.2-5.1 1.4 2.4h6.9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

interface BrandProps {
  /** Mark only — used in the collapsed sidebar and tight mobile chrome. */
  compact?: boolean;
  size?: keyof typeof markSizes;
  /** Caption under the wordmark; defaults to the product descriptor. */
  tagline?: string;
  className?: string;
  /** Force light text (for use on the dark auth hero panel). */
  inverted?: boolean;
}

/** AIMIP wordmark + logo. */
export function Brand({
  compact = false,
  size = 'md',
  tagline = 'Medical Intelligence',
  className,
  inverted = false,
}: BrandProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BrandMark size={size} />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p
            className={cn(
              'font-display text-[0.9375rem] font-bold tracking-tight',
              inverted ? 'text-white' : 'text-fg',
            )}
          >
            AIMIP
          </p>
          <p className={cn('truncate text-[11px]', inverted ? 'text-white/75' : 'text-fg-subtle')}>
            {tagline}
          </p>
        </div>
      )}
    </div>
  );
}
