'use client';

import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { Inter } from 'next/font/google';

const inter = Inter({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

// Trayarunya Content Engine — on-brand light theme.
// Pulls the signature identity from the marketing site: amber → teal gradient,
// pink accent, deep ink text. Clean & airy, but colourful and creative.
export const BRAND = {
  amber: '#FFAF06',
  amberDeep: '#E89200',
  amberSoft: '#FFF6E0',
  teal: '#14BB87',
  tealDeep: '#0FA874',
  tealSoft: '#E4F8F0',
  pink: '#D92C4A',
  pinkSoft: '#FDE8EC',
  ink: '#0E1116',
  gradient: 'linear-gradient(135deg, #FFAF06 0%, #14BB87 100%)',
  gradientWarm: 'linear-gradient(135deg, #FFAF06 0%, #FF7A59 100%)',
  gradientText: 'linear-gradient(90deg, #FFAF06 0%, #14BB87 100%)',
};

const INK = BRAND.ink;
const SUBTLE = '#5A6472';
const FAINT = '#9AA4B2';
const LINE = '#EAECEF';
const LINE_SOFT = '#F3F4F6';
const CANVAS = '#FAFBFC';

let theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: BRAND.amberDeep, light: BRAND.amber, dark: '#C77F00', contrastText: '#FFFFFF' },
    secondary: { main: BRAND.tealDeep, light: BRAND.teal, dark: '#0C8A5F', contrastText: '#FFFFFF' },
    error: { main: BRAND.pink, light: '#E35A72', dark: '#B91C1C', contrastText: '#FFFFFF' },
    warning: { main: BRAND.amberDeep, light: BRAND.amber, dark: '#B87400', contrastText: '#FFFFFF' },
    info: { main: '#2563EB', light: '#3B82F6', dark: '#1D4ED8', contrastText: '#FFFFFF' },
    success: { main: BRAND.tealDeep, light: BRAND.teal, dark: '#0C8A5F', contrastText: '#FFFFFF' },
    text: { primary: INK, secondary: SUBTLE, disabled: FAINT },
    background: { default: CANVAS, paper: '#FFFFFF' },
    divider: LINE,
  },
  typography: {
    fontFamily: inter.style.fontFamily,
    h1: { fontWeight: 800, fontSize: '2.6rem', lineHeight: 1.15, letterSpacing: '-0.025em' },
    h2: { fontWeight: 800, fontSize: '2.1rem', lineHeight: 1.2, letterSpacing: '-0.025em' },
    h3: { fontWeight: 800, fontSize: '1.7rem', lineHeight: 1.25, letterSpacing: '-0.02em' },
    h4: { fontWeight: 800, fontSize: '1.35rem', lineHeight: 1.3, letterSpacing: '-0.015em' },
    h5: { fontWeight: 700, fontSize: '1.12rem', lineHeight: 1.4, letterSpacing: '-0.01em' },
    h6: { fontWeight: 700, fontSize: '1rem', lineHeight: 1.5 },
    subtitle1: { fontSize: '1rem', lineHeight: 1.6, fontWeight: 500 },
    subtitle2: { fontSize: '0.875rem', lineHeight: 1.5, fontWeight: 600 },
    body1: { fontSize: '0.95rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.55 },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
    button: { fontWeight: 600, fontSize: '0.875rem', textTransform: 'none', letterSpacing: 0 },
    overline: { fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.09em', lineHeight: 1.6 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minHeight: '100vh',
          color: INK,
          background: CANVAS,
          backgroundImage:
            'radial-gradient(1100px 520px at 100% -8%, rgba(20,187,135,0.07), transparent 60%), radial-gradient(1000px 480px at -6% 0%, rgba(255,175,6,0.09), transparent 58%)',
          backgroundAttachment: 'fixed',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '::selection': { background: BRAND.amberSoft },
        '::-webkit-scrollbar': { width: 11, height: 11 },
        '::-webkit-scrollbar-thumb': {
          background: '#D7DBE0',
          borderRadius: 8,
          border: '3px solid transparent',
          backgroundClip: 'content-box',
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: '#C2C7CF',
          backgroundClip: 'content-box',
        },
      },
    },
    MuiAppBar: { defaultProps: { elevation: 0 } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 18px',
          boxShadow: 'none',
          transition: 'transform 0.15s ease, box-shadow 0.18s ease, background-color 0.15s ease, border-color 0.15s ease',
          '&:hover': { boxShadow: 'none' },
        },
        sizeSmall: { padding: '5px 13px', fontSize: '0.82rem' },
        sizeLarge: { padding: '11px 24px', fontSize: '0.95rem' },
        containedPrimary: {
          background: BRAND.gradient,
          color: '#FFFFFF',
          boxShadow: '0 6px 18px rgba(20,187,135,0.22), 0 2px 6px rgba(255,175,6,0.18)',
          '&:hover': {
            background: BRAND.gradient,
            boxShadow: '0 10px 26px rgba(20,187,135,0.30), 0 4px 10px rgba(255,175,6,0.24)',
            transform: 'translateY(-1px)',
          },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, ${BRAND.teal} 0%, ${BRAND.tealDeep} 100%)`,
          '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 8px 20px rgba(20,187,135,0.28)' },
        },
        outlined: {
          borderColor: LINE,
          color: INK,
          background: '#FFFFFF',
          '&:hover': { borderColor: BRAND.amber, background: BRAND.amberSoft, color: BRAND.amberDeep },
        },
        text: {
          color: SUBTLE,
          '&:hover': { background: LINE_SOFT, color: INK },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: '#FFFFFF',
          border: `1px solid ${LINE}`,
          boxShadow: '0 1px 2px rgba(14,17,22,0.04)',
          transition: 'transform 0.18s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow: '0 14px 34px rgba(14,17,22,0.09)',
            borderColor: '#DDE0E5',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: {
          borderRadius: 14,
          background: '#FFFFFF',
          border: `1px solid ${LINE}`,
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            background: '#FFFFFF',
            '& fieldset': { borderColor: LINE },
            '&:hover fieldset': { borderColor: '#CFD4DA' },
            '&.Mui-focused fieldset': { borderColor: BRAND.amber, borderWidth: 2 },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          background: '#FFFFFF',
          '& fieldset': { borderColor: LINE },
          '&:hover fieldset': { borderColor: '#CFD4DA' },
          '&.Mui-focused fieldset': { borderColor: BRAND.amber, borderWidth: 2 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.74rem',
          height: 24,
          background: LINE_SOFT,
          border: `1px solid ${LINE}`,
          color: SUBTLE,
        },
        outlined: { background: '#FFFFFF' },
        colorPrimary: { background: BRAND.amberSoft, border: `1px solid #FFE2A6`, color: BRAND.amberDeep },
        colorSecondary: { background: BRAND.tealSoft, border: `1px solid #BFEBDC`, color: BRAND.tealDeep },
        label: { paddingLeft: 9, paddingRight: 9 },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: LINE } } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: INK,
          fontSize: '0.74rem',
          fontWeight: 500,
          borderRadius: 8,
          padding: '6px 10px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: `1px solid ${LINE}`,
          boxShadow: '0 30px 70px rgba(14,17,22,0.16)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&.Mui-selected': {
            background: BRAND.amberSoft,
            '&:hover': { background: '#FFEFC9' },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 99, background: LINE_SOFT, height: 7 },
        bar: { borderRadius: 99, background: BRAND.gradient },
      },
    },
  },
});

theme = responsiveFontSizes(theme);

export default theme;
