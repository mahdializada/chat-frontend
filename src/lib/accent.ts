import { isHexColor } from './color';

export const DEFAULT_ACCENT = '#2f7cf6';

export const ACCENT_PRESETS: { name: string; value: string }[] = [
  { name: 'Blue', value: '#2f7cf6' },
  { name: 'Indigo', value: '#5b5bd6' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Purple', value: '#a23dc2' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Cyan', value: '#0891b2' },
  { name: 'Slate', value: '#475569' },
];

const STORAGE_KEY = 'nexachat-accent';

/**
 * The accent is stored on the account; this local copy only paints the login
 * screen and first frame in the right colour before the session loads.
 */
export function readCachedAccent(): string | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isHexColor(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeCachedAccent(value: string | null): void {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, value);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); the account value still applies.
  }
}
