'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  CircularProgress,
  Fade,
  IconButton,
  Tooltip,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import { subscribe, cancelAITask, dismissAITask, type AITask } from '@/lib/aiProgress';
import { BRAND } from '@/theme/theme';

function accentFor(task: AITask): string {
  if (task.status === 'error') return '#D92C4A';
  if (task.status === 'success') return '#16A34A';
  if (task.stalled) return '#F59E0B';
  return BRAND.teal || '#0EA5A5';
}

// Fixed, app-wide AI activity indicator. Sits at the bottom-centre and surfaces a
// live progress bar with the current phase label for any in-flight AI generation,
// on every page. Users can minimise it to a small pill, and stop/dismiss any task
// (including ones that get stuck) so nothing is left running with no way out.
export default function GlobalAIProgress() {
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => subscribe(setTasks), []);

  if (tasks.length === 0) return null;

  const primary = tasks[0];
  const running = tasks.filter((t) => t.status === 'running').length;
  const others = tasks.length - 1;
  const accent = accentFor(primary);

  // A task can be stopped (cancel underlying work) while it's running; finished or
  // errored tasks can only be dismissed from view.
  const stopTask = (t: AITask) => {
    if (t.status === 'running') cancelAITask(t.id);
    else dismissAITask(t.id);
  };

  if (minimized) {
    return (
      <Box
        sx={{
          position: 'fixed',
          right: { xs: 12, md: 20 },
          bottom: { xs: 12, md: 20 },
          zIndex: 2000,
          pointerEvents: 'none',
        }}
      >
        <Fade in appear timeout={180}>
          <Box
            onClick={() => setMinimized(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setMinimized(false);
            }}
            sx={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: '#0E1116',
              color: '#fff',
              borderRadius: 999,
              pl: 1.25,
              pr: 1.5,
              py: 0.75,
              boxShadow: '0 12px 32px rgba(0,0,0,0.34)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            title="Show AI activity"
          >
            {primary.status === 'running' ? (
              <CircularProgress size={15} thickness={5} sx={{ color: accent }} />
            ) : primary.status === 'success' ? (
              <CheckCircleRoundedIcon sx={{ fontSize: 17, color: accent }} />
            ) : (
              <ErrorRoundedIcon sx={{ fontSize: 17, color: accent }} />
            )}
            <Typography
              sx={{ fontSize: 12, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(primary.progress)}%
            </Typography>
            {running > 1 && (
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#0E1116',
                  bgcolor: 'rgba(255,255,255,0.85)',
                  px: 0.7,
                  borderRadius: 5,
                }}
              >
                {running}
              </Typography>
            )}
            <ExpandLessRoundedIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }} />
          </Box>
        </Fade>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        display: 'flex',
        justifyContent: 'center',
        px: 2,
        pb: { xs: 1.5, md: 2.25 },
        pointerEvents: 'none',
      }}
    >
      <Fade in appear timeout={220}>
        <Box
          sx={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: 460,
            bgcolor: '#0E1116',
            color: '#fff',
            borderRadius: 3,
            px: 2,
            py: 1.5,
            boxShadow: '0 18px 48px rgba(0,0,0,0.34)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '9px',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                background:
                  primary.status === 'running' ? 'rgba(255,255,255,0.06)' : `${accent}22`,
              }}
            >
              {primary.status === 'running' ? (
                <CircularProgress size={16} thickness={5} sx={{ color: accent }} />
              ) : primary.status === 'success' ? (
                <CheckCircleRoundedIcon sx={{ fontSize: 19, color: accent }} />
              ) : (
                <ErrorRoundedIcon sx={{ fontSize: 19, color: accent }} />
              )}
            </Box>

            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <AutoAwesomeRoundedIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.2 }} noWrap>
                  {primary.title}
                </Typography>
                {others > 0 && (
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#0E1116',
                      bgcolor: 'rgba(255,255,255,0.85)',
                      px: 0.7,
                      py: 0.05,
                      borderRadius: 5,
                      ml: 0.25,
                    }}
                  >
                    +{others}
                  </Typography>
                )}
              </Box>
              <Typography
                sx={{
                  fontSize: 11.5,
                  color: primary.stalled ? '#F59E0B' : 'rgba(255,255,255,0.65)',
                  lineHeight: 1.3,
                  mt: 0.15,
                }}
                noWrap
              >
                {primary.stalled
                  ? `Taking longer than usual — ${primary.phaseLabel}`
                  : primary.phaseLabel}
              </Typography>
            </Box>

            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 800,
                color: accent,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {Math.round(primary.progress)}%
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, ml: 0.25 }}>
              <Tooltip title="Minimise">
                <IconButton
                  size="small"
                  onClick={() => setMinimized(true)}
                  sx={{ color: 'rgba(255,255,255,0.55)', p: 0.4, '&:hover': { color: '#fff' } }}
                >
                  <RemoveRoundedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={primary.status === 'running' ? 'Stop this task' : 'Dismiss'}>
                <IconButton
                  size="small"
                  onClick={() => stopTask(primary)}
                  sx={{
                    color: 'rgba(255,255,255,0.55)',
                    p: 0.4,
                    '&:hover': { color: primary.status === 'running' ? '#D92C4A' : '#fff' },
                  }}
                >
                  {primary.status === 'running' ? (
                    <StopRoundedIcon sx={{ fontSize: 17 }} />
                  ) : (
                    <CloseRoundedIcon sx={{ fontSize: 17 }} />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <LinearProgress
            variant="determinate"
            value={primary.progress}
            sx={{
              height: 6,
              borderRadius: 5,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background:
                  primary.status === 'error'
                    ? '#D92C4A'
                    : primary.status === 'success'
                      ? '#16A34A'
                      : primary.stalled
                        ? '#F59E0B'
                        : BRAND.gradient || accent,
                transition: 'transform 0.3s ease',
              },
            }}
          />

          {others > 0 && (
            <Box sx={{ mt: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {tasks.slice(1).map((t) => {
                const a = accentFor(t);
                return (
                  <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {t.status === 'running' ? (
                      <CircularProgress size={12} thickness={5} sx={{ color: a, flexShrink: 0 }} />
                    ) : t.status === 'success' ? (
                      <CheckCircleRoundedIcon sx={{ fontSize: 14, color: a, flexShrink: 0 }} />
                    ) : (
                      <ErrorRoundedIcon sx={{ fontSize: 14, color: a, flexShrink: 0 }} />
                    )}
                    <Typography
                      sx={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.2, minWidth: 0, flexGrow: 1 }}
                      noWrap
                    >
                      {t.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: a,
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                      }}
                    >
                      {Math.round(t.progress)}%
                    </Typography>
                    <Tooltip title={t.status === 'running' ? 'Stop this task' : 'Dismiss'}>
                      <IconButton
                        size="small"
                        onClick={() => stopTask(t)}
                        sx={{
                          color: 'rgba(255,255,255,0.45)',
                          p: 0.25,
                          flexShrink: 0,
                          '&:hover': { color: t.status === 'running' ? '#D92C4A' : '#fff' },
                        }}
                      >
                        {t.status === 'running' ? (
                          <StopRoundedIcon sx={{ fontSize: 15 }} />
                        ) : (
                          <CloseRoundedIcon sx={{ fontSize: 15 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Fade>
    </Box>
  );
}
