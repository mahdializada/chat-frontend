'use client';

import { useEffect, useState } from 'react';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** True on touch-first devices (phones, tablets) where hover is unavailable. */
export function useCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

/** "⌘" on Apple devices, "Ctrl" elsewhere — for shortcut hints. Resolved after mount. */
export function useModifierKeyLabel(): string {
  const [label, setLabel] = useState('Ctrl');
  useEffect(() => {
    if (/Mac|iPhone|iPad|iPod/.test(navigator.platform) || /Mac OS/.test(navigator.userAgent)) {
      setLabel('⌘');
    }
  }, []);
  return label;
}
