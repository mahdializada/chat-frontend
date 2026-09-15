import { darkTint, isHexColor } from './color';
import { absoluteUrl } from './env';

/**
 * Chat backgrounds. Presets are CSS gradients and patterns generated here
 * rather than image assets, so they stay crisp at any size and add no download
 * weight. Users can also pick a solid colour ("color:#rrggbb") or upload a photo
 * (stored as its URL). The backend validates the same four shapes.
 */
export type WallpaperCategory = 'gradient' | 'scene' | 'pattern' | 'solid';

export interface Wallpaper {
  id: string;
  name: string;
  category: WallpaperCategory;
  light: string;
  dark: string;
}

export const WALLPAPER_CATEGORIES: { id: WallpaperCategory; label: string }[] = [
  { id: 'gradient', label: 'Gradients' },
  { id: 'scene', label: 'Scenes' },
  { id: 'pattern', label: 'Patterns' },
  { id: 'solid', label: 'Solid colours' },
];

const pattern = (light: string, dark: string, lightBase: string, darkBase: string) => ({
  light: `${light}, ${lightBase}`,
  dark: `${dark}, ${darkBase}`,
});

export const WALLPAPERS: Wallpaper[] = [
  // ── gradients ──
  {
    id: 'default',
    name: 'Default',
    category: 'gradient',
    light: 'linear-gradient(180deg, #f7f9fc 0%, #eef2f8 100%)',
    dark: 'linear-gradient(180deg, #14161c 0%, #1a1d25 100%)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    category: 'gradient',
    light: 'linear-gradient(160deg, #e6f2ff 0%, #e3faf5 100%)',
    dark: 'linear-gradient(160deg, #0f1a26 0%, #0f1f1d 100%)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    category: 'gradient',
    light: 'linear-gradient(160deg, #fff0e3 0%, #ffe4ee 100%)',
    dark: 'linear-gradient(160deg, #241712 0%, #24141c 100%)',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    category: 'gradient',
    light: 'linear-gradient(160deg, #f2edff 0%, #e8efff 100%)',
    dark: 'linear-gradient(160deg, #18142b 0%, #131a2b 100%)',
  },
  {
    id: 'mint',
    name: 'Mint',
    category: 'gradient',
    light: 'linear-gradient(160deg, #e9fbf1 0%, #f1fae6 100%)',
    dark: 'linear-gradient(160deg, #0f1d17 0%, #141c11 100%)',
  },
  {
    id: 'peach',
    name: 'Peach',
    category: 'gradient',
    light: 'linear-gradient(160deg, #fff3ea 0%, #ffeeee 100%)',
    dark: 'linear-gradient(160deg, #221813 0%, #231517 100%)',
  },
  {
    id: 'rose',
    name: 'Rose',
    category: 'gradient',
    light: 'linear-gradient(160deg, #ffeef3 0%, #f7ecfc 100%)',
    dark: 'linear-gradient(160deg, #23131a 0%, #1e1323 100%)',
  },
  {
    id: 'sand',
    name: 'Sand',
    category: 'gradient',
    light: 'linear-gradient(180deg, #fdf7ee 0%, #f6ede0 100%)',
    dark: 'linear-gradient(180deg, #1c1913 0%, #24201a 100%)',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    category: 'gradient',
    light: 'linear-gradient(160deg, #e7ebf5 0%, #dce2f0 100%)',
    dark: 'linear-gradient(160deg, #0b0f1d 0%, #161b30 100%)',
  },

  // ── scenes ──
  {
    id: 'aurora',
    name: 'Aurora',
    category: 'scene',
    light:
      'radial-gradient(60% 55% at 15% 0%, rgba(120,180,255,0.30), transparent 60%), radial-gradient(55% 50% at 90% 20%, rgba(190,150,255,0.26), transparent 60%), #f6f8fc',
    dark: 'radial-gradient(60% 55% at 15% 0%, rgba(60,100,190,0.34), transparent 60%), radial-gradient(55% 50% at 90% 20%, rgba(110,70,180,0.30), transparent 60%), #12141a',
  },
  {
    id: 'dawn',
    name: 'Dawn',
    category: 'scene',
    light:
      'radial-gradient(70% 60% at 10% 10%, rgba(255,190,150,0.45), transparent 60%), radial-gradient(60% 60% at 90% 90%, rgba(255,150,190,0.35), transparent 60%), #fff7f3',
    dark: 'radial-gradient(70% 60% at 10% 10%, rgba(160,80,50,0.35), transparent 60%), radial-gradient(60% 60% at 90% 90%, rgba(150,60,110,0.30), transparent 60%), #17131a',
  },
  {
    id: 'lagoon',
    name: 'Lagoon',
    category: 'scene',
    light:
      'radial-gradient(80% 60% at 0% 100%, rgba(80,200,200,0.35), transparent 60%), radial-gradient(70% 60% at 100% 0%, rgba(90,150,255,0.30), transparent 60%), #f2f9fb',
    dark: 'radial-gradient(80% 60% at 0% 100%, rgba(30,110,120,0.40), transparent 60%), radial-gradient(70% 60% at 100% 0%, rgba(40,80,170,0.35), transparent 60%), #0f171b',
  },
  {
    id: 'meadow',
    name: 'Meadow',
    category: 'scene',
    light:
      'radial-gradient(90% 60% at 50% 110%, rgba(120,200,120,0.35), transparent 60%), radial-gradient(50% 40% at 85% 10%, rgba(255,220,120,0.30), transparent 60%), #f4fbf2',
    dark: 'radial-gradient(90% 60% at 50% 110%, rgba(50,110,60,0.38), transparent 60%), radial-gradient(50% 40% at 85% 10%, rgba(120,100,40,0.25), transparent 60%), #121813',
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    category: 'scene',
    light:
      'radial-gradient(circle at 20% 30%, rgba(90,110,200,0.45) 0 1px, transparent 1.6px) 0 0 / 140px 140px, radial-gradient(circle at 70% 65%, rgba(90,110,200,0.35) 0 1px, transparent 1.6px) 0 0 / 90px 90px, radial-gradient(60% 50% at 80% 10%, rgba(150,130,255,0.25), transparent 60%), #f5f5fc',
    dark: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.75) 0 1px, transparent 1.6px) 0 0 / 140px 140px, radial-gradient(circle at 70% 65%, rgba(255,255,255,0.55) 0 1px, transparent 1.6px) 0 0 / 90px 90px, radial-gradient(circle at 45% 85%, rgba(255,255,255,0.45) 0 1.2px, transparent 1.8px) 0 0 / 210px 210px, radial-gradient(60% 50% at 80% 10%, rgba(110,80,220,0.35), transparent 60%), #0c0e18',
  },

  // ── patterns ──
  {
    id: 'dots',
    name: 'Dots',
    category: 'pattern',
    light:
      'radial-gradient(circle at 1px 1px, rgba(47,124,246,0.14) 1px, transparent 0) 0 0/18px 18px, #f7f9fc',
    dark: 'radial-gradient(circle at 1px 1px, rgba(120,160,255,0.14) 1px, transparent 0) 0 0/18px 18px, #14161c',
  },
  {
    id: 'grid',
    name: 'Grid',
    category: 'pattern',
    light:
      'linear-gradient(rgba(47,124,246,0.07) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, rgba(47,124,246,0.07) 1px, transparent 1px) 0 0/24px 24px, #f8fafd',
    dark: 'linear-gradient(rgba(140,170,255,0.06) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, rgba(140,170,255,0.06) 1px, transparent 1px) 0 0/24px 24px, #14161c',
  },
  {
    id: 'diagonal',
    name: 'Diagonal',
    category: 'pattern',
    ...pattern(
      'repeating-linear-gradient(45deg, rgba(47,124,246,0.06) 0 2px, transparent 2px 14px)',
      'repeating-linear-gradient(45deg, rgba(140,170,255,0.06) 0 2px, transparent 2px 14px)',
      '#f7f9fc',
      '#14161c',
    ),
  },
  {
    id: 'checks',
    name: 'Checks',
    category: 'pattern',
    ...pattern(
      'conic-gradient(rgba(47,124,246,0.05) 25%, transparent 0 50%, rgba(47,124,246,0.05) 0 75%, transparent 0) 0 0 / 28px 28px',
      'conic-gradient(rgba(140,170,255,0.05) 25%, transparent 0 50%, rgba(140,170,255,0.05) 0 75%, transparent 0) 0 0 / 28px 28px',
      '#f8fafd',
      '#14161c',
    ),
  },
  {
    id: 'bubbles',
    name: 'Bubbles',
    category: 'pattern',
    ...pattern(
      'radial-gradient(circle at 30% 30%, rgba(47,124,246,0.08) 0 10px, transparent 11px) 0 0 / 60px 60px, radial-gradient(circle at 75% 75%, rgba(47,124,246,0.06) 0 6px, transparent 7px) 0 0 / 60px 60px',
      'radial-gradient(circle at 30% 30%, rgba(140,170,255,0.08) 0 10px, transparent 11px) 0 0 / 60px 60px, radial-gradient(circle at 75% 75%, rgba(140,170,255,0.06) 0 6px, transparent 7px) 0 0 / 60px 60px',
      '#f7f9fc',
      '#14161c',
    ),
  },
  {
    id: 'waves',
    name: 'Waves',
    category: 'pattern',
    ...pattern(
      'radial-gradient(circle at 50% 100%, transparent 17px, rgba(47,124,246,0.08) 18px 20px, transparent 21px) 0 0 / 44px 22px',
      'radial-gradient(circle at 50% 100%, transparent 17px, rgba(140,170,255,0.08) 18px 20px, transparent 21px) 0 0 / 44px 22px',
      '#f7f9fc',
      '#14161c',
    ),
  },
  {
    id: 'crosshatch',
    name: 'Crosshatch',
    category: 'pattern',
    ...pattern(
      'repeating-linear-gradient(45deg, rgba(0,0,0,0.035) 0 1px, transparent 1px 12px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.035) 0 1px, transparent 1px 12px)',
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 12px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 12px)',
      '#fafafa',
      '#15171c',
    ),
  },
  {
    id: 'confetti',
    name: 'Confetti',
    category: 'pattern',
    ...pattern(
      'radial-gradient(circle at 15% 20%, rgba(236,72,153,0.20) 0 2px, transparent 3px) 0 0 / 70px 70px, radial-gradient(circle at 60% 55%, rgba(59,130,246,0.20) 0 2px, transparent 3px) 0 0 / 90px 90px, radial-gradient(circle at 85% 80%, rgba(245,158,11,0.22) 0 2px, transparent 3px) 0 0 / 110px 110px',
      'radial-gradient(circle at 15% 20%, rgba(236,72,153,0.28) 0 2px, transparent 3px) 0 0 / 70px 70px, radial-gradient(circle at 60% 55%, rgba(96,165,250,0.28) 0 2px, transparent 3px) 0 0 / 90px 90px, radial-gradient(circle at 85% 80%, rgba(251,191,36,0.26) 0 2px, transparent 3px) 0 0 / 110px 110px',
      '#fbfbfd',
      '#14161c',
    ),
  },

  // ── solid colours ──
  { id: 'plain', name: 'Plain', category: 'solid', light: '#ffffff', dark: '#12141a' },
  { id: 'mist', name: 'Mist', category: 'solid', light: '#eef3f8', dark: '#1b2029' },
  { id: 'sky', name: 'Sky', category: 'solid', light: '#e7f2fd', dark: '#131b24' },
  { id: 'sage', name: 'Sage', category: 'solid', light: '#ecf3ec', dark: '#161c17' },
  { id: 'cream', name: 'Cream', category: 'solid', light: '#faf5e9', dark: '#1d1b16' },
  { id: 'blush', name: 'Blush', category: 'solid', light: '#fbedf1', dark: '#1f161a' },
  { id: 'stone', name: 'Stone', category: 'solid', light: '#f0f0ed', dark: '#1a1a19' },
  { id: 'charcoal', name: 'Charcoal', category: 'solid', light: '#e2e4e9', dark: '#0e1014' },
];

export const DEFAULT_WALLPAPER = WALLPAPERS[0];

/** Uploaded photos: our uploads path or an https URL, with nothing that could escape CSS url(). */
const SAFE_IMAGE_URL = /^(?:https:\/\/|\/uploads\/)[^\s"'()\\<>]+$/;

export type ParsedWallpaper =
  | { kind: 'preset'; preset: Wallpaper }
  | { kind: 'color'; color: string }
  | { kind: 'image'; url: string };

export function parseWallpaper(value: string | null | undefined): ParsedWallpaper {
  if (value?.startsWith('color:')) {
    const color = value.slice('color:'.length);
    if (isHexColor(color)) return { kind: 'color', color: color.toLowerCase() };
  }
  if (value && SAFE_IMAGE_URL.test(value)) return { kind: 'image', url: value };
  return { kind: 'preset', preset: WALLPAPERS.find((w) => w.id === value) ?? DEFAULT_WALLPAPER };
}

export function resolveWallpaper(value: string | null | undefined): Wallpaper {
  const parsed = parseWallpaper(value);
  return parsed.kind === 'preset' ? parsed.preset : DEFAULT_WALLPAPER;
}

export function colorWallpaper(hex: string): string {
  return `color:${hex.toLowerCase()}`;
}

/** Background value for the current colour mode. */
export function wallpaperBackground(value: string | null | undefined, isDark: boolean): string {
  const parsed = parseWallpaper(value);
  switch (parsed.kind) {
    case 'color':
      return isDark ? darkTint(parsed.color) : parsed.color;
    case 'image': {
      const src = absoluteUrl(parsed.url);
      // A light veil keeps bubbles readable on busy photos; darker in dark mode.
      return isDark
        ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url("${src}") center / cover no-repeat, #12141a`
        : `linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0.12)), url("${src}") center / cover no-repeat, #eef2f8`;
    }
    default:
      return isDark ? parsed.preset.dark : parsed.preset.light;
  }
}

export function wallpaperLabel(value: string | null | undefined): string {
  const parsed = parseWallpaper(value);
  if (parsed.kind === 'color') return `Solid colour ${parsed.color.toUpperCase()}`;
  if (parsed.kind === 'image') return 'Your photo';
  return parsed.preset.name;
}
