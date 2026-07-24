import { useEffect, type RefObject } from 'react';

/**
 * Calls `handler` when a pointer-down lands outside `ref`, or when Escape is
 * pressed. Used to dismiss menus, popovers and the command palette.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) handler();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handler();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, handler, enabled]);
}
