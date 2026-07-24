import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState, type ComponentProps } from 'react';

import { Input } from '@/components/ui/Input';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'trailing'>;

/**
 * Password field with a reveal toggle. The toggle is a real button so it is
 * keyboard-reachable and announces its state.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      ref={ref}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="grid h-8 w-8 place-items-center rounded-lg text-fg-subtle transition hover:bg-surface-sunken hover:text-fg"
        >
          {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      }
      {...props}
    />
  );
});
PasswordInput.displayName = 'PasswordInput';
