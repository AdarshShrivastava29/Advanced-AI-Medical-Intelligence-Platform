import { cn } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const sizes: Record<AvatarSize, string> = {
  xs: 'h-7 w-7 text-[0.6875rem]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
};

/** Derive up to two initials from a display name. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  /** Renders a small presence ring (e.g. active session). */
  online?: boolean;
  className?: string;
}

/** Initials avatar with the brand gradient — no external image dependency. */
export function Avatar({ name, size = 'sm', online = false, className }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'grid place-items-center rounded-full bg-gradient-to-br from-brand-600 to-clinical-600 font-semibold text-white ring-2 ring-surface',
          sizes[size],
        )}
        aria-hidden
      >
        {initialsOf(name)}
      </span>
      {online && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success-500 ring-2 ring-surface"
          aria-hidden
        />
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
