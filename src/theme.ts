'use client';

import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { Roboto, Poppins } from 'next/font/google';

// Define fonts
const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

// Create a theme instance
let theme = createTheme({
  palette: {
    primary: {
      main: '#ffaf06', // Yellow/Gold
      light: '#ffc046',
      dark: '#d99000',
      contrastText: '#000000',
    },
    secondary: {
      main: '#14bb87', // Green
      light: '#4dcca3',
      dark: '#0e8a63',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#d92c4a', // Red
      light: '#e35a72',
      dark: '#b01e38',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#ffaf06',
      light: '#ffc046',
      dark: '#d99000',
      contrastText: '#000000',
    },
    info: {
      main: '#14bb87',
      light: '#4dcca3',
      dark: '#0e8a63',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#14bb87',
      light: '#4dcca3',
      dark: '#0e8a63',
      contrastText: '#FFFFFF',
    },
    text: {
      primary: '#000000',
      secondary: '#333333',
      disabled: '#888888',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  typography: {
    fontFamily: poppins.style.fontFamily,
    h1: {
      fontWeight: 800,
      fontSize: '3.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.75rem',
      lineHeight: 1.2,
    },
    h3: {
      fontWeight: 700,
      fontSize: '2.25rem',
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 700,
      fontSize: '1.75rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.6,
    },
    subtitle1: {
      fontSize: '1.125rem',
      lineHeight: 1.6,
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.7,
    },
    button: {
      fontWeight: 600,
      fontSize: '0.875rem',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.05)',
    '0px 8px 16px rgba(0, 0, 0, 0.05)',
    '0px 12px 24px rgba(0, 0, 0, 0.05)',
    '0px 16px 32px rgba(0, 0, 0, 0.05)',
    '0px 20px 40px rgba(0, 0, 0, 0.05)',
    '0px 24px 48px rgba(0, 0, 0, 0.05)',
    '0px 28px 56px rgba(0, 0, 0, 0.05)',
    '0px 32px 64px rgba(0, 0, 0, 0.05)',
    '0px 36px 72px rgba(0, 0, 0, 0.05)',
    '0px 40px 80px rgba(0, 0, 0, 0.05)',
    '0px 44px 88px rgba(0, 0, 0, 0.05)',
    '0px 48px 96px rgba(0, 0, 0, 0.05)',
    '0px 52px 104px rgba(0, 0, 0, 0.05)',
    '0px 56px 112px rgba(0, 0, 0, 0.05)',
    '0px 60px 120px rgba(0, 0, 0, 0.05)',
    '0px 64px 128px rgba(0, 0, 0, 0.05)',
    '0px 68px 136px rgba(0, 0, 0, 0.05)',
    '0px 72px 144px rgba(0, 0, 0, 0.05)',
    '0px 76px 152px rgba(0, 0, 0, 0.05)',
    '0px 80px 160px rgba(0, 0, 0, 0.05)',
    '0px 84px 168px rgba(0, 0, 0, 0.05)',
    '0px 88px 176px rgba(0, 0, 0, 0.05)',
    '0px 92px 184px rgba(0, 0, 0, 0.05)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          '&.MuiButton-containedPrimary': {
            background: 'linear-gradient(135deg, #ffaf06 0%, #ffc046 100%)',
          },
          '&.MuiButton-containedSecondary': {
            background: 'linear-gradient(135deg, #14bb87 0%, #4dcca3 100%)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0px 16px 40px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

// Apply responsive font sizes
theme = responsiveFontSizes(theme);

export default theme;
