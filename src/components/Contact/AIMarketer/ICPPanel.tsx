'use client';

import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import PublicIcon from '@mui/icons-material/Public';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckIcon from '@mui/icons-material/Check';

export interface ICP {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  country?: string;
  industry?: string;
  segment?: 'B2B' | 'B2C' | 'D2C';
  company_summary?: string;
  target_customer?: string;
  pain_points?: string[];
  opportunity?: string;
  opportunity_score?: number;
}

const seg = (s?: string) => {
  switch (s) {
    case 'B2B':
      return { c: '#ffaf06', bg: 'rgba(255,175,6,0.12)', b: 'rgba(255,175,6,0.3)' };
    case 'B2C':
      return { c: '#3b82f6', bg: 'rgba(59,130,246,0.12)', b: 'rgba(59,130,246,0.3)' };
    case 'D2C':
      return { c: '#14bb87', bg: 'rgba(20,187,135,0.12)', b: 'rgba(20,187,135,0.3)' };
    default:
      return { c: '#94a3b8', bg: 'rgba(15,23,42,0.05)', b: 'rgba(15,23,42,0.1)' };
  }
};

function Row({ label, value }: { label: string; value?: string }) {
  const filled = Boolean(value?.trim());
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, py: 0.35 }}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', minWidth: 62 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.84rem',
          color: filled ? '#0f1320' : '#cbd5e1',
          fontWeight: filled ? 600 : 400,
          wordBreak: 'break-word',
        }}
      >
        {value?.trim() || '—'}
      </Typography>
    </Box>
  );
}

function Section({
  icon,
  title,
  filled,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  filled: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.4 }}>
        <Box sx={{ color: filled ? '#14bb87' : '#cbd5e1', display: 'grid', placeItems: 'center' }}>
          {filled ? <CheckIcon sx={{ fontSize: 15 }} /> : icon}
        </Box>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: 0.5, color: '#475569' }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ pl: 2.6 }}>{children}</Box>
    </Box>
  );
}

export default function ICPPanel({ icp }: { icp: ICP }) {
  const score = Math.max(0, Math.min(100, Math.round(icp.opportunity_score ?? 0)));
  const sc = seg(icp.segment);

  const scoreColor = score >= 70 ? '#14bb87' : score >= 40 ? '#ffaf06' : '#94a3b8';
  const hasContact = Boolean(icp.name || icp.email || icp.phone);
  const hasCompany = Boolean(icp.company || icp.company_summary || icp.industry);
  const hasMarket = Boolean(icp.segment || icp.target_customer || icp.country);
  const pains = useMemo(() => (icp.pain_points || []).filter(Boolean), [icp.pain_points]);

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 2.2,
        background: '#ffffff',
        border: '1px solid rgba(15,23,42,0.08)',
        boxShadow: '0 4px 18px rgba(15,23,42,0.05)',
      }}
    >
      {/* Header + score */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.6 }}>
        <Box>
          <Typography sx={{ fontSize: '0.66rem', fontWeight: 900, letterSpacing: 1, color: '#ffaf06' }}>
            LIVE ICP
          </Typography>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f1320' }}>
            Ideal Customer Profile
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Box
            component={motion.div}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: `conic-gradient(${scoreColor} ${score * 3.6}deg, rgba(15,23,42,0.06) 0deg)`,
            }}
          >
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: '#fff',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color: scoreColor }}>
                {score}
              </Typography>
            </Box>
          </Box>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', mt: 0.3 }}>
            FIT SCORE
          </Typography>
        </Box>
      </Box>

      {/* Segment badge */}
      <Box sx={{ mb: 1.6 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 1.3,
            py: 0.4,
            borderRadius: 99,
            fontSize: '0.72rem',
            fontWeight: 800,
            color: sc.c,
            background: sc.bg,
            border: `1px solid ${sc.b}`,
          }}
        >
          {icp.segment || 'Segment TBD'}
        </Box>
      </Box>

      <Section icon={<PersonIcon sx={{ fontSize: 15 }} />} title="CONTACT" filled={hasContact}>
        <Row label="Name" value={icp.name} />
        <Row label="Email" value={icp.email} />
        <Row label="Phone" value={icp.phone} />
        <Row label="Country" value={icp.country} />
      </Section>

      <Section icon={<BusinessIcon sx={{ fontSize: 15 }} />} title="COMPANY" filled={hasCompany}>
        <Row label="Company" value={icp.company} />
        <Row label="Industry" value={icp.industry} />
        {icp.company_summary && (
          <Typography sx={{ fontSize: '0.82rem', color: '#475569', mt: 0.4, lineHeight: 1.45 }}>
            {icp.company_summary}
          </Typography>
        )}
      </Section>

      <Section icon={<PublicIcon sx={{ fontSize: 15 }} />} title="MARKET" filled={hasMarket}>
        <Row label="Sells to" value={icp.target_customer} />
      </Section>

      <Section icon={<ReportProblemIcon sx={{ fontSize: 15 }} />} title="CHALLENGES" filled={pains.length > 0}>
        {pains.length === 0 ? (
          <Typography sx={{ fontSize: '0.84rem', color: '#cbd5e1' }}>—</Typography>
        ) : (
          <AnimatePresence>
            {pains.map((p) => (
              <Box
                key={p}
                component={motion.div}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                sx={{ display: 'flex', gap: 0.6, alignItems: 'flex-start', py: 0.2 }}
              >
                <Box sx={{ color: '#e35a72', fontSize: '0.84rem', lineHeight: 1.4 }}>•</Box>
                <Typography sx={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.4 }}>{p}</Typography>
              </Box>
            ))}
          </AnimatePresence>
        )}
      </Section>

      {icp.opportunity && (
        <Section icon={<TrendingUpIcon sx={{ fontSize: 15 }} />} title="OPPORTUNITY" filled>
          <Typography sx={{ fontSize: '0.82rem', color: '#0f7a57', fontWeight: 600, lineHeight: 1.45 }}>
            {icp.opportunity}
          </Typography>
        </Section>
      )}
    </Box>
  );
}
