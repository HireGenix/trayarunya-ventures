'use client';

import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { Poppins } from 'next/font/google';

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

// Trayarunya brand theme — shared with the main marketing site.
let theme = createTheme({
  palette: {
    primary: { main: '#ffaf06', light: '#ffc046', dark: '#d99000', contrastText: '#000000' },
    secondary: { main: '#14bb87', light: '#4dcca3', dark: '#0e8a63', contrastText: '#FFFFFF' },
    error: { main: '#d92c4a', light: '#e35a72', dark: '#b01e38', contrastText: '#FFFFFF' },
    warning: { main: '#ffaf06', light: '#ffc046', dark: '#d99000', contrastText: '#000000' },
    info: { main: '#14bb87', light: '#4dcca3', dark: '#0e8a63', contrastText: '#FFFFFF' },
    success: { main: '#14bb87', light: '#4dcca3', dark: '#0e8a63', contrastText: '#FFFFFF' },
    text: { primary: '#0E1726', secondary: '#475467', disabled: '#98A2B3' },
    background: { default: '#F7F8FA', paper: '#FFFFFF' },
    divider: 'rgba(14, 23, 38, 0.08)',
  },
  typography: {
    fontFamily: poppins.style.fontFamily,
    h1: { fontWeight: 800, fontSize: '3.5rem', lineHeight: 1.15 },
    h2: { fontWeight: 800, fontSize: '2.75rem', lineHeight: 1.2 },
    h3: { fontWeight: 700, fontSize: '2.1rem', lineHeight: 1.25 },
    h4: { fontWeight: 700, fontSize: '1.6rem', lineHeight: 1.35 },
    h5: { fontWeight: 600, fontSize: '1.3rem', lineHeight: 1.4 },
    h6: { fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.5 },
    subtitle1: { fontSize: '1.05rem', lineHeight: 1.6, fontWeight: 500 },
    button: { fontWeight: 600, fontSize: '0.9rem', textTransform: 'none' },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minHeight: '100vh',
          background:
            'radial-gradient(1200px 600px at 10% -10%, rgba(255,175,6,0.14), transparent 60%),' +
            'radial-gradient(1000px 600px at 110% 10%, rgba(20,187,135,0.14), transparent 55%),' +
            'linear-gradient(180deg, #F4F6FB 0%, #EEF1F8 100%)',
          backgroundAttachment: 'fixed',
        },
        '::-webkit-scrollbar': { width: 10, height: 10 },
        '::-webkit-scrollbar-thumb': {
          background: 'rgba(14,23,38,0.18)',
          borderRadius: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 22px',
          transition: 'all 0.25s ease',
          '&:hover': { transform: 'translateY(-2px)' },
        },
        contained: {
          '&.MuiButton-containedPrimary': {
            background: 'linear-gradient(135deg, #ffaf06 0%, #ffc046 100%)',
          },
          '&.MuiButton-containedSecondary': {
            background: 'linear-gradient(135deg, #14bb87 0%, #4dcca3 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0px 10px 30px rgba(14, 23, 38, 0.08)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0px 20px 48px rgba(14, 23, 38, 0.14)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: {
          borderRadius: 16,
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.55)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(8px)',
          },
        },
      },
    },
  },
});

theme = responsiveFontSizes(theme);

export default theme;
