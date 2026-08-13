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
    },
  },
});
