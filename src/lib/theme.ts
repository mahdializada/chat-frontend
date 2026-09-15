import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

// Inter is loaded through next/font in app/layout.tsx and exposed as --font-inter.
const fontStack = `var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

export const theme = extendTheme({
  config,
  fonts: {
    heading: fontStack,
    body: fontStack,
  },
  colors: {
    brand: {
      50: '#e8f2ff',
      100: '#c5dcff',
      200: '#9ec4ff',
      300: '#74abff',
      400: '#4f94ff',
      500: '#2f7cf6',
      600: '#2161d1',
      700: '#1747a3',
      800: '#0e2f75',
      900: '#071a4a',
    },
    gray: {
      // 750 sits between Chakra's 700 and 800 — used for raised cards in dark mode.
      750: '#252a33',
    },
  },
  /**
   * Semantic colours: one name per role, resolved per colour mode. Components
   * use these instead of hand-picking light/dark pairs, so the palette stays
   * consistent and can be tuned in one place.
   */
  semanticTokens: {
    colors: {
      'bg.canvas': { default: 'gray.50', _dark: 'gray.900' },
      'bg.surface': { default: 'white', _dark: 'gray.800' },
      'bg.subtle': { default: 'gray.50', _dark: 'whiteAlpha.50' },
      'bg.muted': { default: 'gray.100', _dark: 'whiteAlpha.100' },
      'bg.hover': { default: 'gray.100', _dark: 'whiteAlpha.100' },
      'bg.active': { default: 'brand.50', _dark: 'whiteAlpha.200' },
      'border.subtle': { default: 'gray.200', _dark: 'whiteAlpha.200' },
      'text.muted': { default: 'gray.500', _dark: 'gray.400' },
      'bubble.own': { default: 'brand.500', _dark: 'brand.600' },
      'bubble.other': { default: 'white', _dark: 'gray.700' },
    },
  },
  shadows: {
    card: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.1)',
    bubble: '0 1px 1px rgba(16, 24, 40, 0.06)',
    float: '0 8px 24px rgba(16, 24, 40, 0.18)',
  },
  components: {
    Button: {
      baseStyle: { borderRadius: 'lg', fontWeight: 'semibold' },
      defaultProps: { colorScheme: 'brand' },
    },
    Input: {
      defaultProps: { focusBorderColor: 'brand.500' },
      variants: { outline: { field: { borderRadius: 'lg' } } },
    },
    Textarea: {
      defaultProps: { focusBorderColor: 'brand.500' },
      variants: { outline: { borderRadius: 'lg' } },
    },
    Menu: {
      baseStyle: {
        list: { borderRadius: 'xl', boxShadow: 'float', py: 1.5, borderColor: 'border.subtle' },
        item: { fontSize: 'sm', py: 2, px: 3 },
      },
    },
    Modal: {
      baseStyle: { dialog: { borderRadius: '2xl' } },
    },
    Tooltip: {
      baseStyle: { borderRadius: 'md', fontSize: 'xs', px: 2, py: 1 },
    },
  },
  styles: {
    global: {
      'html, body, #__next': {
        height: '100%',
      },
      body: {
        bg: 'bg.canvas',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      // Visible, consistent focus ring for keyboard users everywhere.
      '*:focus-visible': {
        outline: '2px solid',
        outlineColor: 'brand.400',
        outlineOffset: '2px',
      },
      // Thin scrollbars so long lists do not dominate the layout.
      '::-webkit-scrollbar': { width: '8px', height: '8px' },
      '::-webkit-scrollbar-thumb': {
        background: 'rgba(128,128,128,0.35)',
        borderRadius: '8px',
      },
      '::-webkit-scrollbar-track': { background: 'transparent' },
      '@media (prefers-reduced-motion: reduce)': {
        '*': {
          animationDuration: '0.01ms !important',
          transitionDuration: '0.01ms !important',
        },
      },
    },
  },
});
