import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

export const theme = extendTheme({
  config,
  fonts: {
    heading: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
    body: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
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
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
  },
  styles: {
    global: {
      'html, body, #__next': {
        height: '100%',
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
