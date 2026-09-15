'use client';

import { useCallback, useRef } from 'react';

interface LongPressOptions {
  delayMs?: number;
  enabled?: boolean;
}

/**
 * Touch long-press detection. Hover menus do not exist on phones, so a long
 * press is how a message opens its actions. Mouse presses are ignored (they
 * keep their hover/right-click affordances) and a press that turns into a
 * scroll is cancelled. The click that follows a fired long press is swallowed
 * so it cannot also select the message or follow a link.
 */
export function useLongPress(onLongPress: () => void, options: LongPressOptions = {}) {
  const { delayMs = 450, enabled = true } = options;
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const lastPointerType = useRef<string>('mouse');

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      lastPointerType.current = event.pointerType;
      if (!enabled || event.pointerType !== 'touch') return;
      fired.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = window.setTimeout(() => {
        timer.current = null;
        fired.current = true;
        onLongPress();
      }, delayMs);
    },
    [enabled, delayMs, onLongPress],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!origin.current || timer.current === null) return;
      const moved =
        Math.abs(event.clientX - origin.current.x) > 10 ||
        Math.abs(event.clientY - origin.current.y) > 10;
      if (moved) clear();
    },
    [clear],
  );

  const onContextMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    // Android fires contextmenu after a long touch; the sheet replaces it.
    if (lastPointerType.current === 'touch') event.preventDefault();
  }, []);

  const onClickCapture = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!fired.current) return;
    fired.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu,
    onClickCapture,
  };
}
