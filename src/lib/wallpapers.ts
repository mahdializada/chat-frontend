/**
 * Chat backgrounds. Presets are CSS gradients/patterns generated here rather
 * than image assets, so they stay crisp at any size and add no download weight.
 */
export interface Wallpaper {
  id: string;
  name: string;
  light: string;
  dark: string;
}

export const WALLPAPERS: Wallpaper[] = [
  {
    id: 'default',
    name: 'Default',
    light: 'linear-gradient(180deg, #f7f9fc 0%, #eef2f8 100%)',
    dark: 'linear-gradient(180deg, #14161c 0%, #1a1d25 100%)',
  },
  {
    id: 'plain',
    name: 'Plain',
    light: '#ffffff',
    dark: '#12141a',
  },
  {
    id: 'dots',
    name: 'Dots',
    light:
      'radial-gradient(circle at 1px 1px, rgba(47,124,246,0.14) 1px, transparent 0) 0 0/18px 18px, #f7f9fc',
    dark: 'radial-gradient(circle at 1px 1px, rgba(120,160,255,0.14) 1px, transparent 0) 0 0/18px 18px, #14161c',
  },
  {
    id: 'grid',
    name: 'Grid',
    light:
      'linear-gradient(rgba(47,124,246,0.07) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, rgba(47,124,246,0.07) 1px, transparent 1px) 0 0/24px 24px, #f8fafd',
    dark: 'linear-gradient(rgba(140,170,255,0.06) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, rgba(140,170,255,0.06) 1px, transparent 1px) 0 0/24px 24px, #14161c',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    light:
      'radial-gradient(60% 55% at 15% 0%, rgba(120,180,255,0.30), transparent 60%), radial-gradient(55% 50% at 90% 20%, rgba(190,150,255,0.26), transparent 60%), #f6f8fc',
    dark: 'radial-gradient(60% 55% at 15% 0%, rgba(60,100,190,0.34), transparent 60%), radial-gradient(55% 50% at 90% 20%, rgba(110,70,180,0.30), transparent 60%), #12141a',
  },
  {
    id: 'sand',
    name: 'Sand',
    light: 'linear-gradient(180deg, #fdf7ee 0%, #f6ede0 100%)',
    dark: 'linear-gradient(180deg, #1c1913 0%, #24201a 100%)',
  },
];

export const DEFAULT_WALLPAPER = WALLPAPERS[0];

export function resolveWallpaper(id: string | null | undefined): Wallpaper {
  return WALLPAPERS.find((w) => w.id === id) ?? DEFAULT_WALLPAPER;
}

/** Background value for the current colour mode. */
export function wallpaperBackground(id: string | null | undefined, isDark: boolean): string {
  const wallpaper = resolveWallpaper(id);
  return isDark ? wallpaper.dark : wallpaper.light;
}
