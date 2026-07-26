import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional Tailwind class names, de-duplicating conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a 0..1 probability as a percentage string. */
export function percent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Format an ISO datetime as a short human-readable string. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Relative "time ago" formatting for recent activity. */
export function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, secs] of units) {
    if (Math.abs(seconds) >= secs) {
      return rtf.format(-Math.round(seconds / secs), unit);
    }
  }
  return rtf.format(-seconds, 'second');
}

/**
 * Origin of the backend, derived from the API base by stripping the "/api/v1"
 * suffix. Used for paths that live outside the versioned API (media assets,
 * health probes). Returns "" when the base is relative, preserving same-origin
 * (dev proxy / nginx) behaviour.
 */
export function apiOrigin(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  return apiBase.replace(/\/api\/v1\/?$/, '');
}

/** Absolute URL for a backend-served media path (e.g. Grad-CAM images). */
export function mediaUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${apiOrigin()}${path}`;
}
