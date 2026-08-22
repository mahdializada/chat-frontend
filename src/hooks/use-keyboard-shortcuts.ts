'use client';

import { useEffect } from 'react';

export interface ShortcutHandlers {
  /** Ctrl/Cmd+K — focus the global chat search. */
  onGlobalSearch?: () => void;
  /** Ctrl/Cmd+F — search inside the open conversation. */
  onConversationSearch?: () => void;
  /** Escape — close whatever is open. */
  onEscape?: () => void;
}

/** True when the event originated inside an editable field. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

/**
 * Application shortcuts.
 *
 * Only the combinations the app genuinely overrides are intercepted — normal
 * browser behaviour (copy, paste, reload, find-in-page outside a chat) is left
 * alone, and typing inside an input is never hijacked except for Escape.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const modifier = event.metaKey || event.ctrlKey;

      if (event.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }

      if (!modifier) return;

      const key = event.key.toLowerCase();
      if (key === 'k' && handlers.onGlobalSearch) {
        event.preventDefault();
        handlers.onGlobalSearch();
        return;
      }
      if (key === 'f' && handlers.onConversationSearch && !isEditableTarget(event.target)) {
        event.preventDefault();
        handlers.onConversationSearch();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
