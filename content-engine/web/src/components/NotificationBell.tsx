'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import { Notifications } from '@/lib/api';
import { BRAND } from '@/theme/theme';

type Notification = {
  id: string;
  level: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

const LEVEL_COLOR: Record<string, string> = {
  info: '#2563EB',
  success: BRAND.tealDeep,
  warning: BRAND.amberDeep,
  error: BRAND.pink,
};

function levelColor(level: string): string {
  return LEVEL_COLOR[level] || '#2563EB';
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const open = Boolean(anchorEl);

  const refreshCount = useCallback(async () => {
    try {
      const res = await Notifications.unreadCount();
      setCount(res.count);
    } catch {
      /* ignore polling errors */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Notifications.list();
      setItems(res);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, 30000);
    return () => clearInterval(id);
  }, [refreshCount]);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    loadList();
  };

  const handleClose = () => setAnchorEl(null);

  const handleMarkAll = async () => {
    try {
      await Notifications.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setCount(0);
    } catch {
      /* ignore */
    }
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      try {
        await Notifications.markRead(n.id);
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
        );
        setCount((c) => Math.max(0, c - 1));
      } catch {
        /* ignore */
      }
    }
    if (n.link) {
      handleClose();
      router.push(n.link);
    }
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          size="small"
          onClick={handleOpen}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            width: 34,
            height: 34,
          }}
        >
          <Badge
            color="error"
            badgeContent={count}
            max={99}
            overlap="circular"
            sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}
          >
            <NotificationsIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 380, maxWidth: '92vw', borderRadius: 2, overflow: 'hidden' },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Notifications</Typography>
          <Button size="small" onClick={handleMarkAll} sx={{ fontSize: 12.5 }}>
            Mark all read
          </Button>
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              You&apos;re all caught up.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {items.map((n) => (
              <Box
                key={n.id}
                onClick={() => handleClick(n)}
                sx={{
                  px: 2,
                  py: 1.25,
                  cursor: n.link ? 'pointer' : 'default',
                  bgcolor: n.read ? 'transparent' : BRAND.amberSoft,
                  borderBottom: '1px solid',
                  borderColor: 'rgba(14,17,22,0.06)',
                  '&:hover': { bgcolor: n.read ? '#F6F6F7' : BRAND.amberSoft },
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  <Box
                    sx={{
                      mt: 0.6,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      bgcolor: levelColor(n.level),
                    }}
                  />
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography
                      sx={{ fontWeight: n.read ? 500 : 700, fontSize: 13.5, lineHeight: 1.35 }}
                    >
                      {n.title}
                    </Typography>
                    {n.body && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: 12.5, mt: 0.25 }}
                      >
                        {n.body}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: 11.5, mt: 0.25, display: 'block' }}
                    >
                      {relativeTime(n.created_at)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Menu>
    </>
  );
}
