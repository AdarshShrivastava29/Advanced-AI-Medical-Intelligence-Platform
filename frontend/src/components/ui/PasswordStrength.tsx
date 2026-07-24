import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface Rule {
  label: string;
  test: (value: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'Upper and lower case', test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { label: 'A number', test: (v) => /\d/.test(v) },
  { label: 'A symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const LEVELS = [
  { label: 'Too weak', tone: 'bg-danger-500', text: 'text-danger-600 dark:text-danger-500' },
  { label: 'Weak', tone: 'bg-danger-500', text: 'text-danger-600 dark:text-danger-500' },
  { label: 'Fair', tone: 'bg-warning-500', text: 'text-warning-600 dark:text-warning-500' },
  { label: 'Strong', tone: 'bg-success-500', text: 'text-success-600 dark:text-success-500' },
  { label: 'Excellent', tone: 'bg-success-600', text: 'text-success-600 dark:text-success-500' },
];

/**
 * Client-side password quality meter. Advisory only — the backend remains the
 * authority on what it accepts (minimum 8 characters).
 */
export function PasswordStrength({ value, className }: { value: string; className?: string }) {
  const passed = RULES.filter((rule) => rule.test(value)).length;
  const level = LEVELS[value.length === 0 ? 0 : passed];

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden>
          {RULES.map((rule, index) => (
            <span
              key={rule.label}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                index < passed && value.length > 0 ? level.tone : 'bg-line',
              )}
            />
          ))}
        </div>
        <span className={cn('w-20 shrink-0 text-right text-xs font-semibold', level.text)}>
          {value.length > 0 ? level.label : ''}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5" aria-live="polite">
        {RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li
              key={rule.label}
              className={cn(
                'flex items-center gap-1.5 text-[11px] transition-colors',
                ok ? 'text-success-600 dark:text-success-500' : 'text-fg-subtle',
              )}
            >
              {ok ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
