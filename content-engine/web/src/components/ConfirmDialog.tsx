'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

export type ConfirmOptions = {
  title?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** `true` (default) renders a red, destructive confirm button. */
  danger?: boolean;
};

type InternalState = ConfirmOptions & { open: boolean };

const ConfirmContext = createContext<((opts?: ConfirmOptions) => Promise<boolean>) | null>(null);

/**
 * Provides a promise-based confirmation dialog to the whole subtree.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Delete X?', message: '...' })) { ... }
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InternalState>({ open: false });
  const [busy, setBusy] = useState(false);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts?: ConfirmOptions) => {
    setBusy(false);
    setState({ open: true, danger: true, ...opts });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setState((s) => ({ ...s, open: false }));
  }, []);

  const danger = state.danger !== false;

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={state.open}
        onClose={() => !busy && close(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 0.5 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: danger ? 'error.light' : 'warning.light',
                color: danger ? 'error.main' : 'warning.main',
              }}
            >
              {danger ? <DeleteOutlineRoundedIcon /> : <WarningAmberRoundedIcon />}
            </Box>
            <Box sx={{ fontWeight: 800, fontSize: 18 }}>{state.title || 'Are you sure?'}</Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary' }}>
            {state.message || 'This action cannot be undone.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={() => close(false)} color="inherit" disabled={busy}>
            {state.cancelText || 'Cancel'}
          </Button>
          <Button
            onClick={() => close(true)}
            variant="contained"
            color={danger ? 'error' : 'primary'}
            autoFocus
            disableElevation
          >
            {state.confirmText || (danger ? 'Delete' : 'Confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a <ConfirmProvider>');
  }
  return ctx;
}
