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
    // Creative accents used by the 3D agency theme
    // (hot pink #ff4d8d, violet #7c5cff) live in components/cinematic/surfaces.ts.
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
    borderRadius: 12,
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
          borderRadius: 12,
          padding: '10px 24px',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(2px)',
          },
        },
        // Tactile 3D "clay" buttons with an extruded base.
        contained: {
          boxShadow: '0 5px 0 rgba(15,23,42,0.25), 0 10px 22px rgba(15,23,42,0.12)',
          '&:hover': {
            boxShadow: '0 7px 0 rgba(15,23,42,0.25), 0 16px 30px rgba(124,92,255,0.25)',
          },
          '&:active': {
            boxShadow: '0 1px 0 rgba(15,23,42,0.25), 0 4px 10px rgba(15,23,42,0.12)',
          },
          '&.MuiButton-containedPrimary': {
            background: 'linear-gradient(135deg, #ffc046 0%, #ffaf06 55%, #ff8a3d 100%)',
            boxShadow: '0 5px 0 #b86f00, 0 12px 24px rgba(255,77,141,0.28)',
            '&:hover': { boxShadow: '0 7px 0 #b86f00, 0 18px 34px rgba(255,77,141,0.35)' },
            '&:active': { boxShadow: '0 1px 0 #b86f00, 0 4px 10px rgba(255,77,141,0.25)' },
          },
          '&.MuiButton-containedSecondary': {
            background: 'linear-gradient(135deg, #4dcca3 0%, #14bb87 100%)',
            boxShadow: '0 5px 0 #0a6e4f, 0 12px 24px rgba(20,187,135,0.28)',
            '&:hover': { boxShadow: '0 7px 0 #0a6e4f, 0 18px 34px rgba(20,187,135,0.35)' },
            '&:active': { boxShadow: '0 1px 0 #0a6e4f, 0 4px 10px rgba(20,187,135,0.25)' },
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
          borderRadius: 20,
          boxShadow: '0 2px 0 rgba(124,92,255,0.14), 0 18px 40px -12px rgba(15,23,42,0.18)',
          transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease',
          '&:hover': {
            transform: 'perspective(1000px) translateY(-8px) rotateX(4deg)',
            boxShadow: '0 6px 0 rgba(124,92,255,0.18), 0 32px 60px -14px rgba(124,92,255,0.35)',
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
