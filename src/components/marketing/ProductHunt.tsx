'use client';

import { useEffect, useState } from 'react';
import { Box, Chip, Collapse, IconButton, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import { DAY } from './primitives';

/** Product Hunt launch details — MarketiQ Ai goes live Jun 30, 2026. */
export const PRODUCT_HUNT = {
  name: 'MarketiQ Ai',
  tagline: 'Your Marketing Automation Co-Pilot',
  launchDate: 'June 30, 2026',
  badgeUrl:
    'https://www.producthunt.com/products/marketiq-ai?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-marketiq-ai',
  embedUrl:
    'https://www.producthunt.com/products/marketiq-ai?embed=true&utm_source=embed&utm_medium=post_embed',
  badgeImg:
    'https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1169677&theme=light&t=1781217252084',
  logoImg:
    'https://ph-files.imgix.net/5f0567bb-dd78-4bb9-93a9-d48fc410b192.jpeg?auto=compress,format&codec=mozjpeg&cs=strip&fit=crop&h=80&w=80',
} as const;

const PH_ORANGE = '#FF6154';
const DISMISS_KEY = 'mq-ph-launch-banner-dismissed';

/** Official Product Hunt "Featured" badge. */
export function ProductHuntBadge({ width = 250 }: { width?: number }) {
  const height = Math.round((width / 250) * 54);
  return (
    <Box
      component="a"
      href={PRODUCT_HUNT.badgeUrl}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        display: 'inline-block',
        lineHeight: 0,
        borderRadius: '10px',
        transition: 'transform .25s ease, box-shadow .25s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 28px -14px rgba(255,97,84,0.5)' },
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`${PRODUCT_HUNT.name} - ${PRODUCT_HUNT.tagline} | Product Hunt`}
        width={width}
        height={height}
        src={PRODUCT_HUNT.badgeImg}
        style={{ display: 'block', width, height }}
        loading="lazy"
      />
    </Box>
  );
}

/**
 * Dismissible launch announcement strip pinned above the nav.
 * Collapses once the user scrolls (the nav turns into its floating pill) or dismisses it.
 */
export function LaunchBanner({ collapsed = false }: { collapsed?: boolean }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  const dismiss = () => {
    setDismissed(true);
    window.localStorage.setItem(DISMISS_KEY, '1');
  };

  return (
    <Collapse in={!dismissed && !collapsed}>
      <Box
        sx={{
          position: 'relative',
          background: `linear-gradient(90deg, ${PH_ORANGE} 0%, #FF7A45 100%)`,
          color: '#FFFFFF',
          px: { xs: 1.5, md: 3 },
          py: 0.9,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="center"
          component="a"
          href={PRODUCT_HUNT.embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ textDecoration: 'none', color: 'inherit', pr: 4, '&:hover u': { textDecorationThickness: '2px' } }}
        >
          <RocketLaunchRoundedIcon sx={{ fontSize: 16 }} />
          <Typography sx={{ fontSize: { xs: 12.5, md: 13.5 }, fontWeight: 700, letterSpacing: '0.01em', textAlign: 'center' }}>
            We&apos;re launching on Product Hunt on {PRODUCT_HUNT.launchDate} —{' '}
            <Box component="u" sx={{ textUnderlineOffset: 3 }}>
              follow &amp; support us →
            </Box>
          </Typography>
        </Stack>
        <IconButton
          aria-label="Dismiss announcement"
          onClick={dismiss}
          size="small"
          sx={{
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.85)',
            '&:hover': { color: '#FFF', background: 'rgba(255,255,255,0.14)' },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Collapse>
  );
}

/** Product Hunt launch card — embed announcing the Jun 30, 2026 launch. */
export function ProductHuntLaunchCard() {
  return (
    <Box
      sx={{
        border: `1px solid ${DAY.line}`,
        borderRadius: '12px',
        p: 2.5,
        maxWidth: 500,
        mx: 'auto',
        background: '#FFFFFF',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        textAlign: 'left',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={PRODUCT_HUNT.name}
          src={PRODUCT_HUNT.logoImg}
          width={64}
          height={64}
          style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
          loading="lazy"
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography component="h3" sx={{ m: 0, fontSize: 18, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.3 }}>
              {PRODUCT_HUNT.name}
            </Typography>
            <Chip
              icon={<RocketLaunchRoundedIcon sx={{ fontSize: 13 }} />}
              label={`Launching ${PRODUCT_HUNT.launchDate}`}
              size="small"
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 700,
                color: PH_ORANGE,
                background: 'rgba(255,97,84,0.1)',
                '& .MuiChip-icon': { color: PH_ORANGE },
              }}
            />
          </Stack>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#666666', lineHeight: 1.4 }}>
            {PRODUCT_HUNT.tagline}
          </Typography>
        </Box>
      </Stack>
      <Box
        component="a"
        href={PRODUCT_HUNT.embedUrl}
        target="_blank"
        rel="noopener"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          mt: 1.5,
          px: 2,
          py: 1,
          background: PH_ORANGE,
          color: '#FFFFFF',
          textDecoration: 'none',
          borderRadius: '8px',
          fontSize: 14,
          fontWeight: 600,
          transition: 'filter .2s ease, transform .2s ease',
          '&:hover': { filter: 'brightness(1.06)', transform: 'translateY(-1px)' },
        }}
      >
        Check it out on Product Hunt →
      </Box>
    </Box>
  );
}
