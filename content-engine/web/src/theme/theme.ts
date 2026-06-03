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
  shape: { borderRadius: 12 },
  components: {
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
          borderRadius: 16,
          boxShadow: '0px 8px 24px rgba(14, 23, 38, 0.06)',
          transition: 'all 0.3s ease',
          '&:hover': { boxShadow: '0px 16px 40px rgba(14, 23, 38, 0.10)' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } } },
    },
  },
});

theme = responsiveFontSizes(theme);

export default theme;
