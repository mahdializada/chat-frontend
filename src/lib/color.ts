/** Small colour helpers for user-chosen accents and wallpaper tints. */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number): number =>
    light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/** Lightness the pale tints always reach, whatever the base colour is. */
const TINT_LIGHTNESS = { 50: 96, 100: 91, 200: 83 } as const;
/** Saturation caps for the pale tints, so light backgrounds stay soft. */
const TINT_SATURATION = { 50: 70, 100: 72, 200: 75 } as const;
/** Lightness offsets below the 500 shade for the darker steps. */
const SHADE_OFFSETS = { 600: -9, 700: -18, 800: -27, 900: -35 } as const;

/**
 * Builds a 50–900 palette from one picked colour, keeping its hue. The 500
 * shade is darkened until white text on it stays readable, because buttons
 * and the user's own message bubbles put white text on that shade.
 *
 * The pale steps (50–200) use fixed lightness instead of an offset from 500:
 * otherwise darkening the base for contrast would drag the tints used for
 * selected rows and tabs into loud, saturated colours.
 */
export function generatePalette(hex: string): Record<string, string> {
  const { h, s, l } = hexToHsl(hex);
  // Near-greys stay grey; everything else keeps enough colour to read as an accent.
  const sat = s < 8 ? s : Math.min(92, Math.max(28, s));
  let base = Math.min(56, Math.max(30, l));
  while (base > 24 && contrastRatio('#ffffff', hslToHex(h, sat, base)) < 3.4) {
    base -= 2;
  }

  const lightness: Record<(typeof STEPS)[number], number> = {
    50: TINT_LIGHTNESS[50],
    100: TINT_LIGHTNESS[100],
    200: TINT_LIGHTNESS[200],
    // 300 and 400 blend from the 200 tint down to the base shade.
    300: base + (TINT_LIGHTNESS[200] - base) * 0.62,
    400: base + (TINT_LIGHTNESS[200] - base) * 0.3,
    500: base,
    600: base + SHADE_OFFSETS[600],
    700: base + SHADE_OFFSETS[700],
    800: base + SHADE_OFFSETS[800],
    900: base + SHADE_OFFSETS[900],
  };

  const palette: Record<string, string> = {};
  for (const step of STEPS) {
    const stepSat =
      step === 50 || step === 100 || step === 200 ? Math.min(sat, TINT_SATURATION[step]) : sat;
    palette[step] = hslToHex(h, stepSat, Math.min(97, Math.max(8, lightness[step])));
  }
  return palette;
}

/** A deep, low-saturation version of a colour for dark-mode backgrounds. */
export function darkTint(hex: string): string {
  const { h, s } = hexToHsl(hex);
  return hslToHex(h, Math.min(s, 35), 13);
}
