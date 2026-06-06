'use client';

/**
 * Premium dialog primitives for the marketing dashboard.
 *
 * A small, dependency-free toolkit that turns the flat TextField-stack dialogs
 * into best-in-class panels: a gradient accent bar, a soft-tinted icon-chip hero
 * header with a close affordance, sectioned bodies, an AI-assist panel and a
 * sticky hairline footer. Brand colours only, no emojis.
 *
 * Usage:
 *   <PremiumDialog open={open} onClose={close} maxWidth="md">
 *     <DialogHero icon={<EmailIcon />} title="New campaign"
 *                 subtitle="Draft, preview and send in minutes" onClose={close} />
 *     <DialogBody>
 *       <SectionLabel>Details</SectionLabel>
 *       <FieldGrid> ...TextFields... </FieldGrid>
 *       <AiAssist brief={brief} setBrief={setBrief} loading={drafting} onGenerate={aiDraft} />
 *     </DialogBody>
 *     <DialogFooter>
 *       <Button sx={ghostPillSx} onClick={close}>Cancel</Button>
 *       <Button sx={inkPillSx} onClick={save}>Create</Button>
 *     </DialogFooter>
 *   </PremiumDialog>
 */

import type { ReactNode } from 'react';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Dialog,
  Button,
  CircularProgress,
  TextField,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.08)';
const DIALOG_RADIUS = 26;

/** Solid ink pill — primary action. Overrides the theme gradient on contained buttons. */
export const inkPillSx = {
  borderRadius: '999px',
  textTransform: 'none' as const,
  fontWeight: 700,
  px: 2.6,
  py: 0.9,
  color: '#fff',
  background: INK,
  backgroundImage: 'none',
  boxShadow: 'none',
  '&:hover': { background: '#000', backgroundImage: 'none', boxShadow: 'none' },
  '&.Mui-disabled': { background: 'rgba(14,17,22,0.35)', color: '#fff' },
};

/** Ghost pill — secondary / cancel action. */
export const ghostPillSx = {
  borderRadius: '999px',
  textTransform: 'none' as const,
  fontWeight: 700,
  px: 2.2,
  py: 0.9,
  color: SUBTLE,
  background: 'transparent',
  '&:hover': { background: 'rgba(14,17,22,0.05)' },
};

/** Soft tinted pill — used for the AI-assist trigger and tertiary actions. */
export const softPillSx = {
  borderRadius: '999px',
  textTransform: 'none' as const,
  fontWeight: 700,
  px: 2.2,
  py: 0.9,
  color: BRAND.tealDeep,
  background: '#fff',
  border: `1px solid ${LINE}`,
  '&:hover': { background: BRAND.tealSoft, borderColor: '#BFEBDC' },
};

export function PremiumDialog({
  open,
  onClose,
  children,
  maxWidth = 'sm',
  accent = BRAND.gradient,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Accent bar gradient/colour at the very top of the panel. */
  accent?: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: `${DIALOG_RADIUS}px` },
          m: { xs: 0, sm: 2 },
          height: { xs: '100%', sm: 'auto' },
          maxHeight: { xs: '100%', sm: '92vh' },
          overflow: 'hidden',
          border: `1px solid ${LINE}`,
          boxShadow:
            '0 1px 2px rgba(14,17,22,0.05), 0 24px 70px -20px rgba(14,17,22,0.35)',
        },
      }}
      sx={{ '& .MuiBackdrop-root': { backgroundColor: 'rgba(14,17,22,0.42)', backdropFilter: 'blur(3px)' } }}
    >
      <Box sx={{ height: 4, background: accent, flexShrink: 0 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>{children}</Box>
    </Dialog>
  );
}

export function DialogHero({
  icon,
  title,
  subtitle,
  onClose,
  tint = BRAND.amber,
  tintSoft = BRAND.amberSoft,
  right,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose?: () => void;
  /** Icon-chip foreground colour. */
  tint?: string;
  /** Icon-chip background colour. */
  tintSoft?: string;
  /** Optional element rendered at the right (e.g. a stepper or toggle). */
  right?: ReactNode;
}) {
  return (
    <Box sx={{ px: { xs: 2.5, sm: 3.25 }, pt: { xs: 2.5, sm: 3 }, pb: 2, borderBottom: `1px solid ${LINE}` }}>
      <Stack direction="row" alignItems="flex-start" gap={1.75}>
        {icon && (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '14px',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              background: tintSoft,
              color: tint,
              '& svg': { fontSize: 23 },
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, sm: 20 }, letterSpacing: '-0.02em', color: INK, lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ mt: 0.4, fontSize: 13.5, color: SUBTLE, lineHeight: 1.5 }}>{subtitle}</Typography>
          )}
        </Box>
        {right}
        {onClose && (
          <IconButton onClick={onClose} size="small" sx={{ color: SUBTLE, mt: -0.5, mr: -0.5, '&:hover': { background: 'rgba(14,17,22,0.05)' } }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
    </Box>
  );
}

export function DialogBody({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        px: { xs: 2.5, sm: 3.25 },
        py: 2.75,
        overflowY: 'auto',
        flex: 1,
        minHeight: 0,
        '&::-webkit-scrollbar': { width: 8 },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(14,17,22,0.16)', borderRadius: 8 },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function SectionLabel({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <Typography
      sx={{
        fontWeight: 800,
        fontSize: 11.5,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: SUBTLE,
        mb: 1.25,
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

/** Responsive 2-column field grid (collapses to 1 col on xs). */
export function FieldGrid({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.75,
        gridTemplateColumns: { xs: '1fr', sm: columns === 2 ? '1fr 1fr' : '1fr' },
      }}
    >
      {children}
    </Box>
  );
}

/** Makes a child span the full grid width inside <FieldGrid columns={2}>. */
export function FullSpan({ children }: { children: ReactNode }) {
  return <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>{children}</Box>;
}

export function DialogFooter({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <Box
      sx={{
        px: { xs: 2.5, sm: 3.25 },
        py: 2,
        borderTop: `1px solid ${LINE}`,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(6px)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {hint && <Box sx={{ flex: 1, fontSize: 12.5, color: SUBTLE, minWidth: 0 }}>{hint}</Box>}
      <Stack direction="row" gap={1} sx={{ ml: hint ? 0 : 'auto' }}>
        {children}
      </Stack>
    </Box>
  );
}

/**
 * AI-assist panel: a soft teal-tinted card with a brief textarea and a
 * "Generate with AI" button. The signature agentic touch reused everywhere.
 */
export function AiAssist({
  brief,
  setBrief,
  loading,
  onGenerate,
  label = 'Describe what you want and let AI draft it',
  placeholder = 'e.g. Announce our spring launch to engaged subscribers in a warm, confident tone',
  buttonText = 'Generate with AI',
  minRows = 2,
  disabled,
}: {
  brief: string;
  setBrief: (v: string) => void;
  loading?: boolean;
  onGenerate: () => void;
  label?: string;
  placeholder?: string;
  buttonText?: string;
  minRows?: number;
  disabled?: boolean;
}) {
  return (
    <Box
      sx={{
        borderRadius: '18px',
        p: 2,
        background: 'linear-gradient(135deg, rgba(20,187,135,0.08) 0%, rgba(255,175,6,0.07) 100%)',
        border: '1px solid rgba(20,187,135,0.18)',
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 1 }}>
        <AutoAwesomeRoundedIcon sx={{ fontSize: 17, color: BRAND.tealDeep }} />
        <Typography sx={{ fontWeight: 800, fontSize: 13, color: INK }}>AI assistant</Typography>
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: SUBTLE, mb: 1.25 }}>{label}</Typography>
      <TextField
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder={placeholder}
        multiline
        minRows={minRows}
        fullWidth
        size="small"
        sx={{ background: '#fff', borderRadius: '12px', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
      />
      <Button
        onClick={onGenerate}
        disabled={loading || disabled || !brief.trim()}
        startIcon={loading ? <CircularProgress size={15} color="inherit" /> : <AutoAwesomeRoundedIcon />}
        sx={{
          mt: 1.25,
          borderRadius: '999px',
          textTransform: 'none',
          fontWeight: 700,
          px: 2.2,
          color: '#fff',
          background: BRAND.gradient,
          boxShadow: 'none',
          '&:hover': { background: BRAND.gradient, opacity: 0.94, boxShadow: 'none' },
          '&.Mui-disabled': { background: 'rgba(14,17,22,0.18)', color: '#fff' },
        }}
      >
        {loading ? 'Generating…' : buttonText}
      </Button>
    </Box>
  );
}
