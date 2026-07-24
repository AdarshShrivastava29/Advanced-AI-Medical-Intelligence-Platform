import { cn } from '@/lib/utils';

export type EmptyArtKind = 'scan' | 'records' | 'documents' | 'assistant' | 'analytics' | 'search';

/**
 * Line-art illustrations for empty states. Each is a single stroked SVG that
 * inherits `currentColor`, so an empty state costs no extra network request and
 * themes automatically.
 */
export function EmptyArt({ kind, className }: { kind: EmptyArtKind; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={cn('h-full w-full', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      role="presentation"
    >
      {/* Shared grounding shadow */}
      <path d="M34 106 H126" strokeOpacity="0.25" />

      {kind === 'scan' && (
        <>
          <rect x="46" y="20" width="68" height="78" rx="8" strokeOpacity="0.55" />
          <path d="M80 30 L80 54" strokeOpacity="0.8" />
          <path d="M80 54 L70 64 M80 54 L90 64" strokeOpacity="0.8" />
          <path d="M74 44 C 62 48, 56 62, 58 76 C 59 86, 66 90, 72 86 C 76 82, 76 68, 74 60 Z" strokeOpacity="0.7" />
          <path d="M86 44 C 98 48, 104 62, 102 76 C 101 86, 94 90, 88 86 C 84 82, 84 68, 86 60 Z" strokeOpacity="0.7" />
          <path d="M46 62 H114" strokeOpacity="0.35" strokeDasharray="4 5" />
        </>
      )}

      {kind === 'records' && (
        <>
          <rect x="38" y="26" width="60" height="72" rx="7" strokeOpacity="0.5" />
          <rect x="52" y="18" width="60" height="72" rx="7" strokeOpacity="0.75" />
          <path d="M64 38 H100 M64 50 H100 M64 62 H88" strokeOpacity="0.55" />
          <circle cx="112" cy="82" r="16" strokeOpacity="0.8" />
          <path d="M112 76 V83 L117 86" strokeOpacity="0.8" />
        </>
      )}

      {kind === 'documents' && (
        <>
          <path d="M50 18 H92 L110 36 V102 H50 Z" strokeOpacity="0.7" />
          <path d="M92 18 V36 H110" strokeOpacity="0.7" />
          <path d="M62 54 H98 M62 66 H98 M62 78 H86" strokeOpacity="0.5" />
          <circle cx="112" cy="30" r="9" strokeOpacity="0.85" />
          <path d="M112 26 V34 M108 30 H116" strokeOpacity="0.85" />
        </>
      )}

      {kind === 'assistant' && (
        <>
          <rect x="34" y="26" width="70" height="48" rx="12" strokeOpacity="0.7" />
          <path d="M52 74 L52 88 L68 74" strokeOpacity="0.7" />
          <path d="M50 44 H88 M50 56 H74" strokeOpacity="0.5" />
          <rect x="98" y="52" width="34" height="30" rx="9" strokeOpacity="0.55" />
          <path d="M108 66 H122" strokeOpacity="0.45" />
          <circle cx="115" cy="42" r="6" strokeOpacity="0.7" />
          <path d="M115 48 V52" strokeOpacity="0.7" />
        </>
      )}

      {kind === 'analytics' && (
        <>
          <path d="M38 98 V34" strokeOpacity="0.45" />
          <path d="M38 98 H126" strokeOpacity="0.45" />
          <rect x="52" y="72" width="14" height="26" rx="4" strokeOpacity="0.7" />
          <rect x="76" y="56" width="14" height="42" rx="4" strokeOpacity="0.85" />
          <rect x="100" y="42" width="14" height="56" rx="4" strokeOpacity="0.6" />
          <path d="M52 44 L74 32 L96 40 L120 24" strokeOpacity="0.5" strokeDasharray="4 5" />
        </>
      )}

      {kind === 'search' && (
        <>
          <circle cx="74" cy="54" r="26" strokeOpacity="0.7" />
          <path d="M93 73 L112 92" strokeOpacity="0.85" />
          <path d="M62 54 H86 M74 42 V66" strokeOpacity="0.4" />
        </>
      )}
    </svg>
  );
}
