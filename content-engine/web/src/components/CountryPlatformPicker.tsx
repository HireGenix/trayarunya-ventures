'use client';

import {
  Autocomplete,
  Box,
  Chip,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { BRAND } from '@/theme/theme';

export const COUNTRIES: string[] = [
  '🌍 Global',
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'United Arab Emirates',
  'Saudi Arabia',
  'Singapore',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Brazil',
  'Mexico',
  'Japan',
  'South Korea',
  'Indonesia',
  'Philippines',
  'Nigeria',
  'South Africa',
  'New Zealand',
  'Ireland',
  'Sweden',
];

type PlatformKey =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'linkedin'
  | 'x'
  | 'facebook'
  | 'threads'
  | 'snapchat'
  | 'reddit'
  | 'pinterest';

export const PLATFORMS: { key: PlatformKey; label: string; tier: 'full' | 'partial' | 'limited' }[] = [
  { key: 'instagram', label: 'Instagram', tier: 'full' },
  { key: 'youtube', label: 'YouTube', tier: 'partial' },
  { key: 'tiktok', label: 'TikTok', tier: 'partial' },
  { key: 'linkedin', label: 'LinkedIn', tier: 'limited' },
  { key: 'x', label: 'X / Twitter', tier: 'limited' },
  { key: 'facebook', label: 'Facebook', tier: 'limited' },
  { key: 'threads', label: 'Threads', tier: 'limited' },
  { key: 'snapchat', label: 'Snapchat', tier: 'limited' },
  { key: 'reddit', label: 'Reddit', tier: 'limited' },
  { key: 'pinterest', label: 'Pinterest', tier: 'limited' },
];

const TIER_META: Record<string, { dot: string; note: string }> = {
  full: { dot: BRAND.teal, note: 'Full live numbers' },
  partial: { dot: BRAND.amber, note: 'Partial public data' },
  limited: { dot: '#9AA4B2', note: 'Limited — needs official API' },
};

export default function CountryPlatformPicker({
  countries,
  platforms,
  onCountries,
  onPlatforms,
}: {
  countries: string[];
  platforms: string[];
  onCountries: (v: string[]) => void;
  onPlatforms: (v: string[]) => void;
}) {
  const togglePlatform = (key: string) => {
    onPlatforms(
      platforms.includes(key) ? platforms.filter((p) => p !== key) : [...platforms, key],
    );
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.8 }}>
          <PublicRoundedIcon sx={{ fontSize: 17, color: BRAND.tealDeep }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Target markets</Typography>
        </Stack>
        <Autocomplete
          multiple
          size="small"
          options={COUNTRIES}
          value={countries}
          onChange={(_, v) => onCountries(v)}
          filterSelectedOptions
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...rest } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  {...rest}
                  label={option}
                  size="small"
                  sx={{ fontWeight: 600, bgcolor: 'rgba(20,187,135,0.12)', color: BRAND.tealDeep }}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={countries.length ? '' : 'Add countries — or pick 🌍 Global'}
            />
          )}
        />
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
          We discover the top competitors in each market you choose.
        </Typography>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.8 }}>Audit platforms</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.8 }}>
          {PLATFORMS.map((p) => {
            const active = platforms.includes(p.key);
            const meta = TIER_META[p.tier];
            return (
              <Tooltip key={p.key} title={meta.note} arrow>
                <Chip
                  label={p.label}
                  size="small"
                  onClick={() => togglePlatform(p.key)}
                  icon={
                    active ? (
                      <CheckRoundedIcon sx={{ fontSize: 14, color: '#fff !important' }} />
                    ) : (
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, ml: 1 }} />
                    )
                  }
                  sx={{
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: active ? '#062019' : 'text.primary',
                    background: active ? BRAND.gradient : 'transparent',
                    border: active ? 'none' : '1px solid',
                    borderColor: 'divider',
                    '&:hover': { background: active ? BRAND.gradient : 'action.hover' },
                  }}
                />
              </Tooltip>
            );
          })}
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ mt: 0.8, flexWrap: 'wrap' }}>
          {Object.entries(TIER_META).map(([tier, m]) => (
            <Stack key={tier} direction="row" spacing={0.4} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: m.dot }} />
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{m.note}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
